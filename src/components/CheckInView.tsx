import { useState } from 'react';
import { Search, MapPin, UserCheck, Trash2, Camera } from 'lucide-react';
import { PreRegistration, Visitor, Host, Zone, Member, Driver, AccessColor } from '../types';

interface CheckInViewProps {
  preRegs: PreRegistration[];
  visitors: Visitor[];
  hosts: Host[];
  zones: Zone[];
  passPool: Record<string, string[]>;
  passTotals: Record<string, number>;
  onCheckinPreReg: (id: string, filteredMembers?: Member[]) => Promise<Visitor>;
  onWalkinCheckin: (walkinData: any) => Promise<Visitor>;
  onGrdRemoveMember: (prId: string, memberNic: string) => Promise<void>;
  showAlert?: (msg: string, title?: string) => void;
  showConfirm?: (msg: string, onConfirm: () => void, title?: string) => void;
}

export default function CheckInView({
  preRegs,
  visitors,
  hosts,
  zones,
  passPool,
  passTotals,
  onCheckinPreReg,
  onWalkinCheckin,
  onGrdRemoveMember,
  showAlert,
  showConfirm,
}: CheckInViewProps) {
  const alert = (msg: string) => {
    if (showAlert) {
      showAlert(msg);
    } else {
      window.alert(msg);
    }
  };

  const confirm = (msg: string, onYes: () => void) => {
    if (showConfirm) {
      showConfirm(msg, onYes);
    } else {
      if (window.confirm(msg)) onYes();
    }
  };
  // Pre-registration Search states
  const [searchNic, setSearchNic] = useState('');
  const [matchedPr, setMatchedPr] = useState<PreRegistration | null>(null);
  const [matchedMember, setMatchedMember] = useState<Member | null>(null);
  const [searchFeedback, setSearchFeedback] = useState('');

  // Walk-in Registration states
  const [showWalkin, setShowWalkin] = useState(false);
  const [wiName, setWiName] = useState('');
  const [wiNic, setWiNic] = useState('');
  const [wiPhone, setWiPhone] = useState('');
  const [wiHost, setWiHost] = useState('');
  const [wiPurpose, setWiPurpose] = useState('');
  const [wiCompany, setWiCompany] = useState('');
  const [wiVehicle, setWiVehicle] = useState('');
  const [wiPhotoAllowed, setWiPhotoAllowed] = useState<boolean | null>(null);
  const [wiSelectedZones, setWiSelectedZones] = useState<string[]>([]);
  const [wiDrivers, setWiDrivers] = useState<Driver[]>([]);
  const [wiNicHint, setWiNicHint] = useState<{ name: string; id: string } | null>(null);

  // Success Ticket Modal
  const [checkedInTicket, setCheckedInTicket] = useState<Visitor | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sri Lanka NIC & Passport validators
  const validateNIC = (val: string): { ok: boolean; msg: string } => {
    const v = val.trim();
    if (!v) return { ok: false, msg: 'NIC/Passport is required' };
    const snic = /^\d{9}[VXvx]$|^\d{12}$/.test(v);
    const passport = /^[A-Za-z]{1,2}\d{6,8}$/.test(v);
    if (snic || passport) return { ok: true, msg: '' };
    return { ok: false, msg: 'Valid NIC (e.g. 199012345678 or 901234567V) or passport required' };
  };

  const getHighestColor = (selectedZ: string[]): AccessColor => {
    const rank: Record<AccessColor, number> = { green: 1, yellow: 2, amber: 3, red: 4 };
    let bestColor: AccessColor = "green";
    let bestRank = 0;

    selectedZ.forEach(zname => {
      const liveZ = zones.find(z => z.name === zname);
      if (liveZ && rank[liveZ.color] > bestRank) {
        bestColor = liveZ.color;
        bestRank = rank[liveZ.color];
      }
    });
    return bestColor;
  };

  const getPassCodePrefix = (color: AccessColor): string => {
    return { green: 'G', yellow: 'Y', amber: 'A', red: 'R' }[color];
  };

  // Preview next available pass (either from recycled pool or next sequence number)
  const getPreviewPassCode = (color: AccessColor): string => {
    const pfx = getPassCodePrefix(color);
    const pool = passPool[pfx] || [];
    if (pool.length > 0) return pool[0];

    const issued = visitors
      .filter(v => v.pass && v.pass.charAt(0) === pfx)
      .map(v => parseInt(v.pass.slice(1)) || 0);
    const nextSeq = (issued.length > 0 ? Math.max(...issued) : 0) + 1;
    return pfx + String(nextSeq).padStart(2, '0');
  };

  // Guard searches NIC
  const handleGuardSearch = () => {
    const q = searchNic.trim().toLowerCase();
    if (!q) {
      setSearchFeedback('Please enter a NIC or Passport number.');
      setMatchedPr(null);
      setMatchedMember(null);
      return;
    }

    const matchedResults: { pr: PreRegistration; m: Member }[] = [];
    preRegs.forEach(pr => {
      if (pr.status !== 'pending') return;
      pr.members.forEach(m => {
        if (m.nic.toLowerCase() === q) {
          matchedResults.push({ pr, m });
        }
      });
    });

    if (!matchedResults.length) {
      setSearchFeedback('No pending pre-registration found for this NIC / Passport.');
      setMatchedPr(null);
      setMatchedMember(null);
      return;
    }

    setSearchFeedback('');
    setMatchedPr(matchedResults[0].pr);
    setMatchedMember(matchedResults[0].m);
  };

  // Absent delegate member removal
  const handleAbsentMember = (nicToRemove: string) => {
    if (!matchedPr) return;
    if (matchedPr.type === 'individual') return;

    const leader = matchedPr.members.find(m => m.isLeader);
    if (leader && leader.nic.toLowerCase() === nicToRemove.toLowerCase()) {
      alert('You cannot mark the team leader as absent.');
      return;
    }

    confirm('Mark this group member as absent? They will be removed from the check-in list.', async () => {
      try {
        await onGrdRemoveMember(matchedPr.id, nicToRemove);
        const updatedPr = preRegs.find(p => p.id === matchedPr.id);
        if (updatedPr) {
          setMatchedPr({ ...updatedPr });
        }
      } catch (e: any) {
        alert('Failed: ' + e.message);
      }
    });
  };

  const handlePreRegCheckIn = async () => {
    if (!matchedPr) return;
    setIsProcessing(true);
    try {
      const v = await onCheckinPreReg(matchedPr.id, matchedPr.members);
      setMatchedPr(null);
      setMatchedMember(null);
      setSearchNic('');
      setCheckedInTicket(v);
    } catch (e: any) {
      alert('Check In Failed: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Walk-in zone toggles
  const handleWalkinZoneToggle = (zoneName: string) => {
    if (wiSelectedZones.includes(zoneName)) {
      setWiSelectedZones(wiSelectedZones.filter(z => z !== zoneName));
    } else {
      setWiSelectedZones([...wiSelectedZones, zoneName]);
    }
  };

  // Walk-in drivers setters
  const handleAddWiDriver = () => {
    setWiDrivers([...wiDrivers, { name: '', nic: '', vehicle: '' }]);
  };
  const handleRemoveWiDriver = (idx: number) => {
    setWiDrivers(wiDrivers.filter((_, i) => i !== idx));
  };
  const handleWiDriverChange = (idx: number, field: keyof Driver, value: string) => {
    const next = [...wiDrivers];
    next[idx] = { ...next[idx], [field]: value };
    setWiDrivers(next);
  };

  // Walk-in returning visitor lookups
  const handleWiNicInput = (val: string) => {
    setWiNic(val);
    const q = val.trim().toLowerCase();
    if (!q) {
      setWiNicHint(null);
      return;
    }

    // Match previous checked out log to auto-fill
    const history = visitors.filter(v => v.nic && v.nic.toLowerCase() === q);
    if (history.length > 0) {
      const last = history[history.length - 1];
      setWiNicHint({ name: last.name, id: last.id });
    } else {
      setWiNicHint(null);
    }
  };

  const handleWiAutoFill = () => {
    if (!wiNicHint) return;
    const last = visitors.find(v => v.id === wiNicHint.id);
    if (!last) return;

    setWiName(last.name);
    setWiPhone(last.phone || '');
    setWiCompany(last.company || '');
    setWiPurpose(last.purpose || '');
    setWiVehicle(last.vehicle || '');
    setWiSelectedZones(last.zones || []);
    setWiNicHint(null);
  };

  const handleWalkinSubmit = async () => {
    if (!wiName.trim()) return alert('Name is required.');
    if (!/^[a-zA-Z\s.\-']+$/.test(wiName)) return alert('Name can only contain letters.');
    
    const nicCheck = validateNIC(wiNic);
    if (!nicCheck.ok) return alert(nicCheck.msg);
    if (!wiPhone.trim()) return alert('Contact is required.');
    if (!wiHost) return alert('Select host.');
    if (!wiSelectedZones.length) return alert('Select at least one zone.');
    if (wiPhotoAllowed === null) return alert('Photography permission required.');

    const invalidDrivers = wiDrivers.filter(d => !d.name.trim() || !d.nic.trim());
    if (invalidDrivers.length > 0) {
      return alert('All drivers require Name and NIC/Passport.');
    }

    setIsProcessing(true);
    try {
      const v = await onWalkinCheckin({
        name: wiName.trim(),
        nic: wiNic.trim(),
        phone: wiPhone.trim(),
        hostName: wiHost,
        purpose: wiPurpose.trim(),
        company: wiCompany.trim(),
        vehicle: wiVehicle.trim(),
        zones: wiSelectedZones,
        photoAllowed: wiPhotoAllowed,
        drivers: wiDrivers.filter(d => d.name && d.nic)
      });

      // Reset
      setWiName('');
      setWiNic('');
      setWiPhone('');
      setWiHost('');
      setWiPurpose('');
      setWiCompany('');
      setWiVehicle('');
      setWiPhotoAllowed(null);
      setWiSelectedZones([]);
      setWiDrivers([]);
      setWiNicHint(null);
      setShowWalkin(false);
      setCheckedInTicket(v);
    } catch (e: any) {
      alert('Walk-in Check In Failed: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-lt-border">
        <h1 className="font-display text-2xl font-extrabold text-lt-navy">Guardroom Check In</h1>
        <p className="text-xs text-lt-muted font-medium mt-1">Search pre-registrations or create a walk-in entry to register arrivals and issue cards</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Search / Action Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pre-registered Search */}
          <div className="bg-white border border-lt-border rounded-xl p-5 shadow-xs">
            <h2 className="text-xs font-bold text-lt-navy uppercase tracking-wider mb-3">Pre-Registered Search</h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="inp text-xs p-2.5 flex-1" 
                placeholder="NIC, Passport or PR-ID..." 
                value={searchNic}
                onChange={(e) => setSearchNic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGuardSearch()}
              />
              <button 
                onClick={handleGuardSearch}
                className="btn btn-navy py-2.5 px-4 cursor-pointer text-xs"
              >
                <Search size={14} /> Search
              </button>
            </div>

            {searchFeedback && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-100 text-lt-red rounded-lg text-xs font-semibold">
                {searchFeedback}
              </div>
            )}

            {matchedPr && matchedMember && (
              <div className="mt-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1">
                <div className="text-emerald-700 font-extrabold text-xs">✓ Pre-Registration Found: {matchedPr.id}</div>
                <div className="text-xs text-slate-800">
                  <b>{matchedMember.name}</b> — <code className="font-semibold text-slate-600 font-mono">{matchedMember.nic}</code>
                </div>
                <div className="text-[11px] text-lt-muted leading-none mt-1">
                  Host: <b className="text-slate-700">{matchedPr.members[0].hostName}</b>
                  {matchedPr.type === 'group' ? ` · Group size: ${matchedPr.members.length} people` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Walk-in Registration Trigger */}
          <div className="bg-white border border-lt-border rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-lt-navy uppercase tracking-wider">Walk-In Registration</h2>
                <p className="text-[11px] text-lt-muted mt-0.5">Quickly register delegates without pre-approvals</p>
              </div>
              <button 
                onClick={() => setShowWalkin(!showWalkin)}
                className="btn btn-ghost btn-sm font-bold text-lt-navy border-lt-navy/20"
              >
                {showWalkin ? 'Hide Form' : '+ Walk-In'}
              </button>
            </div>

            {/* Walk-in Core Form */}
            {showWalkin && (
              <div className="mt-4 pt-4 border-t border-lt-border space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">NIC / Passport <span className="text-lt-red">*</span></label>
                    <input 
                      type="text" 
                      className="inp text-xs p-2 h-9" 
                      placeholder="NIC, passport" 
                      value={wiNic}
                      onChange={(e) => handleWiNicInput(e.target.value)}
                    />
                    {wiNicHint && (
                      <div className="text-[11px] bg-slate-50 border border-lt-border rounded-md px-2 py-1 mt-1 flex items-center justify-between text-slate-700 leading-none">
                        <span>↩ Return: <b>{wiNicHint.name}</b></span>
                        <button 
                          onClick={handleWiAutoFill}
                          className="text-[10.5px] text-lt-red font-bold hover:underline cursor-pointer"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Visitor Name <span className="text-lt-red">*</span></label>
                    <input 
                      type="text" 
                      className="inp text-xs p-2 h-9" 
                      placeholder="Visitor name" 
                      value={wiName}
                      onChange={(e) => setWiName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ''))}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Contact Number <span className="text-lt-red">*</span></label>
                    <input 
                      type="tel" 
                      className="inp text-xs p-2 h-9" 
                      placeholder="Contact" 
                      value={wiPhone}
                      onChange={(e) => setWiPhone(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Host Employee <span className="text-lt-red">*</span></label>
                    <select 
                      className="inp text-xs px-2 h-9 cursor-pointer"
                      value={wiHost}
                      onChange={(e) => setWiHost(e.target.value)}
                    >
                      <option value="">Select Host…</option>
                      {hosts.map(h => (
                        <option key={h.name} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Purpose of visit <span className="text-lt-red">*</span></label>
                    <input 
                      type="text" 
                      className="inp text-xs p-2 h-9" 
                      placeholder="e.g. Audit, Maintenance" 
                      value={wiPurpose}
                      onChange={(e) => setWiPurpose(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Company</label>
                    <input 
                      type="text" 
                      className="inp text-xs p-2 h-9" 
                      placeholder="Company (optional)" 
                      value={wiCompany}
                      onChange={(e) => setWiCompany(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Vehicle Plate Number</label>
                    <input 
                      type="text" 
                      className="inp text-xs p-2 h-9" 
                      placeholder="e.g. WP CAA-1234" 
                      value={wiVehicle}
                      onChange={(e) => setWiVehicle(e.target.value)}
                    />
                  </div>
                </div>

                {/* Walk-in Photo Check */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Photography / Videography Permission <span className="text-lt-red">*</span></label>
                  <div className="grid grid-cols-2 gap-4 bg-lt-red-lt/20 border border-lt-red-bd/20 rounded-lg p-2 max-w-sm">
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[11.5px] text-emerald-800">
                      <input 
                        type="radio" 
                        name="wi-p" 
                        checked={wiPhotoAllowed === true}
                        onChange={() => setWiPhotoAllowed(true)}
                        className="w-3.5 h-3.5 accent-lt-red"
                      /> 
                      <span>Allowed</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[11.5px] text-rose-800">
                      <input 
                        type="radio" 
                        name="wi-p" 
                        checked={wiPhotoAllowed === false}
                        onChange={() => setWiPhotoAllowed(false)}
                        className="w-3.5 h-3.5 accent-lt-red"
                      /> 
                      <span>Not Permitted</span>
                    </label>
                  </div>
                </div>

                {/* Walk-in zones selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Access Zones <span className="text-lt-red">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 px-1">
                    {zones.map(z => {
                      const sel = wiSelectedZones.includes(z.name);
                      const map: Record<AccessColor, string> = {
                        green: 'hover:bg-emerald-50 border-emerald-500/10 text-emerald-700 bg-emerald-50/50',
                        yellow: 'hover:bg-amber-50 border-amber-500/10 text-amber-700 bg-amber-50/50',
                        amber: 'hover:bg-orange-50 border-orange-500/10 text-orange-700 bg-orange-50/50',
                        red: 'hover:bg-rose-50 border-rose-500/10 text-rose-700 bg-rose-50/50',
                      };
                      const activeMap: Record<AccessColor, string> = {
                        green: 'bg-emerald-500 text-white border-emerald-600',
                        yellow: 'bg-amber-500 text-white border-amber-600',
                        amber: 'bg-orange-500 text-white border-orange-600',
                        red: 'bg-rose-500 text-white border-rose-600',
                      };
                      return (
                        <button
                          key={z.name}
                          type="button"
                          onClick={() => handleWalkinZoneToggle(z.name)}
                          className={`
                            px-1 py-1.5 text-[11px] font-extrabold border rounded-md cursor-pointer transition-all
                            ${sel ? activeMap[z.color] : map[z.color]}
                          `}
                        >
                          {z.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Walk-in Drivers list */}
                <div className="border border-lt-red-bd/20 rounded-xl p-3 bg-rose-50/15 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-lt-red-bd/20">
                    <span className="text-[10px] font-bold text-lt-red uppercase tracking-wider">🚗 Vehicle drivers (Optional)</span>
                    <button 
                      type="button" 
                      onClick={handleAddWiDriver}
                      className="text-[10px] font-extrabold border border-lt-red-bd/30 text-lt-red px-2 py-0.5 rounded-md hover:bg-rose-100/50 cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>

                  {wiDrivers.length === 0 ? (
                    <div className="text-slate-500 text-[11px] italic">No third-party drivers added.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {wiDrivers.map((drv, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-white p-2 rounded border border-lt-red-bd/20 relative">
                          <input 
                            type="text" 
                            className="inp text-[11.5px] p-1 h-7" 
                            placeholder="Name *" 
                            value={drv.name}
                            onChange={(e) => handleWiDriverChange(idx, 'name', e.target.value.replace(/[^a-zA-Z\s.\-']/g, ''))}
                          />
                          <input 
                            type="text" 
                            className="inp text-[11.5px] p-1 h-7" 
                            placeholder="NIC *" 
                            value={drv.nic}
                            onChange={(e) => handleWiDriverChange(idx, 'nic', e.target.value)}
                          />
                          <div className="flex gap-1.5 items-center">
                            <input 
                              type="text" 
                              className="inp text-[11.5px] p-1 h-7 flex-1" 
                              placeholder="Plate No." 
                              value={drv.vehicle}
                              onChange={(e) => handleWiDriverChange(idx, 'vehicle', e.target.value)}
                            />
                            <button 
                              type="button" 
                              onClick={() => handleRemoveWiDriver(idx)}
                              className="p-1 text-lt-red cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Walk-in Submit */}
                <button
                  type="button"
                  onClick={handleWalkinSubmit}
                  className="w-full btn btn-primary py-2.5 justify-center tracking-wide text-xs cursor-pointer font-bold"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Checking in…' : '✓ Register & Issue Pass'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Preview & Verification Panel */}
        <div className="lg:col-span-7">
          {matchedPr && matchedMember ? (
            <div className="space-y-4">
              <div className="bg-white border rounded-xl overflow-hidden shadow-xs border-lt-navy">
                <div className="px-5 py-4 bg-lt-navy border-b border-white/10 text-white flex items-center justify-between">
                  <span className="font-display font-black text-xs uppercase tracking-wider">
                    {matchedPr.type === 'group' ? `👥 Group — ${matchedPr.members.length} Members` : '👤 Individual'} Pre-Registration
                  </span>
                </div>
                
                <div className="p-5 space-y-4">
                  {/* Info Box */}
                  <div className="bg-slate-50 border border-lt-border rounded-lg p-4 text-xs grid grid-cols-2 gap-3.5">
                    <div>
                      <span className="text-lt-muted text-[10px] font-bold block uppercase tracking-wide">Primary Visitor</span>
                      <span className="font-bold text-slate-800 text-sm whitespace-nowrap">{matchedPr.members[0].name}</span>
                    </div>
                    <div>
                      <span className="text-lt-muted text-[10px] font-bold block uppercase tracking-wide">NIC / Passport</span>
                      <span className="font-mono text-slate-700 font-bold whitespace-nowrap">{matchedPr.members[0].nic}</span>
                    </div>
                    <div>
                      <span className="text-lt-muted text-[10px] font-bold block uppercase tracking-wide">Host Employee</span>
                      <span className="font-bold text-slate-800">{matchedPr.members[0].hostName}</span>
                    </div>
                    <div>
                      <span className="text-lt-muted text-[10px] font-bold block uppercase tracking-wide">Purpose</span>
                      <span className="font-bold text-slate-800">{matchedPr.members[0].purpose}</span>
                    </div>
                    <div>
                      <span className="text-lt-muted text-[10px] font-bold block uppercase tracking-wide">Zones Assigned</span>
                      <span className="font-bold text-slate-800">{matchedPr.members[0].zones?.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-lt-muted text-[10px] font-bold block uppercase tracking-wide">Photography / Video</span>
                      <span className={`font-bold ${matchedPr.photoAllowed ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {matchedPr.photoAllowed ? 'Allowed' : 'Not Permitted'}
                      </span>
                    </div>
                  </div>

                  {/* Group Members Section */}
                  {matchedPr.type === 'group' && (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-lt-navy tracking-widest block">Group Check-In Roster</span>
                      <p className="text-[11px] text-lt-muted">Mark absent for delegates missing from physical lineup before Check In</p>
                      <div className="tw max-h-48 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-100 text-[10px] font-bold text-lt-muted uppercase tracking-wider">
                              <th className="py-2 px-3">Role</th>
                              <th className="py-2 px-3">Name</th>
                              <th className="py-2 px-3">NIC</th>
                              <th className="py-2 px-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-lt-border text-slate-700 font-medium">
                            {matchedPr.members.map((m, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3">
                                  {m.isLeader ? (
                                    <span className="text-[9px] bg-rose-100 text-lt-red font-extrabold px-1.5 py-0.5 rounded-sm uppercase">Leader</span>
                                  ) : (
                                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-sm uppercase">Member</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-900">{m.name}</td>
                                <td className="py-2 px-3 font-mono text-[11px]">{m.nic}</td>
                                <td className="py-2 px-3 text-right">
                                  {!m.isLeader && (
                                    <button 
                                      type="button"
                                      onClick={() => handleAbsentMember(m.nic)}
                                      className="text-xs text-lt-red font-bold hover:underline cursor-pointer"
                                    >
                                      Absent
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Drivers check */}
                  {matchedPr.drivers && matchedPr.drivers.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-lt-red tracking-widest block">🚗 Drivers</span>
                      <div className="grid grid-cols-1 gap-1">
                        {matchedPr.drivers.map((drv, idx) => (
                          <div key={idx} className="bg-slate-50 border p-2 text-xs flex justify-between rounded-lg">
                            <span><b>{drv.name}</b> (NIC: <code className="font-mono">{drv.nic}</code>)</span>
                            {drv.vehicle && <span className="font-semibold">{drv.vehicle}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pass Allocation box */}
              {(() => {
                const color = getHighestColor(matchedPr.members[0].zones || []);
                const nextPass = getPreviewPassCode(color);
                const cls = {
                  green: 'bg-emerald-50 border-emerald-200 text-emerald-800',
                  yellow: 'bg-amber-50 border-amber-200 text-amber-800',
                  amber: 'bg-orange-50 border-orange-200 text-orange-850',
                  red: 'bg-rose-50 border-rose-200 text-rose-800',
                }[color];

                return (
                  <div className={`border rounded-xl p-5 shadow-xs bg-white`}>
                    <div className="section-lbl mb-3">Card to Issue</div>
                    <div className={`p-5 rounded-xl border text-center flex flex-col justify-center items-center ${cls}`}>
                      <div className="text-4xl font-extrabold font-display leading-none">{nextPass}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest mt-2">{CLBL[color] || color + ' zone'}</div>
                    </div>
                    <button 
                      onClick={handlePreRegCheckIn}
                      className="w-full btn btn-primary py-3 justify-center text-xs tracking-wide font-extrabold shadow-md mt-4 cursor-pointer"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Checking in…' : '✓ Confirm Check In & Issue Card'}
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white border border-lt-border rounded-xl p-10 text-center text-lt-muted shadow-2xs flex flex-col items-center justify-center p-6 h-full min-h-[300px]">
              <MapPin size={38} className="opacity-25 mb-3 text-lt-navy" />
              <p className="text-sm font-bold text-lt-navy">Awaiting Selection</p>
              <p className="text-xs text-lt-muted max-w-[280px] mt-1">Search the visitor's NIC or passport to verify credentials and allocate their physical badge.</p>
            </div>
          )}
        </div>
      </div>

      {/* Check In Success Modal/Ticket */}
      {checkedInTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border-t-4 border-lt-red animate-scale-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-lt-border flex items-center justify-between bg-slate-50">
              <span className="font-display font-black text-xs text-lt-navy uppercase tracking-wider">✓ Check In Successful</span>
              <button 
                onClick={() => setCheckedInTicket(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Ticket Printable Body */}
            <div className="p-6">
              {/* Badge Preview Card */}
              {(() => {
                const color = checkedInTicket.color;
                const borderMap = {
                  green: 'border-emerald-600 bg-emerald-500/10 text-emerald-800',
                  yellow: 'border-amber-500 bg-amber-500/10 text-amber-800',
                  amber: 'border-orange-500 bg-orange-500/10 text-orange-850',
                  red: 'border-rose-500 bg-rose-500/10 text-rose-800',
                }[color] || 'border-slate-300 bg-slate-100 text-slate-700';

                return (
                  <div className={`border-2 rounded-xl p-5 flex flex-col items-center justify-center text-center ${borderMap} mb-5`}>
                    <div className="text-6xl font-display font-black leading-none">{checkedInTicket.pass}</div>
                    <div className="text-xs font-black uppercase tracking-widest mt-3">{color.toUpperCase()} ZONE PASS</div>
                    <div className="h-0.5 w-12 bg-current opacity-30 my-3" />
                    <div className="text-[15px] font-bold">{checkedInTicket.name}</div>
                    {checkedInTicket.isGroup && (
                      <div className="text-xs font-semibold mt-1 opacity-90">Group Visit (×{checkedInTicket.groupCount} Guests)</div>
                    )}
                    <div className="text-[10.5px] opacity-80 mt-1">Authorized: <b>{checkedInTicket.zones.join(' · ')}</b></div>
                  </div>
                );
              })()}

              {/* Attributes Checklist */}
              <div className="space-y-2 text-xs border-b border-dashed border-slate-200 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-lt-muted font-bold">NIC/PASSPORT:</span>
                  <span className="font-mono font-bold text-slate-800">{checkedInTicket.nic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-lt-muted font-bold">HOST EMPLOYEE:</span>
                  <span className="font-bold text-slate-800">{checkedInTicket.hostName}</span>
                </div>
                {checkedInTicket.company && (
                  <div className="flex justify-between">
                    <span className="text-lt-muted font-bold">ORGANIZATION:</span>
                    <span className="font-bold text-slate-800">{checkedInTicket.company}</span>
                  </div>
                )}
                {checkedInTicket.vehicle && (
                  <div className="flex justify-between">
                    <span className="text-lt-muted font-bold">VEHICLE NO:</span>
                    <span className="font-bold text-slate-800">{checkedInTicket.vehicle}</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-md py-1.5 px-2.5 mt-2">
                  <span className="text-lt-muted font-bold text-[11px] uppercase tracking-wide flex items-center gap-1">
                    <Camera size={12} className="text-slate-500" /> Camera Permission:
                  </span>
                  <span className={`font-black text-[11px] ${checkedInTicket.photoAllowed ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-xs' : 'text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-xs'}`}>
                    {checkedInTicket.photoAllowed ? 'ALLOWED' : 'PROHIBITED'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <button 
                onClick={() => setCheckedInTicket(null)}
                className="w-full btn btn-primary py-2.5 justify-center text-xs font-bold shadow-md cursor-pointer"
              >
                ✓ Complete Check In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CLBL: Record<string, string> = {
  green: "Green Zone",
  yellow: "Yellow Zone",
  amber: "Amber Zone",
  red: "Red Zone",
};

const CPFX: Record<string, string> = {
  green: 'G',
  yellow: 'Y',
  amber: 'A',
  red: 'R',
};
