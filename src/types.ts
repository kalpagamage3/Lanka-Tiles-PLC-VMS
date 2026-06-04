/**
 * Lanka Tiles VMS Domain types
 */

export type AccessColor = "green" | "yellow" | "amber" | "red";

export interface Member {
  name: string;
  nic: string;
  phone?: string;
  company?: string;
  purpose?: string;
  vehicle?: string;
  zones?: string[];
  hostName?: string;
  isLeader?: boolean;
}

export interface Driver {
  name: string;
  nic: string;
  vehicle?: string;
}

export interface PreRegistration {
  id: string;
  type: "individual" | "group";
  status: "pending" | "checked-in" | "cancelled";
  submittedAt: string;
  photoAllowed: boolean;
  members: Member[];
  drivers?: Driver[];
  visitorId?: string | null;
}

export interface Visitor {
  id: string;
  prId: string | null;
  name: string;
  nic: string;
  phone: string;
  company: string;
  purpose: string;
  hostName: string;
  hostDesignation: string;
  hostDept: string;
  hostPhone: string;
  vehicle: string;
  zones: string[];
  color: AccessColor;
  pass: string;
  isGroup: boolean;
  groupCount: number;
  groupMembers: { name: string; nic: string; company: string; }[];
  drivers: Driver[];
  photoAllowed: boolean;
  status: "in" | "out";
  checkIn: string;
  checkOut: string | null;
}

export interface Host {
  name: string;
  designation: string;
  dept?: string;
  phone?: string;
}

export interface Zone {
  name: string;
  color: AccessColor;
}

export interface VMSConfig {
  passTotals: Record<string, number>;
  adminPw: string;
  idSeq: number;
  prSeq: number;
}
