import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { signInAnonymously } from 'firebase/auth';
import { auth, fdb, ensureDefaultData, dbMode, subscribeDbMode, switchToLocalMode } from './firebase';
import { Visitor, PreRegistration, Host, Zone, VMSConfig, Member, AccessColor } from './types';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import PreRegistrationView from './components/PreRegistrationView';
import CheckInView from './components/CheckInView';
import VisitorLogView from './components/VisitorLogView';
import AdminView from './components/AdminView';

export default function App() {
  const [view, setView] = useState<string>('dashboard');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [preRegs, setPreRegs] = useState<PreRegistration[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [config, setConfig] = useState<VMSConfig | null>(null);
  
  const [authReady, setAuthReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [currentDbMode, setCurrentDbMode] = useState<'firebase' | 'local'>('firebase');

  // Dialog/Modal Overlays State
  const [customAlert, setCustomAlert] = useState<{ message: string; title?: string } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{ message: string; onConfirm: () => void; title?: string } | null>(null);

  const showAlert = (message: string, title?: string) => {
    setCustomAlert({ message, title });
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string) => {
    setCustomConfirm({
      message,
      onConfirm: () => {
        onConfirm();
        setCustomConfirm(null);
      },
      title
    });
  };

  // Listen to DB Mode changes
  useEffect(() => {
    return subscribeDbMode((m) => {
      setCurrentDbMode(m);
    });
  }, []);

  // 1. Initialise Anonymous Auth and default data seed
  useEffect(() => {
    async function initApp() {
      try {
        // Attempt anonymous sign-in, but proceed unauthenticated if disabled on Firebase console
        await signInAnonymously(auth);
      } catch (err) {
        console.warn('[VMS] Anonymous authentication is disabled or restricted in Firebase: continuing unauthenticated.', err);
      } finally {
        setAuthReady(true);
        try {
          // Always try to seed and verify databases
          await ensureDefaultData();
        } catch (seedErr) {
          console.error('[VMS] Database seeding failed:', seedErr);
        }
      }
    }
    initApp();

    // Setup an automatic backup timeout of 2.0 seconds to prevent stuck loading loop on unconfigured domains
    const timeoutTimer = setTimeout(() => {
      if (!dataLoaded || !config) {
        console.warn('[VMS Load Timeout] Cloud connection slow or restricted. Seamlessly activated local fallback.');
        switchToLocalMode();
      }
    }, 2000);

    return () => clearTimeout(timeoutTimer);
  }, [dataLoaded, config]);

  // 2. Setup real-time Firestore listeners once auth is active
  useEffect(() => {
    if (!authReady) return;

    const unsubConfig = fdb.subscribeConfig(
      (cfg) => setConfig(cfg),
      (err) => console.error('Subscription error config:', err)
    );
    const unsubZones = fdb.subscribeZones(
      (zns) => setZones(zns),
      (err) => console.error('Subscription error zones:', err)
    );
    const unsubHosts = fdb.subscribeHosts(
      (hsts) => setHosts(hsts),
      (err) => console.error('Subscription error hosts:', err)
    );
    const unsubPreRegs = fdb.subscribePreRegs(
      (prs) => setPreRegs(prs),
      (err) => console.error('Subscription error prereg:', err)
    );
    const unsubVisitors = fdb.subscribeVisitors(
      (vsts) => {
        setVisitors(vsts);
        setDataLoaded(true);
      },
      (err) => console.error('Subscription error visitors:', err)
    );

    return () => {
      unsubConfig();
      unsubZones();
      unsubHosts();
      unsubPreRegs();
      unsubVisitors();
    };
  }, [authReady]);

  // Compute card allocation pools (Totals minus currently active on-site cards)
  const getPassPool = (): Record<string, string[]> => {
    const defaultPools: Record<string, string[]> = { G: [], Y: [], A: [], R: [] };
    if (!config) return defaultPools;

    const onSitePasses = visitors.filter(v => v.status === 'in').map(v => v.pass);

    ['G', 'Y', 'A', 'R'].forEach(pfx => {
      const max = config.passTotals[pfx] || 0;
      const pool: string[] = [];
      for (let i = 1; i <= max; i++) {
        const passcode = pfx + String(i).padStart(2, '0');
        if (!onSitePasses.includes(passcode)) {
          pool.push(passcode);
        }
      }
      defaultPools[pfx] = pool;
    });

    return defaultPools;
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

  // ── Database Action wrappers ──────────────────────────────────────────────
  const handlePreRegSubmit = async (prData: Omit<PreRegistration, 'id' | 'submittedAt'>) => {
    if (!config) return;
    const nextPrSeq = config.prSeq;
    const prId = 'PR' + String(nextPrSeq).padStart(4, '0');
    const newPr: PreRegistration = {
      ...prData,
      id: prId,
      submittedAt: new Date().toISOString()
    };
    await fdb.addPreReg(newPr);
    await fdb.updateConfig({ prSeq: nextPrSeq + 1 });
  };

  const handleCancelPreReg = async (id: string) => {
    await fdb.updatePreRegStatus(id, 'cancelled');
  };

  const handleAbsentMember = async (prId: string, memberNic: string) => {
    const pr = preRegs.find(p => p.id === prId);
    if (!pr) return;
    const updatedMembers = pr.members.filter(m => m.nic.toLowerCase() !== memberNic.toLowerCase());
    await fdb.updatePreReg(prId, { members: updatedMembers });
  };

  const handleCheckinPreReg = async (id: string, filteredMembers?: Member[]): Promise<Visitor> => {
    if (!config) throw new Error('App configuration is currently synchronising...');
    const pr = preRegs.find(p => p.id === id);
    if (!pr) throw new Error('Pre-Registration record not found.');

    const activeMembers = filteredMembers || pr.members;
    const leader = activeMembers.find(m => m.isLeader) || activeMembers[0];
    const color = getHighestColor(leader.zones || []);
    
    // allocate pass
    const pfx = { green: 'G', yellow: 'Y', amber: 'A', red: 'R' }[color];
    const pool = getPassPool()[pfx] || [];
    let passCode = '';
    if (pool.length > 0) {
      passCode = pool[0];
    } else {
      // expand pool manually if max limit is reached
      const currentMax = config.passTotals[pfx] || 0;
      await fdb.updateConfig({
        passTotals: {
          ...config.passTotals,
          [pfx]: currentMax + 1
        }
      });
      passCode = pfx + String(currentMax + 1).padStart(2, '0');
    }

    const host = hosts.find(h => h.name === leader.hostName) || { name: leader.hostName, designation: 'Guest Host' };
    const nextId = config.idSeq;
    const visitorRecord: Visitor = {
      id: String(nextId),
      prId: pr.id,
      name: leader.name,
      nic: leader.nic,
      phone: leader.phone || '',
      company: leader.company || '',
      purpose: leader.purpose || '',
      hostName: host.name,
      hostDesignation: host.designation,
      hostDept: host.dept || '',
      hostPhone: host.phone || '',
      vehicle: leader.vehicle || '',
      zones: leader.zones || [],
      color,
      pass: passCode,
      isGroup: pr.type === 'group',
      groupCount: activeMembers.length,
      groupMembers: pr.type === 'group' 
        ? activeMembers.map(m => ({ name: m.name, nic: m.nic, company: m.company || '' }))
        : [],
      drivers: pr.drivers || [],
      photoAllowed: pr.photoAllowed,
      status: 'in',
      checkIn: new Date().toISOString(),
      checkOut: null
    };

    await fdb.addVisitor(visitorRecord);
    await fdb.updatePreRegStatus(pr.id, 'checked-in', visitorRecord.id);
    await fdb.updateConfig({ idSeq: nextId + 1 });
    return visitorRecord;
  };

  const handleWalkinCheckinSubmit = async (wiData: any): Promise<Visitor> => {
    if (!config) throw new Error('App configuration is currently synchronising...');
    const color = getHighestColor(wiData.zones);
    
    // allocate pass
    const pfx = { green: 'G', yellow: 'Y', amber: 'A', red: 'R' }[color];
    const pool = getPassPool()[pfx] || [];
    let passCode = '';
    if (pool.length > 0) {
      passCode = pool[0];
    } else {
      const currentMax = config.passTotals[pfx] || 0;
      await fdb.updateConfig({
        passTotals: {
          ...config.passTotals,
          [pfx]: currentMax + 1
        }
      });
      passCode = pfx + String(currentMax + 1).padStart(2, '0');
    }

    const host = hosts.find(h => h.name === wiData.hostName) || { name: wiData.hostName, designation: 'Guest Host' };
    const nextId = config.idSeq;
    const visitorRecord: Visitor = {
      id: String(nextId),
      prId: null,
      name: wiData.name,
      nic: wiData.nic,
      phone: wiData.phone,
      company: wiData.company || '',
      purpose: wiData.purpose || '',
      hostName: host.name,
      hostDesignation: host.designation,
      hostDept: host.dept || '',
      hostPhone: host.phone || '',
      vehicle: wiData.vehicle || '',
      zones: wiData.zones,
      color,
      pass: passCode,
      isGroup: false,
      groupCount: 1,
      groupMembers: [],
      drivers: wiData.drivers || [],
      photoAllowed: wiData.photoAllowed,
      status: 'in',
      checkIn: new Date().toISOString(),
      checkOut: null
    };

    await fdb.addVisitor(visitorRecord);
    await fdb.updateConfig({ idSeq: nextId + 1 });
    return visitorRecord;
  };

  const handleCheckout = (id: string) => {
    const v = visitors.find(x => x.id === id);
    if (!v) return;
    showConfirm(
      v.isGroup 
        ? `Are you sure you want to checkout the full group of ${v.groupCount} delegates from the site? All allocated passes will be returned.` 
        : `Are you sure you want to checkout visitor "${v.name}"? This returns pass card "${v.pass}".`,
      async () => {
        try {
          await fdb.checkoutVisitor(id, new Date().toISOString());
          if (v.prId) {
            await fdb.updatePreRegStatus(v.prId, 'checked-in');
          }
          showAlert(`Successfully checked out ${v.name}.`, "Departure Complete");
        } catch (e: any) {
          showAlert(`Checkout failed: ${e.message}`, "Error");
        }
      },
      "Confirm Guest Departure"
    );
  };

  const handleSingleHostAdd = async (h: Host) => {
    await fdb.addHost(h);
  };

  const handleBulkHostsAdd = async (list: Host[]) => {
    for (const h of list) {
      await fdb.addHost(h);
    }
  };

  const handleHostUpdate = async (oldName: string, h: Host) => {
    if (oldName !== h.name) {
      await fdb.deleteHost(oldName);
    }
    await fdb.addHost(h);
  };

  const handleHostDelete = async (name: string) => {
    await fdb.deleteHost(name);
  };

  const handleSingleZoneAdd = async (z: Zone) => {
    await fdb.addZone(z);
  };

  const handleBulkZonesAdd = async (list: Zone[]) => {
    for (const z of list) {
      await fdb.addZone(z);
    }
  };

  const handleZoneUpdate = async (oldName: string, z: Zone) => {
    if (oldName !== z.name) {
      await fdb.deleteZone(oldName);
    }
    await fdb.addZone(z);
  };

  const handleZoneDelete = async (name: string) => {
    await fdb.deleteZone(name);
  };

  const handleVisitorDelete = async (id: string) => {
    showConfirm('Permanently delete this check-in record? This cannot be undone and is highly destructive.', async () => {
      try {
        await fdb.deleteVisitor(id);
        showAlert('Check-in record has been successfully deleted.', 'Status');
      } catch (err: any) {
        showAlert('Delete failed: ' + err.message, 'Error');
      }
    }, 'Confirm Deletion');
  };

  const handleVisitorUpdate = async (id: string, updates: Partial<Visitor>) => {
    await fdb.updateVisitorDetails(id, updates);
  };

  const handleForceCheckout = async (id: string) => {
    await fdb.checkoutVisitor(id, new Date().toISOString());
  };

  const handlePreRegDelete = async (id: string) => {
    showConfirm(`Permanently delete pre-registration record ${id}?`, async () => {
      try {
        await fdb.deletePreReg(id);
        showAlert('Pre-registration record deleted successfully.', 'Status');
      } catch (err: any) {
        showAlert('Operation failed: ' + err.message, 'Error');
      }
    }, 'Confirm Delete');
  };

  const handleClearAll = async () => {
    await fdb.clearAll();
    showAlert('All records, history logs, and pre-registration archives have been cleared completely.', 'Database Cleared');
  };

  const handlePasswordUpdate = async (newPw: string) => {
    await fdb.updateConfig({ adminPw: newPw });
  };

  const handlePassTotalsUpdate = async (totals: Record<string, number>) => {
    await fdb.updateConfig({ passTotals: totals });
  };

  const handleAdminVerify = (pw: string): boolean => {
    if (config && pw === config.adminPw) {
      setAdminUnlocked(true);
      return true;
    }
    return false;
  };

  // Loading Screen
  if (!dataLoaded || !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-lt-red rounded-full animate-spin"></div>
        </div>
        <h2 className="font-display font-extrabold text-lg text-lt-navy tracking-tight">Lanka Tiles VMS</h2>
        <p className="text-xs text-lt-muted font-bold mt-1.5 uppercase tracking-widest animate-pulse-slow">Loading configurations &amp; syncing database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lt-bg flex flex-col">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-lt-navy-dk text-white h-14 flex items-center justify-between px-4 border-b border-white/10 shadow-md sticky top-0 z-40">
        <div className="font-display font-black text-sm tracking-wider uppercase">Lanka Tiles VMS</div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 px-2.5 bg-white/10 hover:bg-white/15 rounded-md border border-white/15 cursor-pointer"
        >
          <Menu size={18} />
        </button>
      </header>

      <div className="flex flex-1">
        {/* Navigation Sidebar Component */}
        <Sidebar 
          currentView={view}
          onViewChange={setView}
          visitors={visitors}
          preRegs={preRegs}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Primary Main Content Panel */}
        <main className="flex-1 md:ml-64 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-56px)] md:min-h-screen max-w-7xl mx-auto w-full">
          {currentDbMode === 'local' && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-800 p-3.5 px-4 rounded-xl flex items-center justify-between text-[11.5px] font-semibold gap-4 shadow-3xs animate-fade-in">
              <span className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span><strong>Operating in Local-Only Backup Mode</strong>. Your cloud domain could be unconfigured in the Firebase Console (authorized domains list). All features will persist securely inside local storage.</span>
              </span>
            </div>
          )}

          {view === 'dashboard' && (
            <DashboardView 
              visitors={visitors}
              preRegs={preRegs}
              passTotals={config.passTotals}
              onCheckout={handleCheckout}
            />
          )}

          {view === 'prereg' && (
            <PreRegistrationView 
              preRegs={preRegs}
              hosts={hosts}
              zones={zones}
              onSubmitPreReg={handlePreRegSubmit}
              onCancelPreReg={handleCancelPreReg}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}

          {view === 'checkin' && (
            <CheckInView 
              preRegs={preRegs}
              visitors={visitors}
              hosts={hosts}
              zones={zones}
              passPool={getPassPool()}
              passTotals={config.passTotals}
              onCheckinPreReg={handleCheckinPreReg}
              onWalkinCheckin={handleWalkinCheckinSubmit}
              onGrdRemoveMember={handleAbsentMember}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}

          {view === 'log' && (
            <VisitorLogView 
              visitors={visitors}
              onCheckout={handleCheckout}
            />
          )}

          {view === 'admin' && (
            <AdminView 
              visitors={visitors}
              preRegs={preRegs}
              hosts={hosts}
              zones={zones}
              passTotals={config.passTotals}
              onPassTotalsUpdate={handlePassTotalsUpdate}
              onSingleHostAdd={handleSingleHostAdd}
              onBulkHostsAdd={handleBulkHostsAdd}
              onHostUpdate={handleHostUpdate}
              onHostDelete={handleHostDelete}
              onSingleZoneAdd={handleSingleZoneAdd}
              onBulkZonesAdd={handleBulkZonesAdd}
              onZoneUpdate={handleZoneUpdate}
              onZoneDelete={handleZoneDelete}
              onVisitorDelete={handleVisitorDelete}
              onVisitorUpdate={handleVisitorUpdate}
              onForceCheckout={handleForceCheckout}
              onPreRegDelete={handlePreRegDelete}
              onClearAll={handleClearAll}
              onPasswordUpdate={handlePasswordUpdate}
              projectId={config.projectId || 'lanka-tiles-vms-project'}
              adminPw={config.adminPw}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}
        </main>
      </div>

      {/* Custom Alert Overlay */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs text-slate-800">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border-t-4 border-lt-navy">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="font-display font-black text-[11px] text-lt-navy uppercase tracking-wider">{customAlert.title || "Information"}</span>
              <button onClick={() => setCustomAlert(null)} className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer">&times;</button>
            </div>
            <div className="p-5 text-[12.5px] font-semibold text-slate-755 leading-relaxed">
              {customAlert.message}
            </div>
            <div className="px-4 py-3 bg-gray-55 border-t border-gray-155 text-right">
              <button onClick={() => setCustomAlert(null)} className="btn btn-navy btn-xs cursor-pointer px-5 py-1.5 font-bold rounded text-xs select-none shadow-3xs">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Overlay */}
      {customConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs text-slate-800">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border-t-4 border-lt-red">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="font-display font-black text-[11px] text-lt-navy uppercase tracking-wider">{customConfirm.title || "Request Confirmation"}</span>
              <button onClick={() => setCustomConfirm(null)} className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer">&times;</button>
            </div>
            <div className="p-5 text-[12.5px] font-semibold text-slate-755 leading-relaxed">
              {customConfirm.message}
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-right space-x-2">
              <button onClick={() => setCustomConfirm(null)} className="btn btn-ghost btn-xs text-xs font-bold px-4 py-1.5 rounded cursor-pointer select-none">Cancel</button>
              <button 
                onClick={() => {
                  customConfirm.onConfirm();
                }} 
                className="btn btn-primary bg-lt-red hover:bg-lt-red-dk btn-xs text-xs text-white font-black px-4.5 py-1.5 rounded cursor-pointer select-none shadow-3xs"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
