export type Role = 'Admin' | 'Targetologist';

export const TARGETOLOGISTS = [
  'Алена',
  'Денис',
  'Алексей',
  'Сергей',
  'Анастасия',
  'Иван'
] as const;

export type TargetologistName = typeof TARGETOLOGISTS[number];

export interface WeeklyStats {
  budget: number;
  spend: number;
  goal: number;
  targetCpa: number;
}

export interface Project {
  id: string;
  name: string;
  // Map of "YYYY-MM-DD" -> lead count
  leads: Record<string, number>;
  // Map of "YYYY-MM-DD" (Monday of the week) -> Stats
  weeks: Record<string, WeeklyStats>;
  // Defaults for new weeks to auto-fill
  defaultGoal: number;
  defaultBudget: number;
  defaultTargetCpa: number;
}

export interface UserData {
  projects: Project[];
}

export interface AppData {
  [key: string]: UserData;
}
