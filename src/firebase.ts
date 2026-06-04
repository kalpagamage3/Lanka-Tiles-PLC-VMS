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

// Global error handler to wrap Firestore permission issues with relevant debug information
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. You appear to be offline.");
    }
  }
}

testConnection();

// Auto-seed default database state if it is completely fresh
export async function ensureDefaultData() {
  try {
    // 1. Seed default Config
    const configDocRef = doc(db, 'config', 'app_config');
    const configSnap = await getDoc(configDocRef);
    if (!configSnap.exists()) {
      const defaultConfig: VMSConfig = {
        adminPw: 'lanka2026',
        idSeq: 1,
        prSeq: 1,
        passTotals: { G: 10, Y: 10, A: 10, R: 10 }
      };
      await setDoc(configDocRef, defaultConfig);
      console.log('[Firebase] Seeded default app settings config.');
    }

    // 2. Seed default Zones
    const zonesColRef = collection(db, 'zones');
    const zonesSnap = await getDocs(zonesColRef);
    if (zonesSnap.empty) {
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
      for (const zone of defaultZones) {
        await setDoc(doc(zonesColRef, zone.name), zone);
      }
      console.log('[Firebase] Seeded default color-coded zones.');
    }

    // 3. Seed sample Hosts if empty
    const hostsColRef = collection(db, 'hosts');
    const hostsSnap = await getDocs(hostsColRef);
    if (hostsSnap.empty) {
      const defaultHosts: Host[] = [
        { name: 'Nimal Jayawardena', designation: 'Factory Manager', dept: 'Production', phone: '0771234567' },
        { name: 'Dilani Fernando', designation: 'HR Officer', dept: 'Human Resources', phone: '0779876543' },
        { name: 'Kanishka Silva', designation: 'Chemist', dept: 'R&D Lab', phone: '0711122334' },
        { name: 'Pradeep Perera', designation: 'Lead Engineer', dept: 'Management Office', phone: '0722233445' }
      ];
      for (const host of defaultHosts) {
        await setDoc(doc(hostsColRef, host.name), host);
      }
      console.log('[Firebase] Seeded default host directory.');
    }
  } catch (error) {
    console.error('Failed to seed default data:', error);
  }
}

// Database mutations wrapper helpers for App components to call
export const fdb = {
  // Config
  subscribeConfig(onUpdate: (config: VMSConfig) => void, onError?: (err: any) => void) {
    return onSnapshot(doc(db, 'config', 'app_config'), (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as VMSConfig);
      }
    }, (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, 'config/app_config');
    });
  },
  async updateConfig(changes: Partial<VMSConfig>) {
    const path = 'config/app_config';
    try {
      await updateDoc(doc(db, 'config', 'app_config'), changes);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  // Zones
  subscribeZones(onUpdate: (zones: Zone[]) => void, onError?: (err: any) => void) {
    return onSnapshot(collection(db, 'zones'), (snap) => {
      const arr: Zone[] = [];
      snap.forEach(d => arr.push(d.data() as Zone));
      onUpdate(arr);
    }, (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, 'zones');
    });
  },
  async addZone(zone: Zone) {
    const path = `zones/${zone.name}`;
    try {
      await setDoc(doc(db, 'zones', zone.name), zone);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },
  async deleteZone(name: string) {
    const path = `zones/${name}`;
    try {
      await deleteDoc(doc(db, 'zones', name));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Hosts
  subscribeHosts(onUpdate: (hosts: Host[]) => void, onError?: (err: any) => void) {
    return onSnapshot(collection(db, 'hosts'), (snap) => {
      const arr: Host[] = [];
      snap.forEach(d => arr.push(d.data() as Host));
      onUpdate(arr);
    }, (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, 'hosts');
    });
  },
  async addHost(host: Host) {
    const path = `hosts/${host.name}`;
    try {
      await setDoc(doc(db, 'hosts', host.name), host);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },
  async deleteHost(name: string) {
    const path = `hosts/${name}`;
    try {
      await deleteDoc(doc(db, 'hosts', name));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Pre-Registrations
  subscribePreRegs(onUpdate: (prereg: PreRegistration[]) => void, onError?: (err: any) => void) {
    return onSnapshot(collection(db, 'preRegs'), (snap) => {
      const arr: PreRegistration[] = [];
      snap.forEach(d => arr.push(d.data() as PreRegistration));
      onUpdate(arr);
    }, (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, 'preRegs');
    });
  },
  async addPreReg(pr: PreRegistration) {
    const path = `preRegs/${pr.id}`;
    try {
      await setDoc(doc(db, 'preRegs', pr.id), pr);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },
  async updatePreRegStatus(id: string, status: "pending" | "checked-in" | "cancelled", visitorId?: string | null) {
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
    const path = `preRegs/${id}`;
    try {
      await updateDoc(doc(db, 'preRegs', id), updates as any);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },
  async deletePreReg(id: string) {
    const path = `preRegs/${id}`;
    try {
      await deleteDoc(doc(db, 'preRegs', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Visitors
  subscribeVisitors(onUpdate: (visitors: Visitor[]) => void, onError?: (err: any) => void) {
    return onSnapshot(collection(db, 'visitors'), (snap) => {
      const arr: Visitor[] = [];
      snap.forEach(d => arr.push(d.data() as Visitor));
      onUpdate(arr);
    }, (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, 'visitors');
    });
  },
  async addVisitor(v: Visitor) {
    const path = `visitors/${v.id}`;
    try {
      await setDoc(doc(db, 'visitors', v.id), v);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },
  async checkoutVisitor(id: string, checkOutTime: string) {
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
    const path = `visitors/${id}`;
    try {
      await updateDoc(doc(db, 'visitors', id), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },
  async deleteVisitor(id: string) {
    const path = `visitors/${id}`;
    try {
      await deleteDoc(doc(db, 'visitors', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Clear All
  async clearAll() {
    try {
      // Clear visitors
      const visitorsCol = await getDocs(collection(db, 'visitors'));
      for (const d of visitorsCol.docs) {
        await deleteDoc(d.ref);
      }
      // Clear preRegs
      const preRegsCol = await getDocs(collection(db, 'preRegs'));
      for (const d of preRegsCol.docs) {
        await deleteDoc(d.ref);
      }
      // Reset sequences also
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
