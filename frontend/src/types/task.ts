export interface Task {
  id: string;
  userId: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
  targetApps: string[];
  proofMethods: string[];
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface InsertTask {
  title: string;
  startAt: string;
  durationMinutes: number;
  strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
  targetApps: string[];
  proofMethods: string[];
}
