import { Calendar, AlertTriangle, Users, Ticket, CheckSquare } from 'lucide-react';
import { Visitor, PreRegistration, AccessColor } from '../types';

interface DashboardViewProps {
  visitors: Visitor[];
  preRegs: PreRegistration[];
  passTotals: Record<string, number>;
  onCheckout: (id: string) => void;
}

export default function DashboardView({
  visitors,
  preRegs,
  passTotals,
  onCheckout,
}: DashboardViewProps) {
  const onSite = visitors.filter(v => v.status === 'in');
  
  // Date operations
  const today = new Date().toDateString();
  const todayCheckIns = visitors.filter(v => new Date(v.checkIn).toDateString() === today);
  const pendingCount = preRegs.filter(p => p.status === 'pending').length;
  const totalOnSitePeople = onSite.reduce((sum, v) => sum + (v.groupCount || 1), 0);

  // Pass configuration maps
  const colors: AccessColor[] = ["green", "yellow", "amber", "red"];
  const colorLabels: Record<string, string> = {
    G: "Green Zone",
    Y: "Yellow Zone",
    A: "Amber Zone",
    R: "Red Zone",
  };
  const colorClasses: Record<AccessColor, { bg: string; text: string; border: string; labelBg: string }> = {
    green: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', labelBg: 'bg-emerald-500' },
    yellow: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', labelBg: 'bg-amber-500' },
    amber: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', labelBg: 'bg-orange-500' },
    red: { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20', labelBg: 'bg-rose-500' },
  };

  const getPassChipClass = (pass: string) => {
    const code = pass ? pass.charAt(0) : '';
    const color = { G: 'green', Y: 'yellow', A: 'amber', R: 'red' }[code] || 'gray';
    if (color === 'green') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (color === 'yellow') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (color === 'amber') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (color === 'red') return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="space-y-6">
      {/* Header section with real date */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-lt-border gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-lt-navy">Dashboard</h1>
          <p className="text-xs text-lt-muted font-medium mt-1">Real-time occupancy supervision and active passes count</p>
        </div>
        <div className="flex items-center gap-2.5 bg-white border border-lt-border rounded-lg py-2 px-4 shadow-xs self-start">
          <Calendar size={15} className="text-lt-red" />
          <span className="text-xs font-bold text-lt-navy font-display">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Statistics Section Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-lt-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-lt-navy/5 text-lt-navy rounded-lg"><Ticket size={24} /></div>
          <div>
            <div className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Active Passes</div>
            <div className="text-2xl font-extrabold text-lt-navy">{onSite.length}</div>
            <div className="text-[11px] text-lt-muted font-medium mt-0.5">currently on site</div>
          </div>
        </div>

        <div className="bg-white border border-lt-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-lt-navy/5 text-lt-navy rounded-lg"><Users size={24} /></div>
          <div>
            <div className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Total People</div>
            <div className="text-2xl font-extrabold text-lt-navy">{totalOnSitePeople}</div>
            <div className="text-[11px] text-lt-muted font-medium mt-0.5">incl. group members</div>
          </div>
        </div>

        <div className="bg-white border border-lt-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-lt-red rounded-lg"><AlertTriangle size={24} /></div>
          <div>
            <div className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Awaiting Arrival</div>
            <div className="text-2xl font-extrabold text-lt-red">{pendingCount}</div>
            <div className="text-[11px] text-lt-muted font-medium mt-0.5">pre-registered today</div>
          </div>
        </div>

        <div className="bg-white border border-lt-border rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckSquare size={24} /></div>
          <div>
            <div className="text-[10px] font-bold text-lt-muted uppercase tracking-wider">Today's Check-ins</div>
            <div className="text-2xl font-extrabold text-lt-navy">{todayCheckIns.length}</div>
            <div className="text-[11px] text-lt-muted font-medium mt-0.5">since midnight</div>
          </div>
        </div>
      </div>

      {/* Color Pass Availability Grids */}
      <div>
        <h2 className="text-[11px] font-extrabold text-lt-navy uppercase tracking-wider mb-3">Live Card Inventory</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {colors.map(color => {
            const pfx = { green: 'G', yellow: 'Y', amber: 'A', red: 'R' }[color];
            const cls = colorClasses[color];
            const total = passTotals[pfx] || 0;
            const inUse = onSite.filter(v => v.pass && v.pass.charAt(0) === pfx).length;
            const available = total > 0 ? Math.max(0, total - inUse) : null;

            return (
              <div 
                key={color} 
                className={`border rounded-xl p-4 shadow-2xs transition-all ${cls.bg} ${cls.border}`}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-[10px] font-extrabold uppercase tracking-widest ${cls.text}`}>{colorLabels[pfx]}</div>
                  <div className={`w-2.5 h-2.5 rounded-full ${cls.labelBg}`} />
                </div>
                <div className={`text-3xl font-extrabold font-display mt-2 ${cls.text}`}>
                  {available !== null ? available : '—'}
                </div>
                <div className={`text-[11px] mt-1 font-semibold ${cls.text} opacity-80`}>
                  {available !== null ? `${inUse} in use / ${total} total` : 'Add limits in Admin'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Currently on site table */}
      <div className="bg-white border border-lt-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-lt-border flex items-center justify-between bg-gray-50/50">
          <span className="font-display font-bold text-xs text-lt-navy uppercase tracking-wider">
            Active Passes Currently On Site ({onSite.length})
          </span>
        </div>

        {onSite.length === 0 ? (
          <div className="text-center py-12 text-lt-muted flex flex-col items-center justify-center p-6">
            <Users size={32} className="opacity-35 mb-2.5 text-lt-navy" />
            <p className="text-sm font-semibold text-lt-navy">No active visitors</p>
            <p className="text-xs text-lt-muted mt-0.5">There are no visitors checked in at the moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/50 border-b border-lt-border uppercase tracking-widest text-[9.5px] font-bold text-lt-muted">
                  <th className="py-3 px-4">Visitor / Group Name</th>
                  <th className="py-3 px-4">NIC / Passport</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Host Employee</th>
                  <th className="py-3 px-4">Pass</th>
                  <th className="py-3 px-4">Allowed Zones</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lt-border font-medium text-slate-700">
                {onSite.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{v.name}</div>
                      {v.isGroup && (
                        <span className="inline-flex items-center text-[9px] font-extrabold uppercase bg-lt-navy text-white px-2 py-0.5 rounded-sm mt-1">
                          Group (×{v.groupCount})
                        </span>
                      )}
                      {v.drivers && v.drivers.length > 0 && (
                        <span className="inline-flex items-center text-[9px] font-extrabold uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded-sm mt-1 ml-1.5">
                          🚗 Drivers (×{v.drivers.length})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">{v.nic}</td>
                    <td className="py-3 px-4 text-slate-500">{v.company || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{v.hostName}</div>
                      <div className="text-[10px] text-lt-muted">{v.hostDesignation} {v.hostDept ? `(${v.hostDept})` : ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPassChipClass(v.pass)}`}>
                        {v.pass}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 max-w-44 whitespace-normal leading-relaxed">
                      {v.zones.join(', ')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {formatTime(v.checkIn)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => onCheckout(v.id)}
                        className="btn btn-xs bg-lt-red hover:bg-lt-red-dk text-white font-bold py-1 px-3 rounded-md cursor-pointer transition-colors shadow-2xs"
                      >
                        {v.isGroup ? 'Group Out' : 'Check Out'}
                      </button>
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
