import { 
  LayoutDashboard, 
  ClipboardCheck, 
  LogIn, 
  History, 
  SlidersHorizontal 
} from 'lucide-react';
import { PreRegistration, Visitor } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  visitors: Visitor[];
  preRegs: PreRegistration[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  visitors,
  preRegs,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const onSiteCount = visitors.filter(v => v.status === 'in').length;
  const pendingCount = preRegs.filter(p => p.status === 'pending').length;

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'prereg', name: 'Pre-Registration', icon: ClipboardCheck, badge: pendingCount },
    { id: 'checkin', name: 'Check In', icon: LogIn },
    { id: 'log', name: 'Visitor Log', icon: History },
    { id: 'admin', name: 'Admin Panel', icon: SlidersHorizontal },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity" 
          onClick={onCloseMobile} 
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 w-64 bg-lt-navy-dk text-white flex flex-col z-50
        transition-transform duration-200 md:translate-x-0 border-r border-white/10 shadow-xl
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-5 bg-lt-navy border-b-3 border-lt-red">
          <div className="font-display text-sm font-extrabold tracking-wider uppercase leading-none">Lanka Tiles</div>
          <div className="text-[10px] text-white/50 tracking-wider font-semibold uppercase mt-1">Visitor Management</div>
          <div className="w-8 h-[2px] bg-lt-red mt-2 rounded-xs" />
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  onCloseMobile();
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-semibold
                  transition-all duration-150 text-left cursor-pointer
                  ${isActive 
                    ? 'bg-lt-red/25 border-l-3 border-lt-red text-white' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                  }
                `}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-white/50'} />
                <span className="flex-1">{item.name}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-lt-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-5 text-center shadow-xs">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Live on-site count badge footer */}
        <div className="p-4 border-t border-white/10 bg-lt-navy-dk/50">
          <div className="flex items-center gap-2.5 bg-green-950/40 border border-green-800/30 rounded-md py-2 px-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11.5px] font-bold text-emerald-300 tracking-wide uppercase">
              {onSiteCount} {onSiteCount === 1 ? 'person' : 'people'} on site
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
