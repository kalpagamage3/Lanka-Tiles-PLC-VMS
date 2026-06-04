import React, { useState } from 'react';
import { 
  Users, 
  Trash2, 
  Edit, 
  FileSpreadsheet, 
  Download, 
  Settings, 
  RefreshCw,
  FolderOpen,
  CloudLightning,
  LogOut,
  Save
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Visitor, PreRegistration, Host, Zone, VMSConfig, AccessColor } from '../types';

interface AdminViewProps {
  visitors: Visitor[];
  preRegs: PreRegistration[];
  hosts: Host[];
  zones: Zone[];
  passTotals: Record<string, number>;
  onPassTotalsUpdate: (totals: Record<string, number>) => Promise<void>;
  onSingleHostAdd: (h: Host) => Promise<void>;
  onBulkHostsAdd: (hosts: Host[]) => Promise<void>;
  onHostUpdate: (oldName: string, h: Host) => Promise<void>;
  onHostDelete: (name: string) => Promise<void>;
  onSingleZoneAdd: (z: Zone) => Promise<void>;
  onBulkZonesAdd: (zones: Zone[]) => Promise<void>;
  onZoneUpdate: (oldName: string, z: Zone) => Promise<void>;
  onZoneDelete: (name: string) => Promise<void>;
  onVisitorDelete: (id: string) => Promise<void>;
  onVisitorUpdate: (id: string, updates: Partial<Visitor>) => Promise<void>;
  onForceCheckout: (id: string) => Promise<void>;
  onPreRegDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onPasswordUpdate: (pw: string) => Promise<void>;
  projectId: string;
  adminPw: string;
  showAlert?: (msg: string, title?: string) => void;
  showConfirm?: (msg: string, onConfirm: () => void, title?: string) => void;
}

