import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Visitor, PreRegistration, Host, Zone, VMSConfig } from './types';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: Required for Enterprise/Standard selection */
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

// ── LOCAL STORAGE ENGINE FALLBACK ──────────────────────────────────────────
export let dbMode: 'firebase' | 'local' = 'firebase';

export let dbModeListeners: ((mode: 'firebase' | 'local') => void)[] = [];
export function subscribeDbMode(cb: (mode: 'firebase' | 'local') => void) {
  dbModeListeners.push(cb);
  cb(dbMode);
  return () => {
    dbModeListeners = dbModeListeners.filter(x => x !== cb);
  };
}

export function setDbMode(mode: 'firebase' | 'local') {
  if (dbMode !== mode) {
    dbMode = mode;
    dbModeListeners.forEach(cb => cb(mode));
  }
}

const defaultZones: Zone[] = [
  { name: 'HR', color: 'green' },
  { name: 'Accounts', color: 'green' },
  { name: 'TPM', color: 'yellow' },
  { name: 'Factory office', color: 'yellow' },
  { name: 'Stores', color: 'amber' },
  { name: 'Engineering', color: 'amber' },
  { name: 'Special Projects', color: 'amber' },
  { name: 'Lab', color: 'amber' },
  { name: 'Powder preparation', color: 'red' },
  { name: 'Press - Glazing Lines', color: 'red' },
  { name: 'Glaze Preparation', color: 'red' },
  { name: 'Sorting', color: 'red' },
  { name: 'Mosaic', color: 'red' },
  { name: 'Polishing', color: 'red' }
];

const defaultHosts: Host[] = [
  { name: 'Nimal Jayawardena', designation: 'Factory Manager', dept: 'Production', phone: '0771234567' },
  { name: 'Dilani Fernando', designation: 'HR Officer', dept: 'Human Resources', phone: '0779876543' },
  { name: 'Kanishka Silva', designation: 'Chemist', dept: 'R&D Lab', phone: '0711122334' },
  { name: 'Pradeep Perera', designation: 'Lead Engineer', dept: 'Management Office', phone: '0722233445' }
];

const defaultConfig: VMSConfig = {
  adminPw: 'lanka2026',
  idSeq: 1,
  prSeq: 1,
  passTotals: { G: 10, Y: 10, A: 10, R: 10 }
};

const getLocalData = <T>(key: string, def: T): T => {
  try {
    const val = localStorage.getItem(`vms_${key}`);
    return val ? JSON.parse(val) : def;
  } catch {
    return def;
  }
};

