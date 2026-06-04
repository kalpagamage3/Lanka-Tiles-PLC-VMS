import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PreRegistration, Host, Zone, Member, Driver, AccessColor } from '../types';

interface PreRegistrationViewProps {
  preRegs: PreRegistration[];
  hosts: Host[];
  zones: Zone[];
  onSubmitPreReg: (pr: Omit<PreRegistration, 'id' | 'submittedAt'>) => Promise<void>;
  onCancelPreReg: (id: string) => Promise<void>;
  showAlert?: (msg: string, title?: string) => void;
  showConfirm?: (msg: string, onConfirm: () => void, title?: string) => void;
}

export default function PreRegistrationView({
  preRegs,
  hosts,
  zones,
  onSubmitPreReg,
  onCancelPreReg,
  showAlert,
  showConfirm,
}: PreRegistrationViewProps) {
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

  // Step state for optimized mobile wizard layout
  const [formStep, setFormStep] = useState<number>(1);
  // New Pre-Registration form states
  const [prType, setPrType] = useState<'individual' | 'group'>('individual');
  const [name, setName] = useState('');
  const [nic, setNic] = useState('');
  const [phone, setPhone] = useState('');
  const [hostName, setHostName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [company, setCompany] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [photoAllowed, setPhotoAllowed] = useState<boolean | null>(null);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  
  // Group members list
  const [groupRows, setGroupRows] = useState<{ name: string; nic: string; company: string }[]>([]);
  // Driver rows
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'checked-in' | 'cancelled'>('all');
  
  // Details Modal
  const [activeDetails, setActiveDetails] = useState<PreRegistration | null>(null);

  // Field constraints / feedback
  const [nicHint, setNicHint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate standard Sri Lankan NIC & Passport format
  const validateNIC = (val: string): { ok: boolean; msg: string } => {
    const v = val.trim();
    if (!v) return { ok: false, msg: 'NIC/Passport is required' };
    const snic = /^\d{9}[VXvx]$|^\d{12}$/.test(v);
    const passport = /^[A-Za-z]{1,2}\d{6,8}$/.test(v);
    if (snic || passport) return { ok: true, msg: '' };
    return { ok: false, msg: 'Format must match NIC (e.g. 199012345678 or 901234567V) or passport' };
  };

  const handleNicChange = (val: string) => {
    setNic(val);
    const check = validateNIC(val);
    setNicHint(check.ok ? '' : check.msg);
  };

  const handleAddDriver = () => {
    setDrivers([...drivers, { name: '', nic: '', vehicle: '' }]);
  };

  const handleRemoveDriver = (idx: number) => {
    setDrivers(drivers.filter((_, i) => i !== idx));
  };

  const handleDriverChange = (idx: number, field: keyof Driver, value: string) => {
    const next = [...drivers];
    next[idx] = { ...next[idx], [field]: value };
    setDrivers(next);
  };

  // Group members grid helpers
  const handleAddGroupRow = () => {
    setGroupRows([...groupRows, { name: '', nic: '', company: '' }]);
  };

  const handleRemoveGroupRow = (idx: number) => {
    setGroupRows(groupRows.filter((_, i) => i !== idx));
  };

  const handleGroupRowChange = (idx: number, field: 'name' | 'nic' | 'company', value: string) => {
    const next = [...groupRows];
    next[idx] = { ...next[idx], [field]: value };
    setGroupRows(next);
  };

  const handleClearGroupRows = () => {
    setGroupRows([]);
  };

  // SheetJS Excel upload for Group Members
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;
    const f = files[0];
    e.target.value = ''; // reset

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];

        if (!rawRows.length) {
          alert('Excel sheet contains no records.');
          return;
        }

        const keys = Object.keys(rawRows[0]);
        const nameCol = keys.find(c => /^name$/i.test(c.trim())) || keys[0];
        const nicCol = keys.find(c => /^nic|passport|id/i.test(c.trim())) || keys[1] || '';
        const compCol = keys.find(c => /^company|org/i.test(c.trim())) || '';

        const loadedRows = rawRows
          .map(r => ({
            name: String(r[nameCol] || '').trim(),
            nic: String(r[nicCol] || '').trim(),
            company: compCol ? String(r[compCol] || '').trim() : ''
          }))
          .filter(m => m.name && m.nic);

        if (!loadedRows.length) {
          alert('Could not parse any rows. Ensure your spreadsheet contains "Name" and "NIC" columns.');
          return;
        }

        setGroupRows(loadedRows);
        alert(`Successfully uploaded ${loadedRows.length} group members.`);
      } catch (err: any) {
        alert('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  // Download Sample Excel Template
  const downloadGroupTemplate = () => {
    const data = [
      ['Name', 'NIC/Passport', 'Company'],
      ['Samantha Perera', '199512345678', 'Saman Engineering'],
      ['Priya Ranjith', '941234567V', 'Ranjith & Sons']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Lanka_Tiles_Group_Template.xlsx');
  };

  const toggleZone = (zoneName: string) => {
    if (selectedZones.includes(zoneName)) {
      setSelectedZones(selectedZones.filter(z => z !== zoneName));
    } else {
      setSelectedZones([...selectedZones, zoneName]);
    }
  };

  const validateMobileStep1 = () => {
    if (!name.trim()) { alert('Visitor/Team Leader name is required.'); return false; }
    if (!/^[a-zA-Z\s.\-']+$/.test(name)) { alert('Name can only contain letters, dots, and spaces.'); return false; }
    const nicCheck = validateNIC(nic);
    if (!nicCheck.ok) { alert(nicCheck.msg); return false; }
    if (!phone.trim()) { alert('Contact number is required.'); return false; }
    return true;
  };

  const validateMobileStep2 = () => {
    if (!hostName) { alert('Please select a host employee.'); return false; }
    if (!purpose.trim()) { alert('Purpose of visit is required.'); return false; }
    if (photoAllowed === null) { alert('Please indicate photography permission.'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!name.trim()) return alert('Visitor name is required.');
    if (!/^[a-zA-Z\s.\-']+$/.test(name)) return alert('Name can only contain letters, dots, and spaces.');
    
    const nicCheck = validateNIC(nic);
    if (!nicCheck.ok) return alert(nicCheck.msg);
    if (!phone.trim()) return alert('Contact phone number is required.');
    if (!hostName) return alert('Please select an employee host.');
    if (!purpose.trim()) return alert('Purpose of visit is required.');
    if (photoAllowed === null) return alert('Please indicate photography permission.');
    if (!selectedZones.length) return alert('Please select at least one authorised zone.');

    if (prType === 'group' && !groupRows.length) {
      return alert('Group visit must contain at least one group member.');
    }

    const invalidGroup = groupRows.filter(m => !m.name.trim() || !m.nic.trim());
    if (invalidGroup.length > 0) {
      return alert('All group members must have both a Name and NIC/Passport.');
    }

    const invalidDrivers = drivers.filter(d => !d.name.trim() || !d.nic.trim());
    if (invalidDrivers.length > 0) {
      return alert('All added drivers must have a Name and NIC/Passport.');
    }

    setIsSubmitting(true);
    try {
      const leader: Member = {
        name: name.trim(),
        nic: nic.trim(),
        phone: phone.trim(),
        company: company.trim(),
        purpose: purpose.trim(),
        vehicle: vehicle.trim(),
        zones: selectedZones,
        hostName,
        isLeader: true
      };

      const members: Member[] = [leader];
      if (prType === 'group') {
        groupRows.forEach(row => {
          members.push({
            name: row.name.trim(),
            nic: row.nic.trim(),
            company: row.company.trim(),
            zones: selectedZones,
            hostName,
            isLeader: false
          });
        });
      }

      await onSubmitPreReg({
        type: prType,
        status: 'pending',
        photoAllowed,
        members,
        drivers: drivers.filter(d => d.name && d.nic),
        visitorId: null
      });

      // Reset Form State
      setName('');
      setNic('');
      setPhone('');
      setHostName('');
      setPurpose('');
      setCompany('');
      setVehicle('');
      setPhotoAllowed(null);
      setSelectedZones([]);
      setGroupRows([]);
      setDrivers([]);
      alert('Pre-Registration successful.');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter records list
  const filteredRegs = preRegs
    .filter(pr => {
      const matchQuery = searchQuery.trim().toLowerCase();
      if (!matchQuery) return true;
      const leader = pr.members.find(m => m.isLeader) || pr.members[0];
      return (
        pr.id.toLowerCase().includes(matchQuery) ||
        leader?.name.toLowerCase().includes(matchQuery) ||
        leader?.nic.toLowerCase().includes(matchQuery) ||
        leader?.company?.toLowerCase().includes(matchQuery) ||
        leader?.hostName?.toLowerCase().includes(matchQuery)
      );
    })
    .filter(pr => {
      if (statusFilter === 'all') return true;
      return pr.status === statusFilter;
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-lt-border">
        <h1 className="font-display text-2xl font-extrabold text-lt-navy">Pre-Registration</h1>
        <p className="text-xs text-lt-muted font-medium mt-1">Submit visitor parameters in advance to bypass manual entry check-in delays</p>
      </div>

      {/* Form Card */}
      <div className="bg-white border border-lt-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-lt-border bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="font-display font-black text-xs text-lt-navy uppercase tracking-wider">New Pre-Registration</span>
          <div className="flex gap-1 bg-slate-200/60 p-0.5 rounded-lg self-start">
            <button 
              type="button"
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${prType === 'individual' ? 'bg-white shadow-xs text-lt-navy' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setPrType('individual')}
            >
              👤 Individual
            </button>
            <button 
              type="button"
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${prType === 'group' ? 'bg-white shadow-xs text-lt-navy' : 'text-slate-600 hover:text-slate-900'}`}
              onClick={() => setPrType('group')}
            >
              👥 Group Visit
            </button>
          </div>
        </div>

        {/* Desktop Form (hidden on mobile, shown on md) */}
        <div className="hidden md:block p-5 space-y-4">
          {/* Main Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Visitor / Team Leader Name <span className="text-lt-red">*</span></label>
              <input 
                type="text" 
                className="inp text-xs p-2.5" 
                placeholder="Nimal Jayasinghe" 
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ''))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">NIC / Passport Number <span className="text-lt-red">*</span></label>
              <input 
                type="text" 
                className="inp text-xs p-2.5" 
                placeholder="199011223344 or N1234567" 
                value={nic}
                onChange={(e) => handleNicChange(e.target.value)}
              />
              {nicHint && <span className="text-[10.5px] font-semibold text-lt-red mt-0.5">{nicHint}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Contact Number <span className="text-lt-red">*</span></label>
              <input 
                type="tel" 
                className="inp text-xs p-2.5" 
                placeholder="0771234567" 
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Host Employee <span className="text-lt-red">*</span></label>
              <select 
                className="inp text-xs p-2.5 cursor-pointer h-10" 
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
              >
                <option value="">Select Host…</option>
                {hosts.map(h => (
                  <option key={h.name} value={h.name}>
                    {h.name} — {h.designation} {h.dept ? `(${h.dept})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Purpose of visit <span className="text-lt-red">*</span></label>
              <input 
                type="text" 
                className="inp text-xs p-2.5" 
                placeholder="e.g. Audit, Machinery Service" 
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Company / Organization <span className="text-lt-muted">(Optional)</span></label>
              <input 
                type="text" 
                className="inp text-xs p-2.5" 
                placeholder="Silicon Solutions" 
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Vehicle Number <span className="text-lt-muted">(Optional)</span></label>
              <input 
                type="text" 
                className="inp text-xs p-2.5" 
                placeholder="e.g. WP CAA-1234" 
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              />
            </div>
          </div>

          {/* Photo Permission Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Photography / Videography Permission <span className="text-lt-red">*</span></label>
            <div className="grid grid-cols-2 gap-4 bg-lt-red-lt/30 border border-lt-red-bd/30 rounded-lg p-3 max-w-md">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-emerald-800">
                <input 
                  type="radio" 
                  name="pr-photo" 
                  checked={photoAllowed === true}
                  onChange={() => setPhotoAllowed(true)}
                  className="w-4 h-4 accent-lt-red"
                /> 
                <span>✅ Allowed</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-rose-800">
                <input 
                  type="radio" 
                  name="pr-photo" 
                  checked={photoAllowed === false}
                  onChange={() => setPhotoAllowed(false)}
                  className="w-4 h-4 accent-lt-red"
                /> 
                <span>❌ Not Permitted</span>
              </label>
            </div>
          </div>

          {/* Access Zones Selector Grid */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Select Access Zones <span className="text-lt-red">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {zones.map(z => {
                const isSelected = selectedZones.includes(z.name);
                const colorsMap: Record<AccessColor, string> = {
                  green: 'hover:bg-emerald-50 border-emerald-500/10 text-emerald-750 bg-emerald-50/50',
                  yellow: 'hover:bg-amber-50 border-amber-500/10 text-amber-750 bg-amber-50/50',
                  amber: 'hover:bg-orange-50 border-orange-500/10 text-orange-750 bg-orange-50/50',
                  red: 'hover:bg-rose-50 border-rose-500/10 text-rose-750 bg-rose-50/50',
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
                    onClick={() => toggleZone(z.name)}
                    className={`
                      px-2 py-2.5 rounded-lg text-xs font-bold text-center border cursor-pointer transition-all
                      ${isSelected ? activeMap[z.color] : colorsMap[z.color]}
                    `}
                  >
                    {z.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group Members Section */}
          {prType === 'group' && (
            <div className="border border-lt-border rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-lt-border">
                <div>
                  <h3 className="text-xs font-extrabold text-lt-navy uppercase tracking-wider">Group / Team Members ({groupRows.length})</h3>
                  <p className="text-[11px] text-lt-muted mt-0.5">Define additional delegates arriving in the team</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    type="button" 
                    onClick={downloadGroupTemplate}
                    className="btn btn-ghost btn-xs text-[10.5px] font-bold"
                  >
                    <Download size={11} /> Template
                  </button>
                  <label className="btn btn-ghost btn-xs text-[10.5px] font-bold cursor-pointer">
                    <FileSpreadsheet size={11} /> Upload Excel
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
                  </label>
                  <button 
                    type="button" 
                    onClick={handleAddGroupRow}
                    className="btn btn-navy btn-xs text-[10.5px] font-bold"
                  >
                    + Add Row
                  </button>
                  <button 
                    type="button" 
                    onClick={handleClearGroupRows}
                    className="btn btn-danger btn-xs text-[10.5px] font-bold"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {groupRows.length === 0 ? (
                <div className="text-center py-6 text-lt-muted text-[11.5px] italic">
                  No additional members. Upload template or add rows manually.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {groupRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-white p-3 rounded-lg border border-lt-border relative">
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] font-extrabold text-lt-muted bg-slate-100 py-1 px-2 rounded-sm">{idx + 1}</span>
                        <input 
                          type="text" 
                          className="inp text-xs p-1.5 flex-1" 
                          placeholder="Member Name" 
                          value={row.name}
                          onChange={(e) => handleGroupRowChange(idx, 'name', e.target.value.replace(/[^a-zA-Z\s.\-']/g, ''))}
                        />
                      </div>
                      <input 
                        type="text" 
                        className="inp text-xs p-1.5" 
                        placeholder="NIC / Passport" 
                        value={row.nic}
                        onChange={(e) => handleGroupRowChange(idx, 'nic', e.target.value)}
                      />
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          className="inp text-xs p-1.5 flex-1" 
                          placeholder="Company (Optional)" 
                          value={row.company}
                          onChange={(e) => handleGroupRowChange(idx, 'company', e.target.value)}
                        />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveGroupRow(idx)}
                          className="p-1.5 bg-rose-50 border border-rose-100 text-lt-red hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drivers Section */}
          <div className="border border-lt-red-bd/20 rounded-xl p-4 bg-rose-50/15 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-lt-red-bd/20">
              <div>
                <h3 className="text-xs font-extrabold text-lt-red uppercase tracking-wider">🚗 Vehicle Driver Details (Optional)</h3>
                <p className="text-[11px] text-lt-muted mt-0.5">Specify dispatch or transport driver info if different from visitor</p>
              </div>
              <button 
                type="button" 
                onClick={handleAddDriver}
                className="btn btn-ghost btn-xs text-[10.5px] font-bold border-lt-red-bd/40 text-lt-red"
              >
                + Add Driver
              </button>
            </div>

            {drivers.length === 0 ? (
              <div className="text-left text-lt-muted text-[11.5px] italic">
                No third-party drivers added.
              </div>
            ) : (
              <div className="space-y-2">
                {drivers.map((drv, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-white p-3 rounded-lg border border-lt-red-bd/20">
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] font-extrabold text-lt-muted bg-slate-100 py-1 px-2 rounded-sm">{idx + 1}</span>
                      <input 
                        type="text" 
                        className="inp text-xs p-1.5 flex-1" 
                        placeholder="Driver Name *" 
                        value={drv.name}
                        onChange={(e) => handleDriverChange(idx, 'name', e.target.value.replace(/[^a-zA-Z\s.\-']/g, ''))}
                      />
                    </div>
                    <input 
                      type="text" 
                      className="inp text-xs p-1.5" 
                      placeholder="Driver NIC / Passport *" 
                      value={drv.nic}
                      onChange={(e) => handleDriverChange(idx, 'nic', e.target.value)}
                    />
                    <div className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        className="inp text-xs p-1.5 flex-1" 
                        placeholder="Vehicle Plate No." 
                        value={drv.vehicle}
                        onChange={(e) => handleDriverChange(idx, 'vehicle', e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveDriver(idx)}
                        className="p-1.5 bg-rose-50 border border-rose-100 text-lt-red hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Action */}
          <button 
            type="button"
            className="w-full btn btn-primary py-3 justify-center text-xs font-bold transition-all shadow-md cursor-pointer"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : '💾 Submit Pre-Registration record'}
          </button>
        </div>

        {/* Mobile Step Form (block md:hidden) - Custom native styled wizard form */}
        <div className="block md:hidden p-4 space-y-4">
          {/* Step Progress Tracker */}
          <div className="flex items-center justify-between font-display text-[10.5px] font-black tracking-wider uppercase text-lt-navy mb-1.5 border-b border-gray-100 pb-2">
            <span>Progress Details</span>
            <span className="bg-lt-red text-white px-2 py-0.5 rounded-full text-[9px] font-bold">Step {formStep} of 3</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-lt-red h-full transition-all duration-350 rounded-full" 
              style={{ width: `${(formStep / 3) * 100}%` }}
            />
          </div>

          {/* Form Step 1: Visitor Identity */}
          {formStep === 1 && (
            <div className="space-y-4 pt-1">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Visitor Classification</span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button 
                    type="button"
                    onClick={() => setPrType('individual')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border cursor-pointer transition-all ${prType === 'individual' ? 'bg-lt-navy text-white border-lt-navy shadow-xs font-black' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                  >
                    👤 Individual
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPrType('group')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border cursor-pointer transition-all ${prType === 'group' ? 'bg-lt-navy text-white border-lt-navy shadow-xs font-black' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                  >
                    👥 Group Visit
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wide">Leader / Visitor Name <span className="text-lt-red">*</span></label>
                <input 
                  type="text" 
                  className="inp text-xs p-2.5 h-10 w-full" 
                  placeholder="Nimal Jayasinghe" 
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s.\-']/g, ''))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wide">NIC / Passport <span className="text-lt-red">*</span></label>
                <input 
                  type="text" 
                  className="inp text-xs p-2.5 h-10 w-full" 
                  placeholder="199011223344 or N1234567" 
                  value={nic}
                  onChange={(e) => handleNicChange(e.target.value)}
                />
                {nicHint && <span className="text-[10px] font-bold text-lt-red mt-0.5">{nicHint}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wide">Contact Phone <span className="text-lt-red">*</span></label>
                <input 
                  type="tel" 
                  className="inp text-xs p-2.5 h-10 w-full" 
                  placeholder="0771234567" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wide">Company / Organization <span className="text-slate-400 font-semibold">(Optional)</span></label>
                <input 
                  type="text" 
                  className="inp text-xs p-2.5 h-10 w-full" 
                  placeholder="Silicon Solutions" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    if (validateMobileStep1()) setFormStep(2);
                  }}
                  className="w-full btn btn-primary py-2.5 justify-center text-xs font-bold cursor-pointer transition-all shadow-sm"
                >
                  Continue to Visit Details →
                </button>
              </div>
            </div>
          )}

          {/* Form Step 2: Host & Purpose */}
          {formStep === 2 && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wide">Host Employee <span className="text-lt-red">*</span></label>
                <select 
                  className="inp text-xs p-2.5 cursor-pointer h-10 w-full bg-white text-slate-800" 
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                >
                  <option value="">Select Host…</option>
                  {hosts.map(h => (
                    <option key={h.name} value={h.name}>
                      {h.name} — {h.designation} {h.dept ? `(${h.dept})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wide">Purpose of Visit <span className="text-lt-red">*</span></label>
                <input 
                  type="text" 
                  className="inp text-xs p-2.5 h-10 w-full" 
                  placeholder="e.g. Audit, Machinery Service" 
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wide">Vehicle Plate Number <span className="text-slate-400 font-semibold">(Optional)</span></label>
                <input 
                  type="text" 
                  className="inp text-xs p-2.5 h-10 w-full" 
                  placeholder="WP CAA-1234" 
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5 bg-rose-50/10 border border-slate-100 p-3.5 rounded-lg">
                <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wide">Photography Permission <span className="text-lt-red">*</span></label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button 
                    type="button"
                    onClick={() => setPhotoAllowed(true)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border cursor-pointer transition-all ${photoAllowed === true ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-black' : 'bg-white text-slate-705 border-slate-200 hover:bg-slate-50'}`}
                  >
                    Allow Camera ✅
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPhotoAllowed(false)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border cursor-pointer transition-all ${photoAllowed === false ? 'bg-rose-600 text-white border-rose-600 shadow-sm font-black' : 'bg-white text-slate-705 border-slate-200 hover:bg-slate-50'}`}
                  >
                    Prohibit ❌
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="btn btn-ghost py-2.5 justify-center text-xs font-bold cursor-pointer"
                >
                  ← Back
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (validateMobileStep2()) setFormStep(3);
                  }}
                  className="btn btn-primary py-2.5 justify-center text-xs font-bold cursor-pointer shadow-sm"
                >
                  Clearance &amp; Zones →
                </button>
              </div>
            </div>
          )}

          {/* Form Step 3: Zones and delegated groups */}
          {formStep === 3 && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wide">Select Access Zones <span className="text-lt-red">*</span></label>
                <div className="grid grid-cols-2 gap-1.5">
                  {zones.map(z => {
                    const isSelected = selectedZones.includes(z.name);
                    const colorsMap: Record<AccessColor, string> = {
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
                        onClick={() => toggleZone(z.name)}
                        className={`
                          px-2 py-2 rounded-lg text-[10px] font-bold text-center border cursor-pointer transition-all
                          ${isSelected ? activeMap[z.color] : colorsMap[z.color]}
                        `}
                      >
                        {z.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group delegate layout */}
              {prType === 'group' && (
                <div className="border border-lt-border rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-lt-border">
                    <span className="text-[9.5px] font-black text-lt-navy uppercase tracking-wider">Group members ({groupRows.length})</span>
                    <button 
                      type="button" 
                      onClick={handleAddGroupRow}
                      className="text-[9.5px] font-extrabold border border-lt-navy/20 text-lt-navy bg-white px-2.5 py-1 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      + Add Member
                    </button>
                  </div>
                  
                  {groupRows.length === 0 ? (
                    <div className="text-center py-4 text-lt-muted text-[10.5px] italic">
                      No delegation rows. Tap button to add.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {groupRows.map((row, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-lt-border space-y-1 relative">
                          <div className="flex gap-1.5 items-center justify-between border-b border-slate-50 pb-0.5 mb-1">
                            <span className="text-[8.5px] font-bold text-slate-400 uppercase">Member #{idx + 1}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveGroupRow(idx)}
                              className="text-[10px] text-lt-red hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                          <input 
                            type="text" 
                            className="inp text-xs p-1.5 w-full h-8" 
                            placeholder="Full Name *" 
                            value={row.name}
                            onChange={(e) => handleGroupRowChange(idx, 'name', e.target.value.replace(/[^a-zA-Z\s.\-']/g, ''))}
                          />
                          <input 
                            type="text" 
                            className="inp text-xs p-1.5 w-full h-8" 
                            placeholder="NIC / Passport *" 
                            value={row.nic}
                            onChange={(e) => handleGroupRowChange(idx, 'nic', e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Drivers layout */}
              <div className="border border-lt-red-bd/25 rounded-xl p-3 bg-rose-50/10 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-lt-red-bd/20">
                  <span className="text-[9.5px] font-black text-lt-red uppercase tracking-wider">🚗 Drivers lists</span>
                  <button 
                    type="button" 
                    onClick={handleAddDriver}
                    className="text-[9.5px] font-extrabold border border-lt-red-bd/25 text-lt-red bg-white px-2.5 py-1 rounded hover:bg-rose-50/20 cursor-pointer"
                  >
                    + Add Driver
                  </button>
                </div>
                {drivers.length === 0 ? (
                  <div className="text-left text-lt-muted text-[10.5px] italic py-1">
                    No separate drivers added.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {drivers.map((drv, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-lt-red-bd/10 space-y-1 relative">
                        <div className="flex gap-1.5 items-center justify-between border-b border-rose-50 pb-0.5">
                          <span className="text-[8.5px] font-bold text-lt-red opacity-85 uppercase">Driver #{idx + 1}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveDriver(idx)}
                            className="text-[10px] text-lt-red hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <input 
                          type="text" 
                          className="inp text-xs p-1.5 w-full h-8" 
                          placeholder="Name *" 
                          value={drv.name}
                          onChange={(e) => handleDriverChange(idx, 'name', e.target.value.replace(/[^a-zA-Z\s.\-']/g, ''))}
                        />
                        <input 
                          type="text" 
                          className="inp text-xs p-1.5 w-full h-8" 
                          placeholder="NIC *" 
                          value={drv.nic}
                          onChange={(e) => handleDriverChange(idx, 'nic', e.target.value)}
                        />
                        <input 
                          type="text" 
                          className="inp text-xs p-1.5 w-full h-8" 
                          placeholder="Vehicle No." 
                          value={drv.vehicle}
                          onChange={(e) => handleDriverChange(idx, 'vehicle', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setFormStep(2)}
                  className="btn btn-ghost py-2.5 justify-center text-xs font-bold cursor-pointer"
                >
                  ← Back
                </button>
                <button 
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn btn-primary bg-lt-navy text-white hover:bg-lt-navy-dk py-2.5 justify-center text-xs font-extrabold cursor-pointer shadow-md rounded-lg"
                >
                  {isSubmitting ? 'Submitting...' : '✓ Submit Pre-Reg'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Directory Grid of Pre-registrations */}
      <div>
        <h2 className="text-[11px] font-extrabold text-lt-navy uppercase tracking-wider mb-3">Pre-Registration Records ({filteredRegs.length})</h2>
        
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <input 
            type="text" 
            placeholder="Search visitor, NIC, company, host..."
            className="inp text-xs p-2.5 flex-1 bg-white border border-lt-border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-1 overflow-x-auto self-start sm:self-center">
            {(['all', 'pending', 'checked-in', 'cancelled'] as const).map(f => {
              const count = f === 'all' 
                ? preRegs.length 
                : preRegs.filter(p => p.status === f).length;
              return (
                <button
                  key={f}
                  type="button"
                  className={`
                    px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap
                    ${statusFilter === f 
                      ? 'bg-lt-navy text-white border-lt-navy shadow-sm' 
                      : 'bg-white text-slate-600 border-lt-border hover:bg-slate-50'
                    }
                  `}
                  onClick={() => setStatusFilter(f)}
                >
                  {{ all: 'All', pending: 'Pending', 'checked-in': 'Checked In', cancelled: 'Cancelled' }[f]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Records Listing */}
        {filteredRegs.length === 0 ? (
          <div className="bg-white border border-lt-border rounded-xl text-center py-10 text-lt-muted text-xs p-6 shadow-2xs">
            No matching pre-registrations found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRegs.map(pr => {
              const leader = pr.members.find(m => m.isLeader) || pr.members[0];
              const statClasses = {
                pending: 'bg-amber-100 text-amber-800 border-amber-200',
                'checked-in': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                cancelled: 'bg-gray-100 text-gray-500 border-gray-200'
              }[pr.status];

              return (
                <div 
                  key={pr.id} 
                  className={`
                    bg-white border rounded-xl p-4 shadow-2xs flex flex-col justify-between gap-4 transition-all
                    ${pr.status === 'pending' ? 'border-amber-300' : 'border-lt-border'}
                  `}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-black text-xs text-lt-navy">{pr.id}</span>
                        {pr.type === 'group' && (
                          <span className="bg-lt-navy/10 text-lt-navy text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                            Group (×{pr.members.length})
                          </span>
                        )}
                        {pr.drivers && pr.drivers.length > 0 && (
                          <span className="bg-slate-100 text-slate-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                            🚗 Driver
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border uppercase tracking-wider ${statClasses}`}>
                        {pr.status === 'checked-in' ? 'Checked-In' : pr.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-extrabold text-slate-900">{leader?.name}</div>
                      {leader?.company && (
                        <div className="text-[11px] text-lt-muted">Company: <b>{leader.company}</b></div>
                      )}
                      <div className="text-[11px] text-slate-500">
                        Host: <b className="text-slate-800">{leader?.hostName}</b>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Access Zones: {leader?.zones?.join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 flex-wrap gap-2 text-slate-500 text-[10.5px]">
                    <div>
                      {new Date(pr.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                    <div className="flex gap-1.5 self-end">
                      <button 
                        type="button" 
                        onClick={() => setActiveDetails(pr)}
                        className="btn btn-xs bg-slate-100 hover:bg-slate-200 text-slate-800"
                        title="View Details"
                      >
                        <Eye size={12} /> View
                      </button>
                      {pr.status === 'pending' && (
                        <button 
                          type="button" 
                          onClick={() => confirm(`Are you sure you want to cancel pre-registration ${pr.id}?`, () => onCancelPreReg(pr.id))}
                          className="btn btn-xs bg-rose-50 text-lt-red hover:bg-rose-100 border border-rose-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details View Modal */}
      {activeDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col border-t-3 border-lt-red">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-lt-border flex items-center justify-between bg-slate-50">
              <span className="font-display font-extrabold text-xs text-lt-navy uppercase tracking-wider">
                {activeDetails.id} — {activeDetails.type === 'group' ? 'Group' : 'Individual'} Pre-Registration
              </span>
              <button 
                onClick={() => setActiveDetails(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Box */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-slate-50 border border-lt-border rounded-lg p-3.5 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-lt-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">Status</span>
                  <span className="inline-flex px-1.5 py-0.5 rounded-sm text-[9.5px] font-black uppercase tracking-wider border bg-amber-100 text-amber-800 border-amber-200">
                    {activeDetails.status}
                  </span>
                </div>
                <div>
                  <span className="text-lt-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">Date Submitted</span>
                  <span className="font-bold text-slate-800">
                    {new Date(activeDetails.submittedAt).toLocaleString('en-GB')}
                  </span>
                </div>
                <div>
                  <span className="text-lt-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">Host Employee</span>
                  <span className="font-bold text-slate-800">{activeDetails.members[0]?.hostName}</span>
                </div>
                <div className="col-span-2 sm:col-span-3 border-t border-slate-200/50 pt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-lt-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">Visit Purpose</span>
                    <span className="font-bold text-slate-800">{activeDetails.members[0]?.purpose}</span>
                  </div>
                  <div>
                    <span className="text-lt-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">Access Zones</span>
                    <span className="font-bold text-slate-800">{activeDetails.members[0]?.zones?.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-lt-muted block text-[10px] uppercase font-bold tracking-wider mb-0.5">Camera Permission</span>
                    <span className={`font-bold ${activeDetails.photoAllowed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {activeDetails.photoAllowed ? '✓ Allowed' : '✗ Not Permitted'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-lt-navy tracking-widest block">Group Members ({activeDetails.members.length})</span>
                <div className="tw">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-lt-border text-[9.5px] font-bold text-lt-muted uppercase tracking-wider">
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">NIC / Passport</th>
                        <th className="py-2.5 px-3">Contact</th>
                        <th className="py-2.5 px-3">Company</th>
                        {activeDetails.members[0].vehicle && <th className="py-2.5 px-3">Vehicle</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-lt-border text-slate-700">
                      {activeDetails.members.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            {m.isLeader ? (
                              <span className="text-[9px] bg-rose-100 text-lt-red font-extrabold px-1.5 py-0.5 rounded-xs uppercase">Leader</span>
                            ) : (
                              <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-xs uppercase">Member</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{m.name}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">{m.nic}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{m.phone || '—'}</td>
                          <td className="py-2.5 px-3">{m.company || '—'}</td>
                          {activeDetails.members[0].vehicle && <td className="py-2.5 px-3 whitespace-nowrap">{m.vehicle || '—'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Drivers table if any */}
              {activeDetails.drivers && activeDetails.drivers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-lt-red tracking-widest block">🚗 Registered Drivers ({activeDetails.drivers.length})</span>
                  <div className="tw">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-rose-50/50 border-b border-lt-red-bd/20 text-[9.5px] font-bold text-lt-muted uppercase tracking-wider">
                          <th className="py-2 px-3">Driver Name</th>
                          <th className="py-2 px-3">NIC / Passport</th>
                          <th className="py-2 px-3">Vehicle Plate Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-lt-red-bd/10 text-slate-700">
                        {activeDetails.drivers.map((d, idx) => (
                          <tr key={idx} className="hover:bg-rose-50/10">
                            <td className="py-2 px-3 font-semibold text-slate-900">{d.name}</td>
                            <td className="py-2 px-3 font-mono text-[11px]">{d.nic}</td>
                            <td className="py-2 px-3 whitespace-nowrap font-medium">{d.vehicle || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-lt-border bg-slate-50 text-right">
              <button 
                onClick={() => setActiveDetails(null)}
                className="btn btn-sm btn-ghost cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
