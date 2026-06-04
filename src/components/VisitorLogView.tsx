import { useState } from 'react';
import { Search, LogOut } from 'lucide-react';
import { Visitor } from '../types';

interface VisitorLogViewProps {
  visitors: Visitor[];
  onCheckout: (id: string) => void;
}

export default function VisitorLogView({
  visitors,
  onCheckout
}: VisitorLogViewProps) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');

  const getPassChipClass = (pass: string) => {
    const code = pass ? pass.charAt(0) : '';
    const color = { G: 'green', Y: 'yellow', A: 'amber', R: 'red' }[code] || 'gray';
    if (color === 'green') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (color === 'yellow') return 'bg-amber-50 text-amber-800 border-amber-200';
    if (color === 'amber') return 'bg-orange-50 text-orange-850 border-orange-200';
    if (color === 'red') return 'bg-rose-50 text-rose-800 border-rose-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + 
           date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const filteredHistory = [...visitors]
    .reverse() // latest first
    .filter(v => {
      const matchQuery = q.trim().toLowerCase();
      if (!matchQuery) return true;
      return (
        v.name.toLowerCase().includes(matchQuery) ||
        v.nic.toLowerCase().includes(matchQuery) ||
        (v.company || '').toLowerCase().includes(matchQuery) ||
        v.hostName.toLowerCase().includes(matchQuery) ||
        v.pass.toLowerCase().includes(matchQuery) ||
        (v.purpose || '').toLowerCase().includes(matchQuery)
      );
    })
    .filter(v => {
      if (filter === 'all') return true;
      return v.status === filter;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-lt-border">
        <h1 className="font-display text-2xl font-extrabold text-lt-navy">Visitor Log</h1>
        <p className="text-xs text-lt-muted font-medium mt-1">Audit trail of all walk-ins and pre-registered guest check-ins</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 no-pointer-events">
            <Search size={14} />
          </span>
          <input 
            type="text" 
            placeholder="Search visitor, NIC, company, card..."
            className="inp text-xs pl-9 p-2.5 w-full bg-white border border-lt-border rounded-lg"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto self-start sm:self-center">
          {(['all', 'in', 'out'] as const).map(f => {
            const count = f === 'all' 
              ? visitors.length 
              : visitors.filter(v => v.status === f).length;
            return (
              <button
                key={f}
                type="button"
                className={`
                  px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer whitespace-nowrap
                  ${filter === f 
                    ? 'bg-lt-navy text-white border-lt-navy shadow-sm' 
                    : 'bg-white text-slate-600 border-lt-border hover:bg-slate-50'
                  }
                `}
                onClick={() => setFilter(f)}
              >
                {{ all: 'All Records', in: 'On Site', out: 'Departed' }[f]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-lt-border rounded-xl shadow-xs overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-16 text-lt-muted text-xs p-6">
            No visitor matches found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/50 border-b border-lt-border uppercase tracking-widest text-[9px] font-bold text-lt-muted">
                  <th className="py-3 px-4">Visitor / Group Name</th>
                  <th className="py-3 px-4">NIC / Passport</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-2 text-center">📷</th>
                  <th className="py-3 px-4">Host Employee</th>
                  <th className="py-3 px-4 text-center">Pass</th>
                  <th className="py-3 px-4">Zones</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lt-border text-slate-700 font-medium">
                {filteredHistory.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{v.name}</div>
                      {v.isGroup && (
                        <span className="inline-flex items-center text-[8.5px] font-black uppercase bg-lt-navy text-white px-1.5 py-0.5 rounded-xs mt-0.5">
                          Group (×{v.groupCount})
                        </span>
                      )}
                      {v.drivers && v.drivers.length > 0 && (
                        <span className="inline-flex items-center text-[8.5px] font-black uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-xs mt-0.5 ml-1">
                          🚗 Drivers (×{v.drivers.length})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[11px]">{v.nic}</td>
                    <td className="py-3 px-4 text-slate-500">{v.company || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-28 whitespace-normal leading-relaxed">{v.purpose || '—'}</td>
                    <td className="py-3 px-2 text-center text-xs">
                      {v.photoAllowed ? (
                        <span className="text-emerald-600 font-bold">✓</span>
                      ) : (
                        <span className="text-rose-500 font-bold">✕</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{v.hostName}</div>
                      <div className="text-[10px] text-lt-muted font-semibold">{v.hostDesignation}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9.5px] font-extrabold border ${getPassChipClass(v.pass)}`}>
                        {v.pass}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[10.5px] text-slate-500 max-w-28 whitespace-normal font-semibold leading-relaxed">
                      {v.zones.join(', ')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">{formatDateTime(v.checkIn)}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">{formatDateTime(v.checkOut)}</td>
                    <td className="py-3 px-4">
                      {v.status === 'in' ? (
                        <span className="inline-flex items-center gap-1 font-extrabold text-[11px] text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                          On Site
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Departed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {v.status === 'in' && (
                        <button
                          onClick={() => onCheckout(v.id)}
                          className="p-1 bg-rose-50 hover:bg-rose-100 text-lt-red border border-rose-200 rounded-md cursor-pointer transition-colors shadow-3xs"
                          title="Checkout"
                        >
                          <LogOut size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