const setLocalData = <T>(key: string, data: T) => {
  try {
    localStorage.setItem(`vms_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
};

// Event callback registries for local mode
const listeners: {
  config: ((cfg: VMSConfig) => void)[];
  zones: ((zns: Zone[]) => void)[];
  hosts: ((hsts: Host[]) => void)[];
  preRegs: ((prs: PreRegistration[]) => void)[];
  visitors: ((vsts: Visitor[]) => void)[];
} = {
  config: [],
  zones: [],
  hosts: [],
  preRegs: [],
  visitors: []
};

export function dispatchConfig() {
  const data = getLocalData('config', defaultConfig);
  listeners.config.forEach(cb => cb(data));
}
export function dispatchZones() {
  const data = getLocalData('zones', defaultZones);
  listeners.zones.forEach(cb => cb(data));
}
export function dispatchHosts() {
  const data = getLocalData('hosts', defaultHosts);
  listeners.hosts.forEach(cb => cb(data));
}
export function dispatchPreRegs() {
  const data = getLocalData('preRegs', [] as PreRegistration[]);
  listeners.preRegs.forEach(cb => cb(data));
}
export function dispatchVisitors() {
  const data = getLocalData('visitors', [] as Visitor[]);
  listeners.visitors.forEach(cb => cb(data));
}

export function switchToLocalMode() {
  if (dbMode === 'local') return;
  console.warn('[VMS Fallback] Activating high-performance browser LocalStorage database mode.');
  setDbMode('local');
  dispatchConfig();
  dispatchZones();
  dispatchHosts();
  dispatchPreRegs();
  dispatchVisitors();
}

// Global error handler: log to console then activate local mode trigger instead of throwing fatal code exception
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.warn('[VMS Firebase Error] Firestore warning registered:', JSON.stringify(errInfo));
  switchToLocalMode();
}

// Connection check on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    console.warn("[VMS Firebase Connection] Client cannot hit server. Activating local cache mode.", error);
    switchToLocalMode();
  }
}

testConnection();

// Auto-seed default database state if it is completely fresh
export async function ensureDefaultData() {
  if (dbMode === 'local') {
    // Seed locally if empty
    if (!localStorage.getItem('vms_config')) setLocalData('config', defaultConfig);
    if (!localStorage.getItem('vms_zones')) setLocalData('zones', defaultZones);
    if (!localStorage.getItem('vms_hosts')) setLocalData('hosts', defaultHosts);
    return;
  }
  
  try {
    // 1. Seed default Config
    const configDocRef = doc(db, 'config', 'app_config');
    const configSnap = await getDoc(configDocRef);
    if (!configSnap.exists()) {
      await setDoc(configDocRef, defaultConfig);
      console.log('[Firebase] Seeded default app settings config.');
    }

    // 2. Seed default Zones
    const zonesColRef = collection(db, 'zones');
    const zonesSnap = await getDocs(zonesColRef);
    if (zonesSnap.empty) {
      for (const zone of defaultZones) {
        await setDoc(doc(zonesColRef, zone.name), zone);
      }
      console.log('[Firebase] Seeded default color-coded zones.');
    }

    // 3. Seed sample Hosts if empty
    const hostsColRef = collection(db, 'hosts');
    const hostsSnap = await getDocs(hostsColRef);
    if (hostsSnap.empty) {
      for (const host of defaultHosts) {
        await setDoc(doc(hostsColRef, host.name), host);
      }
      console.log('[Firebase] Seeded default host directory.');
    }
  } catch (error) {
    console.warn('[VMS] Seeding warning. Switching to Local fallback.', error);
    switchToLocalMode();
  }
}

// Database mutations wrapper helpers for App components to call
export const fdb = {
  // Config
  subscribeConfig(onUpdate: (config: VMSConfig) => void, onError?: (err: any) => void) {
    listeners.config.push(onUpdate);
    onUpdate(getLocalData('config', defaultConfig));

    let unsubFirebase: (() => void) | null = null;
    if (dbMode === 'firebase') {
      unsubFirebase = onSnapshot(doc(db, 'config', 'app_config'), (snap) => {
        if (snap.exists() && dbMode === 'firebase') {
          onUpdate(snap.data() as VMSConfig);
        }
      }, (err) => {
        if (onError) onError(err);
        console.warn('[VMS] Config subscription error, enabling local fallback.', err);
        switchToLocalMode();
      });
    }

    return () => {
      listeners.config = listeners.config.filter(cb => cb !== onUpdate);
      if (unsubFirebase) unsubFirebase();
    };
  },
  async updateConfig(changes: Partial<VMSConfig>) {
    if (dbMode === 'local') {
      const current = getLocalData('config', defaultConfig);
      const updated = { ...current, ...changes };
      setLocalData('config', updated);
      dispatchConfig();
      return;
    }
    const path = 'config/app_config';
    try {
      await updateDoc(doc(db, 'config', 'app_config'), changes);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  // Zones
  subscribeZones(onUpdate: (zones: Zone[]) => void, onError?: (err: any) => void) {
    listeners.zones.push(onUpdate);
    onUpdate(getLocalData('zones', defaultZones));

    let unsubFirebase: (() => void) | null = null;
    if (dbMode === 'firebase') {
      unsubFirebase = onSnapshot(collection(db, 'zones'), (snap) => {
        if (dbMode === 'firebase') {
          const arr: Zone[] = [];
          snap.forEach(d => arr.push(d.data() as Zone));
          onUpdate(arr);
        }
      }, (err) => {
        if (onError) onError(err);
        console.warn('[VMS] Zones subscription error, enabling local fallback.', err);
        switchToLocalMode();
      });
    }

    return () => {
      listeners.zones = listeners.zones.filter(cb => cb !== onUpdate);
      if (unsubFirebase) unsubFirebase();
    };
  },
  async addZone(zone: Zone) {
    if (dbMode === 'local') {
      const current = getLocalData('zones', defaultZones);
      const updated = current.filter(z => z.name !== zone.name);
      updated.push(zone);
      setLocalData('zones', updated);
      dispatchZones();
      return;
    }
    const path = `zones/${zone.name}`;
    try {
      await setDoc(doc(db, 'zones', zone.name), zone);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },
  async deleteZone(name: string) {
    if (dbMode === 'local') {
      const current = getLocalData('zones', defaultZones);
      const updated = current.filter(z => z.name !== name);
      setLocalData('zones', updated);
      dispatchZones();
      return;
    }
    const path = `zones/${name}`;
    try {
      await deleteDoc(doc(db, 'zones', name));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Hosts
  subscribeHosts(onUpdate: (hosts: Host[]) => void, onError?: (err: any) => void) {
    listeners.hosts.push(onUpdate);
    onUpdate(getLocalData('hosts', defaultHosts));

    let unsubFirebase: (() => void) | null = null;
    if (dbMode === 'firebase') {
      unsubFirebase = onSnapshot(collection(db, 'hosts'), (snap) => {
        if (dbMode === 'firebase') {
          const arr: Host[] = [];
          snap.forEach(d => arr.push(d.data() as Host));
          onUpdate(arr);
        }
      }, (err) => {
        if (onError) onError(err);
        console.warn('[VMS] Hosts subscription error, enabling local fallback.', err);
        switchToLocalMode();
      });
    }

    return () => {
      listeners.hosts = listeners.hosts.filter(cb => cb !== onUpdate);
      if (unsubFirebase) unsubFirebase();
    };
  },
  async addHost(host: Host) {
    if (dbMode === 'local') {
      const current = getLocalData('hosts', defaultHosts);
      const updated = current.filter(h => h.name !== host.name);
      updated.push(host);
      setLocalData('hosts', updated);
      dispatchHosts();
      return;
    }
    const path = `hosts/${host.name}`;
    try {
      await setDoc(doc(db, 'hosts', host.name), host);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },
  async deleteHost(name: string) {
    if (dbMode === 'local') {
      const current = getLocalData('hosts', defaultHosts);
      const updated = current.filter(h => h.name !== name);
      setLocalData('hosts', updated);
      dispatchHosts();
      return;
    }
    const path = `hosts/${name}`;
    try {
      await deleteDoc(doc(db, 'hosts', name));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Pre-Registrations
  subscribePreRegs(onUpdate: (prereg: PreRegistration[]) => void, onError?: (err: any) => void) {
    listeners.preRegs.push(onUpdate);
    onUpdate(getLocalData('preRegs', [] as PreRegistration[]));

    let unsubFirebase: (() => void) | null = null;
    if (dbMode === 'firebase') {
      unsubFirebase = onSnapshot(collection(db, 'preRegs'), (snap) => {
        if (dbMode === 'firebase') {
          const arr: PreRegistration[] = [];
          snap.forEach(d => arr.push(d.data() as PreRegistration));
          onUpdate(arr);
        }
      }, (err) => {
        if (onError) onError(err);
        console.warn('[VMS] PreRegs subscription error, enabling local fallback.', err);
        switchToLocalMode();
      });
    }

    return () => {
      listeners.preRegs = listeners.preRegs.filter(cb => cb !== onUpdate);
      if (unsubFirebase) unsubFirebase();
    };
  },
  async addPreReg(pr: PreRegistration) {
    if (dbMode === 'local') {
      const current = getLocalData('preRegs', [] as PreRegistration[]);
      const updated = current.filter(item => item.id !== pr.id);
      updated.push(pr);
      setLocalData('preRegs', updated);
      dispatchPreRegs();
      return;
    }
    const path = `preRegs/${pr.id}`;
    try {
      await setDoc(doc(db, 'preRegs', pr.id), pr);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },
  async updatePreRegStatus(id: string, status: "pending" | "checked-in" | "cancelled", visitorId?: string | null) {
    if (dbMode === 'local') {
      const current = getLocalData('preRegs', [] as PreRegistration[]);
      const updated = current.map(item => {
        if (item.id === id) {
          const newItem = { ...item, status };
          if (visitorId !== undefined) newItem.visitorId = visitorId;
          return newItem;
        }
        return item;
      });
      setLocalData('preRegs', updated);
      dispatchPreRegs();
      return;
    }
    const path = `preRegs/${id}`;
    try {
      const updateData: any = { status };
      if (visitorId !== undefined) updateData.visitorId = visitorId;
      await updateDoc(doc(db, 'preRegs', id), updateData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },
  async updatePreReg(id: string, updates: Partial<PreRegistration>) {
    if (dbMode === 'local') {
      const current = getLocalData('preRegs', [] as PreRegistration[]);
      const updated = current.map(item => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      });
      setLocalData('preRegs', updated);
      dispatchPreRegs();
      return;
    }
    const path = `preRegs/${id}`;
    try {
      await updateDoc(doc(db, 'preRegs', id), updates as any);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },
  async deletePreReg(id: string) {
    if (dbMode === 'local') {
      const current = getLocalData('preRegs', [] as PreRegistration[]);
      const updated = current.filter(item => item.id !== id);
      setLocalData('preRegs', updated);
      dispatchPreRegs();
      return;
    }
    const path = `preRegs/${id}`;
    try {
      await deleteDoc(doc(db, 'preRegs', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Visitors
  subscribeVisitors(onUpdate: (visitors: Visitor[]) => void, onError?: (err: any) => void) {
    listeners.visitors.push(onUpdate);
    onUpdate(getLocalData('visitors', [] as Visitor[]));

    let unsubFirebase: (() => void) | null = null;
    if (dbMode === 'firebase') {
      unsubFirebase = onSnapshot(collection(db, 'visitors'), (snap) => {
        if (dbMode === 'firebase') {
          const arr: Visitor[] = [];
          snap.forEach(d => arr.push(d.data() as Visitor));
          onUpdate(arr);
        }
      }, (err) => {
        if (onError) onError(err);
        console.warn('[VMS] Visitors subscription error, enabling local fallback.', err);
        switchToLocalMode();
      });
    }

    return () => {
      listeners.visitors = listeners.visitors.filter(cb => cb !== onUpdate);
      if (unsubFirebase) unsubFirebase();
    };
  },
  async addVisitor(v: Visitor) {
    if (dbMode === 'local') {
      const current = getLocalData('visitors', [] as Visitor[]);
      const updated = current.filter(item => item.id !== v.id);
      updated.push(v);
      setLocalData('visitors', updated);
      dispatchVisitors();
      return;
    }
    const path = `visitors/${v.id}`;
    try {
      await setDoc(doc(db, 'visitors', v.id), v);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },
  async checkoutVisitor(id: string, checkOutTime: string) {
    if (dbMode === 'local') {
      const current = getLocalData('visitors', [] as Visitor[]);
      const updated = current.map(item => {
        if (item.id === id) {
          return { ...item, status: 'out' as const, checkOut: checkOutTime };
        }
        return item;
      });
      setLocalData('visitors', updated);
      dispatchVisitors();
      return;
    }
    const path = `visitors/${id}`;
    try {
      await updateDoc(doc(db, 'visitors', id), {
        status: 'out',
        checkOut: checkOutTime
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },
  async updateVisitorDetails(id: string, updates: Partial<Visitor>) {
    if (dbMode === 'local') {
      const current = getLocalData('visitors', [] as Visitor[]);
      const updated = current.map(item => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      });
      setLocalData('visitors', updated);
      dispatchVisitors();
      return;
    }
    const path = `visitors/${id}`;
    try {
      await updateDoc(doc(db, 'visitors', id), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },
  async deleteVisitor(id: string) {
    if (dbMode === 'local') {
      const current = getLocalData('visitors', [] as Visitor[]);
      const updated = current.filter(item => item.id !== id);
      setLocalData('visitors', updated);
      dispatchVisitors();
      return;
    }
    const path = `visitors/${id}`;
    try {
      await deleteDoc(doc(db, 'visitors', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Clear All
  async clearAll() {
    if (dbMode === 'local') {
      setLocalData('visitors', []);
      setLocalData('preRegs', []);
      const resetConfig = {
        adminPw: 'lanka2026',
        idSeq: 1,
        prSeq: 1,
        passTotals: { G: 10, Y: 10, A: 10, R: 10 }
      };
      setLocalData('config', resetConfig);
      dispatchVisitors();
      dispatchPreRegs();
      dispatchConfig();
      return;
    }
    try {
      const visitorsCol = await getDocs(collection(db, 'visitors'));
      for (const d of visitorsCol.docs) {
        await deleteDoc(d.ref);
      }
      const preRegsCol = await getDocs(collection(db, 'preRegs'));
      for (const d of preRegsCol.docs) {
        await deleteDoc(d.ref);
      }
      await setDoc(doc(db, 'config', 'app_config'), {
        adminPw: 'lanka2026',
        idSeq: 1,
        prSeq: 1,
        passTotals: { G: 10, Y: 10, A: 10, R: 10 }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'multiple');
    }
  }
};