export default function AdminView({
  visitors,
  preRegs,
  hosts,
  zones,
  passTotals,
  onPassTotalsUpdate,
  onSingleHostAdd,
  onBulkHostsAdd,
  onHostUpdate,
  onHostDelete,
  onSingleZoneAdd,
  onBulkZonesAdd,
  onZoneUpdate,
  onZoneDelete,
  onVisitorDelete,
  onVisitorUpdate,
  onForceCheckout,
  onPreRegDelete,
  onClearAll,
  onPasswordUpdate,
  projectId,
  adminPw,
  showAlert,
  showConfirm,
}: AdminViewProps) {
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
  // Authentication lock states
  const [unlocked, setUnlocked] = useState(false);
  const [enteredPw, setEnteredPw] = useState('');
  const [showError, setShowError] = useState(false);

  // Pass configuration states
  const [ptG, setPtG] = useState(passTotals.G || 0);
  const [ptY, setPtY] = useState(passTotals.Y || 0);
  const [ptA, setPtA] = useState(passTotals.A || 0);
  const [ptR, setPtR] = useState(passTotals.R || 0);

  // Single Host states
  const [hnName, setHnName] = useState('');
  const [hnDesig, setHnDesig] = useState('');
  const [hnDept, setHnDept] = useState('');
  const [hnPhone, setHnPhone] = useState('');

  // Editing Host modal
  const [editHostOld, setEditHostOld] = useState<string | null>(null);
  const [ehName, setEhName] = useState('');
  const [ehDesig, setEhDesig] = useState('');
  const [ehDept, setEhDept] = useState('');
  const [ehPhone, setEhPhone] = useState('');

  // Single Zone states
  const [znName, setZnName] = useState('');
  const [znColor, setZnColor] = useState<AccessColor | "">('');

  // Editing Zone modal
  const [editZoneOld, setEditZoneOld] = useState<string | null>(null);
  const [ezName, setEzName] = useState('');
  const [ezColor, setEzColor] = useState<AccessColor>("green");

  // Editing Visitor modal
  const [editVisId, setEditVisId] = useState<string | null>(null);
  const [evName, setEvName] = useState('');
  const [evNic, setEvNic] = useState('');
  const [evPhone, setEvPhone] = useState('');
  const [evCompany, setEvCompany] = useState('');
  const [evPurpose, setEvPurpose] = useState('');
  const [evHost, setEvHost] = useState('');
  const [evVehicle, setEvVehicle] = useState('');

  // Password update states
  const [np1, setNp1] = useState('');
  const [np2, setNp2] = useState('');

  const handleLogin = () => {
    if (enteredPw === adminPw) {
      setUnlocked(true);
      setShowError(false);
    } else {
      setShowError(true);
    }
  };

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-slate-800">
        <div className="bg-white border border-lt-border rounded-xl shadow-md p-6 max-w-sm w-full border-t-3 border-lt-red text-center space-y-4">
          <h2 className="font-display font-extrabold text-sm text-lt-navy uppercase tracking-wider">Access Admin Panel</h2>
          <p className="text-xs text-lt-muted font-medium">Please enter your administrator password to unlock security and configuration panels.</p>
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] uppercase font-bold text-lt-muted tracking-wider">Password</label>
            <input 
              type="password" 
              className="inp text-xs p-2.5 h-10 w-full" 
              placeholder="••••••••" 
              value={enteredPw}
              onChange={e => setEnteredPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            {showError && <span className="text-[11px] font-semibold text-lt-red">Incorrect password. Please try again.</span>}
          </div>
          <button 
            type="button" 
            onClick={handleLogin}
            className="w-full btn btn-primary py-2.5 justify-center text-xs font-bold shadow-sm cursor-pointer"
          >
            Unlock Panel
          </button>
        </div>
      </div>
    );
  }

  // Host template download
  const downloadHostTemplate = () => {
    const data = [
      ['Name', 'Designation', 'Department', 'Contact'],
      ['Nimal Jayawardena', 'Factory Manager', 'Production', '0771234567'],
      ['Dilani Fernando', 'HR Officer', 'Human Resources', '0779876543']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(wb, 'host_template.xlsx');
  };

  // Host excel parsing
  const handleHostExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;
    const f = files[0];
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];

        if (!raw.length) return alert('Spreadsheet empty.');
        const keys = Object.keys(raw[0]);
        const nc = keys.find(c => /^name$/i.test(c.trim())) || keys[0];
        const dc = keys.find(c => /^desig|title/i.test(c.trim())) || keys[1] || '';
        const dp = keys.find(c => /^dept|dep/i.test(c.trim())) || keys[2] || '';
        const ph = keys.find(c => /^contact|phone|mob/i.test(c.trim())) || keys[3] || '';

        const roster = raw.map(r => ({
          name: String(r[nc] || '').trim(),
          designation: String(r[dc] || '').trim(),
          dept: String(r[dp] || '').trim(),
          phone: String(r[ph] || '').trim()
        })).filter(h => h.name && h.designation);

        if (!roster.length) return alert('No valid records parsed. Roster requires both Name and Designation columns.');
        await onBulkHostsAdd(roster);
        alert(`Successfully imported ${roster.length} hosts.`);
      } catch (err: any) {
        alert('Roster import failed: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  // Zone excel template
  const downloadZoneTemplate = () => {
    const data = [
      ['Zone Name', 'Colour'],
      ['HR Office', 'green'],
      ['Power Station', 'red'],
      ['Engineering Desk', 'amber']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Zones');
    XLSX.writeFile(wb, 'zone_template.xlsx');
  };

  // Zone excel parsing
  const handleZoneExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;
    const f = files[0];
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];

        if (!raw.length) return alert('Empty file.');
        const keys = Object.keys(raw[0]);
        const nc = keys.find(c => /^zone/i.test(c.trim())) || keys[0];
        const cc = keys.find(c => /^colou?r/i.test(c.trim())) || keys[1] || '';

        const valid: AccessColor[] = ['green', 'yellow', 'amber', 'red'];
        const bulk = raw.map(r => ({
          name: String(r[nc] || '').trim(),
          color: String(r[cc] || '').trim().toLowerCase() as AccessColor
        })).filter(z => z.name && valid.includes(z.color));

        if (!bulk.length) return alert('No valid records. Columns must match "Zone Name" and "Colour" (green/yellow/amber/red).');
        await onBulkZonesAdd(bulk);
        alert(`Successfully imported ${bulk.length} zones.`);
      } catch (err: any) {
        alert('Failed: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  // Add Single Host event
  const handleHostAddSubmit = async () => {
    if (!hnName.trim() || !hnDesig.trim()) return alert('Name and Designation are required.');
    try {
      await onSingleHostAdd({
        name: hnName.trim(),
        designation: hnDesig.trim(),
        dept: hnDept.trim(),
        phone: hnPhone.trim()
      });
      setHnName('');
      setHnDesig('');
      setHnDept('');
      setHnPhone('');
      alert('Host added.');
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  };

  // Save Edit Host
  const handleHostEditSubmit = async () => {
    if (!editHostOld || !ehName.trim() || !ehDesig.trim()) return;
    try {
      await onHostUpdate(editHostOld, {
        name: ehName.trim(),
        designation: ehDesig.trim(),
        dept: ehDept.trim(),
        phone: ehPhone.trim()
      });
      setEditHostOld(null);
      alert('Host updated.');
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  };

  // Single Zone Add
  const handleZoneAddSubmit = async () => {
    if (!znName.trim() || !znColor) return alert('Name and Colour required.');
    try {
      await onSingleZoneAdd({
        name: znName.trim(),
        color: znColor
      });
      setZnName('');
      setZnColor('');
      alert('Zone registered.');
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  };

  // Save Edit Zone
  const handleZoneEditSubmit = async () => {
    if (!editZoneOld || !ezName.trim()) return;
    try {
      await onZoneUpdate(editZoneOld, {
        name: ezName.trim(),
        color: ezColor
      });
      setEditZoneOld(null);
      alert('Zone updated.');
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  };

  // Change Admin Password
  const handlePassUpdate = async () => {
    if (!np1 || np1 !== np2) return alert('Passwords do not match.');
    try {
      await onPasswordUpdate(np1);
      setNp1('');
      setNp2('');
      alert('Password updated successfully.');
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  };

  // Visitor edit triggers
  const triggerEditVisitor = (v: Visitor) => {
    setEditVisId(v.id);
    setEvName(v.name);
    setEvNic(v.nic);
    setEvPhone(v.phone);
    setEvCompany(v.company);
    setEvPurpose(v.purpose);
    setEvHost(v.hostName);
    setEvVehicle(v.vehicle);
  };

  const handleVisitorEditSubmit = async () => {
    if (!editVisId) return;
    try {
      await onVisitorUpdate(editVisId, {
        name: evName.trim(),
        nic: evNic.trim(),
        phone: evPhone.trim(),
        company: evCompany.trim(),
        purpose: evPurpose.trim(),
        hostName: evHost.trim(),
        vehicle: evVehicle.trim()
      });
      setEditVisId(null);
      alert('Visitor updated.');
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
  };

  // Master Exports
  const getExportRows = () => {
    return [...visitors].reverse().map(v => [
      v.id,
      v.name,
      v.nic,
      v.phone || '',
      v.company || '',
      v.purpose || '',
      v.isGroup ? 'Group' : 'Individual',
      v.groupCount || 1,
      v.hostName,
      v.hostDesignation || '',
      v.hostDept || '',
      v.hostPhone || '',
      v.pass,
      v.color,
      v.zones.join('; '),
      v.vehicle || '',
      (v.drivers || []).map(d => `${d.name}/${d.nic}${d.vehicle ? ' ' + d.vehicle : ''}`).join('; '),
      v.photoAllowed ? 'Allowed' : 'Prohibited',
      v.checkIn ? new Date(v.checkIn).toLocaleString('en-US') : '',
      v.checkOut ? new Date(v.checkOut).toLocaleString('en-US') : '',
      v.status
    ]);
  };

  const exportExcel = () => {
    const hdrs = ['ID', 'Name', 'NIC/Passport', 'Contact', 'Company', 'Purpose', 'Type', 'People', 'Host', 'Designation', 'Department', 'Host Contact', 'Pass', 'Colour', 'Zones', 'Vehicle', 'Drivers', 'Photo/Video', 'Check In', 'Check Out', 'Status'];
    const ws = XLSX.utils.aoa_to_sheet([hdrs, ...getExportRows()]);
    const wb = XLSX.utils.book_new();
    
    // adjust widths
    ws['!cols'] = hdrs.map((_, i) => ({
      wch: [6, 22, 16, 13, 18, 18, 11, 7, 22, 20, 16, 13, 8, 10, 35, 13, 30, 18, 20, 20, 10][i] || 14
    }));

    XLSX.utils.book_append_sheet(wb, ws, 'Visitor Log');
    XLSX.writeFile(wb, `Lanka_Tiles_Visitor_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportCSV = () => {
    const hdrs = ['ID', 'Name', 'NIC/Passport', 'Contact', 'Company', 'Purpose', 'Type', 'People', 'Host', 'Designation', 'Department', 'Host Contact', 'Pass', 'Colour', 'Zones', 'Vehicle', 'Drivers', 'Photo/Video', 'Check In', 'Check Out', 'Status'];
    const csvContent = [hdrs, ...getExportRows().map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`))]
      .map(r => r.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Lanka_Tiles_Visitor_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onSite = visitors.filter(v => v.status === 'in');

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-lt-border">
        <h1 className="font-display text-2xl font-extrabold text-lt-navy">VMS Administration</h1>
        <p className="text-xs text-lt-muted font-medium mt-1">Configure physical limits, upload host and zone registries, and export logs</p>
      </div>

      {/* Real-time Status Card */}
      <div className="bg-white border border-lt-border rounded-xl p-5 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Sync Connection</div>
          <div className="text-sm font-bold text-lt-navy flex items-center gap-1.5"><CloudLightning size={16} className="text-emerald-500" /> Firebase Engine Online</div>
          <div className="text-xs text-slate-500">Project Workspace ID: <b>{projectId}</b></div>
        </div>
        <div className="text-xs font-semibold text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-lg flex items-center gap-1.5 leading-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow"></span>
          Real-time Sync Active
        </div>
      </div>

      {/* Pass Limits Configuration */}
      <div className="bg-white border border-lt-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-lt-border bg-gray-50/50 flex items-center justify-between">
          <span className="font-display font-bold text-xs text-lt-navy uppercase tracking-wider">Pass Pool Limits</span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-lt-muted leading-relaxed">Modify total physical pass cards available per zone color code. Available count on the dashboard automatically decreases as cards are check-in assigned.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">🟢 Green Passes</label>
              <input type="number" min="0" className="inp p-2 max-w-sm" value={ptG} onChange={e => setPtG(Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">🟡 Yellow Passes</label>
              <input type="number" min="0" className="inp p-2 max-w-sm" value={ptY} onChange={e => setPtY(Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">🟠 Amber Passes</label>
              <input type="number" min="0" className="inp p-2 max-w-sm" value={ptA} onChange={e => setPtA(Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">🔴 Red Passes</label>
              <input type="number" min="0" className="inp p-2 max-w-sm" value={ptR} onChange={e => setPtR(Math.max(0, parseInt(e.target.value) || 0))} />
            </div>
          </div>
          <button onClick={() => onPassTotalsUpdate({ G: ptG, Y: ptY, A: ptA, R: ptR }).then(() => alert('Limits updated.'))} className="btn btn-primary btn-sm mt-2">💾 Update Limits</button>
        </div>
      </div>

      {/* Host Directory Configuration */}
      <div className="bg-white border border-lt-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-lt-border bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="font-display font-bold text-xs text-lt-navy uppercase tracking-wider">Employee Hosts Directory ({hosts.length})</span>
          <div className="flex gap-2">
            <button onClick={downloadHostTemplate} className="btn btn-ghost btn-xs text-[10.5px] font-bold"><Download size={11} /> Template</button>
            <label className="btn btn-ghost btn-xs text-[10.5px] font-bold cursor-pointer">
              <FileSpreadsheet size={11} /> Roster Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleHostExcel} />
            </label>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="border border-lt-border rounded-xl p-4 bg-slate-50/55 space-y-3">
            <div className="text-[11px] font-extrabold text-lt-navy uppercase tracking-wider">Add New Host</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="flex flex-col gap-1"><label className="text-[9.5px] font-bold text-lt-muted uppercase">Name *</label><input type="text" className="inp text-xs p-2" value={hnName} onChange={e => setHnName(e.target.value)} /></div>
              <div className="flex flex-col gap-1"><label className="text-[9.5px] font-bold text-lt-muted uppercase">Designation *</label><input type="text" className="inp text-xs p-2" value={hnDesig} onChange={e => setHnDesig(e.target.value)} /></div>
              <div className="flex flex-col gap-1"><label className="text-[9.5px] font-bold text-lt-muted uppercase">Department</label><input type="text" className="inp text-xs p-2" value={hnDept} onChange={e => setHnDept(e.target.value)} /></div>
              <div className="flex flex-col gap-1"><label className="text-[9.5px] font-bold text-lt-muted uppercase">Contact No.</label><input type="text" className="inp text-xs p-2" value={hnPhone} onChange={e => setHnPhone(e.target.value)} /></div>
            </div>
            <button onClick={handleHostAddSubmit} className="btn btn-navy btn-sm mt-1">+ Register Host</button>
          </div>

          <div className="tw max-h-60 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100/50 border-b border-lt-border text-[9.5px] font-bold text-lt-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Designation</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lt-border text-slate-700">
                {hosts.map(h => (
                  <tr key={h.name} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{h.name}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">{h.designation}</td>
                    <td className="py-2.5 px-3 text-slate-500">{h.dept || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{h.phone || '—'}</td>
                    <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                      <button 
                        onClick={() => {
                          setEditHostOld(h.name);
                          setEhName(h.name);
                          setEhDesig(h.designation);
                          setEhDept(h.dept || '');
                          setEhPhone(h.phone || '');
                        }}
                        className="p-1 text-slate-500 hover:text-lt-navy border border-slate-200 hover:border-lt-navy/20 bg-slate-50 rounded-sm cursor-pointer"
                      >
                        <Edit size={11} />
                      </button>
                      <button 
                        onClick={() => confirm(`Are you sure you want to delete host "${h.name}"?`, () => onHostDelete(h.name).then(() => alert('Deleted.')))}
                        className="p-1 text-lt-red hover:text-lt-red-dk border border-slate-200 hover:border-lt-red-bd bg-slate-50 rounded-sm cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Custom Zones Management */}
      <div className="bg-white border border-lt-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-lt-border bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="font-display font-bold text-xs text-lt-navy uppercase tracking-wider">Access Zones and Security Colours ({zones.length})</span>
          <div className="flex gap-2">
            <button onClick={downloadZoneTemplate} className="btn btn-ghost btn-xs text-[10.5px] font-bold"><Download size={11} /> Template</button>
            <label className="btn btn-ghost btn-xs text-[10.5px] font-bold cursor-pointer">
              <FileSpreadsheet size={11} /> Zones Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleZoneExcel} />
            </label>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="border border-lt-border rounded-xl p-4 bg-slate-50/55 space-y-3">
            <div className="text-[11px] font-extrabold text-lt-navy uppercase tracking-wider">Add Single Zone</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[9.5px] font-bold text-lt-muted uppercase">Zone Name *</label>
                <input type="text" className="inp text-xs p-2" placeholder="e.g. Grinding Room" value={znName} onChange={e => setZnName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9.5px] font-bold text-lt-muted uppercase">Access Colour Level *</label>
                <select className="inp text-xs px-2 h-10 cursor-pointer" value={znColor} onChange={e => setZnColor(e.target.value as AccessColor)}>
                  <option value="">Select Colour…</option>
                  <option value="green">🟢 Green (Low)</option>
                  <option value="yellow">🟡 Yellow (Medium)</option>
                  <option value="amber">🟠 Amber (High)</option>
                  <option value="red">🔴 Red (Critical)</option>
                </select>
              </div>
              <button onClick={handleZoneAddSubmit} className="btn btn-navy btn-sm">+ Register Zone</button>
            </div>
          </div>

          <div className="tw max-h-60 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100/50 border-b border-lt-border text-[9.5px] font-bold text-lt-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3">Zone Title</th>
                  <th className="py-2.5 px-3">Risk Color Code</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lt-border text-slate-700">
                {zones.map(z => (
                  <tr key={z.name} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{z.name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold bg-${z.color}-500/10 text-${z.color}-700 border border-${z.color}-500/20 px-2.5 py-0.5 rounded-full`}>
                        <span className={`w-1.5 h-1.5 rounded-full bg-${z.color}-500`}></span>
                        {z.color.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                      <button 
                        onClick={() => {
                          setEditZoneOld(z.name);
                          setEzName(z.name);
                          setEzColor(z.color);
                        }}
                        className="p-1 text-slate-500 hover:text-lt-navy border border-slate-200 hover:border-lt-navy/20 bg-slate-50 rounded-sm cursor-pointer"
                      >
                        <Edit size={11} />
                      </button>
                      <button 
                        onClick={() => confirm(`Are you sure you want to delete zone "${z.name}"?`, () => onZoneDelete(z.name).then(() => alert('Deleted.')))}
                        className="p-1 text-lt-red hover:text-lt-red-dk border border-slate-200 hover:border-lt-red-bd bg-slate-50 rounded-sm cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Active on Site Override */}
      <div className="bg-white border border-lt-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-lt-border bg-gray-50/50">
          <span className="font-display font-bold text-xs text-lt-navy uppercase tracking-wider">Active Guest Operations</span>
        </div>
        <div className="p-5">
          <div className="tw max-h-56 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 border-b border-lt-border text-[9.5px] font-bold text-lt-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">NIC</th>
                  <th className="py-2.5 px-3">Pass</th>
                  <th className="py-2.5 px-3">Host</th>
                  <th className="py-2.5 px-3">Check In</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lt-border text-slate-700 font-medium">
                {onSite.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-6 text-slate-400">No active visitors on site</td></tr>
                ) : (
                  onSite.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-900 font-bold">{v.name}</td>
                      <td className="py-2.5 px-3 font-mono">{v.nic}</td>
                      <td className="py-2.5 px-3 font-bold text-[11px]">{v.pass}</td>
                      <td className="py-2.5 px-3 text-slate-600">{v.hostName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{new Date(v.checkIn).toLocaleTimeString()}</td>
                      <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                        <button onClick={() => triggerEditVisitor(v)} className="btn btn-xs btn-ghost py-0.5 px-2">Edit</button>
                        <button onClick={() => confirm(`Are you sure you want to force checkout "${v.name}"?`, () => onForceCheckout(v.id).then(() => alert('Checked out.')))} className="btn btn-xs btn-danger py-0.5 px-2">Force Out</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Purges & Exports */}
      <div className="bg-white border border-lt-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-lt-border bg-gray-50/50">
          <span className="font-display font-bold text-xs text-lt-navy uppercase tracking-wider">Exports and Clear Data</span>
        </div>
        <div className="p-5">
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={exportExcel} className="btn btn-success btn-sm"><FileSpreadsheet size={13} /> Export Excel Log</button>
            <button onClick={exportCSV} className="btn btn-ghost btn-sm"><Download size={13} /> Export CSV Log</button>
            <button onClick={() => confirm("WARNING: This will permanently delete ALL visitor records, host employees, authorised zones, and metrics! This cannot be undone. Are you absolutely sure?", () => onClearAll().then(() => alert("All database states successfully purged.")))} className="btn btn-danger btn-sm ml-auto">⚠️ Purge All DB Records</button>
          </div>
        </div>
      </div>

      {/* Admin general settings password update */}
      <div className="bg-white border border-lt-border rounded-xl shadow-xs overflow-hidden max-w-md">
        <div className="px-5 py-4 border-b border-lt-border bg-gray-50/50">
          <span className="font-display font-bold text-xs text-lt-navy uppercase tracking-wider">Change Admin Password</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-lt-muted uppercase">New Password</label>
            <input type="password" className="inp" id="np1" value={np1} onChange={e => setNp1(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-lt-muted uppercase">Confirm Password</label>
            <input type="password" className="inp" id="np2" value={np2} onChange={e => setNp2(e.target.value)} />
          </div>
          <button onClick={handlePassUpdate} className="btn btn-primary btn-sm">Update Password</button>
        </div>
      </div>

      {/* Edit Host Modal */}
      {editHostOld && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border-t-3 border-lt-red">
            <div className="px-5 py-4 border-b border-lt-border flex items-center justify-between">
              <span className="font-display font-bold text-xs text-lt-navy uppercase">Edit Host</span>
              <button onClick={() => setEditHostOld(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="fgrp"><label className="lbl">Name</label><input className="inp" value={ehName} onChange={e => setEhName(e.target.value)} /></div>
              <div className="fgrp"><label className="lbl">Designation</label><input className="inp" value={ehDesig} onChange={e => setEhDesig(e.target.value)} /></div>
              <div className="fgrp"><label className="lbl">Department</label><input className="inp" value={ehDept} onChange={e => setEhDept(e.target.value)} /></div>
              <div className="fgrp"><label className="lbl">Contact Phone</label><input className="inp" value={ehPhone} onChange={e => setEhPhone(e.target.value)} /></div>
              <button onClick={handleHostEditSubmit} className="btn btn-primary w-full justify-center py-2.5 mt-2">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Zone Modal */}
      {editZoneOld && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border-t-3 border-lt-red">
            <div className="px-5 py-4 border-b border-lt-border flex items-center justify-between">
              <span className="font-display font-bold text-xs text-lt-navy uppercase">Edit Zone</span>
              <button onClick={() => setEditZoneOld(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="fgrp"><label className="lbl">Zone Name</label><input className="inp" value={ezName} onChange={e => setEzName(e.target.value)} /></div>
              <div className="fgrp">
                <label className="lbl">Colour Code</label>
                <select className="inp cursor-pointer h-10" value={ezColor} onChange={e => setEzColor(e.target.value as AccessColor)}>
                  <option value="green">🟢 Green</option>
                  <option value="yellow">🟡 Yellow</option>
                  <option value="amber">🟠 Amber</option>
                  <option value="red">🔴 Red</option>
                </select>
              </div>
              <button onClick={handleZoneEditSubmit} className="btn btn-primary w-full justify-center py-2.5 mt-2">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Visitor Modal */}
      {editVisId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border-t-3 border-lt-red max-h-[92vh]">
            <div className="px-5 py-4 border-b border-lt-border flex items-center justify-between">
              <span className="font-display font-bold text-xs text-lt-navy uppercase">Edit Active Visitor</span>
              <button onClick={() => setEditVisId(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="fgrp"><label className="lbl">Visitor Name</label><input className="inp" value={evName} onChange={e => setEvName(e.target.value)} /></div>
              <div className="fgrp"><label className="lbl">NIC / Passport</label><input className="inp" value={evNic} onChange={e => setEvNic(e.target.value)} /></div>
              <div className="fgrp"><label className="lbl">Phone Contact</label><input className="inp" value={evPhone} onChange={e => setEvPhone(e.target.value)} /></div>
              <div className="fgrp"><label className="lbl">Company</label><input className="inp" value={evCompany} onChange={e => setEvCompany(e.target.value)} /></div>
              <div className="fgrp"><label className="lbl">Visit Purpose</label><input className="inp" value={evPurpose} onChange={e => setEvPurpose(e.target.value)} /></div>
              <div className="fgrp"><label className="lbl">Host Employee Name</label><input className="inp" value={evHost} onChange={e => setEvHost(e.target.value)} /></div>
              <div className="fgrp"><label className="lbl">Vehicle Plate No.</label><input className="inp" value={evVehicle} onChange={e => setEvVehicle(e.target.value)} /></div>
              <button onClick={handleVisitorEditSubmit} className="btn btn-primary w-full justify-center py-2.5 mt-2">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
