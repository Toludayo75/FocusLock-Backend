// Complete schema types for frontend - duplicated from backend to maintain independence

export type StrictLevel = 'SOFT' | 'MEDIUM' | 'HARD';
export type TaskStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
export type SessionStatus = 'PENDING' | 'LOCKED' | 'PROOF_REQUIRED' | 'UNLOCKED' | 'FAILED';

// User types
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  strictModeEnabled: boolean;
  uninstallProtectionEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InsertUser {
  email: string;
  password: string;
  name: string;
  strictModeEnabled?: boolean;
  uninstallProtectionEnabled?: boolean;
}

// Task types
export interface Task {
  id: string;
  userId: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  strictLevel: StrictLevel;
  targetApps: string[];
  proofMethods: string[];
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InsertTask {
  userId?: string;
  title: string;
  startAt: string;
  endAt?: string;
  durationMinutes: number;
  strictLevel: StrictLevel;
  targetApps: string[];
  proofMethods: string[];
  pdfFile?: File;
  status?: TaskStatus;
}

// Enforcement Session types
export interface EnforcementSession {
  id: string;
  taskId: string;
  userId: string;
  deviceId: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  unlockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsertEnforcementSession {
  taskId: string;
  userId: string;
  deviceId: string;
  status?: SessionStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  unlockedAt?: string | null;
}

// Proof types
export interface Proof {
  id: string;
  sessionId: string;
  method: string;
  result: any;
  score: number;
  fileUrl: string | null;
  createdAt: string;
}

export interface InsertProof {
  sessionId: string;
  method: string;
  result: any;
  score?: number;
  fileUrl?: string | null;
}

// Usage Log types
export interface UsageLog {
  id: string;
  sessionId: string;
  packageName: string;
  msInForeground: number;
  timestamp: string;
}

export interface InsertUsageLog {
  sessionId: string;
  packageName: string;
  msInForeground?: number;
}

// Accountability Partner types
export interface AccountabilityPartner {
  id: string;
  userId: string;
  partnerUserId: string;
  status: string;
  createdAt: string;
}

export interface InsertAccountabilityPartner {
  userId: string;
  partnerUserId: string;
  status?: string;
}