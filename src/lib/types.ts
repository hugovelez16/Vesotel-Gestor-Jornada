

import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  lastLogin: Timestamp;
  type: 'user_registry';
}

export interface UserSettings {
  userId: string;
  hourlyRate: number;
  dailyRate: number;
  coordinationRate: number;
  nightRate: number;
  isGross: boolean;
  firstName: string;
  lastName: string;
}

export type WorkLogType = 'particular' | 'tutorial';

export interface WorkLog {
  id: string;
  type: WorkLogType;
  date?: string; // YYYY-MM-DD for 'particular'
  startDate?: string; // YYYY-MM-DD for 'tutorial'
  endDate?: string; // YYYY-MM-DD for 'tutorial'
  startTime?: string; // HH:MM for 'particular'
  endTime?: string; // HH:MM for 'particular'
  duration?: number; // hours for 'particular'
  amount?: number; // calculated earnings
  rateApplied: number;
  isGrossCalculation: boolean;
  hasCoordination: boolean;
  hasNight: boolean;
  arrivesPrior: boolean;
  description: string;
  userId: string;
  createdAt: Timestamp;
}

export interface AccessRequest {
  id: string;
  email: string;
  firstName: string;
  lastName:string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export interface AllowedUser {
  id: string;
  email: string;
}

export interface VesotelUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  isAdmin: boolean;
  isAllowed: boolean;
}
