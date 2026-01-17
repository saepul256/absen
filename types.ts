
export enum AttendanceStatus {
  PRESENT = 'HADIR',
  LATE = 'TERLAMBAT',
  ABSENT = 'ALPA',
  SICK = 'SAKIT',
  PERMISSION = 'IZIN',
  REJECTED = 'DITOLAK'
}

export type UserRole = 'STUDENT' | 'ADMIN';

export interface User {
  name: string;
  className?: string;
  role: UserRole;
}

export interface AttendanceLog {
  id: string;
  studentName: string;
  className: string;
  timestamp: string;
  status: AttendanceStatus;
  photoUrl: string;
  location: { lat: number; lng: number };
  aiAnalysis: string;
  confidenceScore: number;
}

export interface AIReport {
  summary: string;
  atRiskStudents: string[];
  trend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
}
