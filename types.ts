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
  bundles?: BundleEntry[]; // Связки за эту неделю (до 4 штук)
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
  // Связки для проекта (до 4 штук)
  bundles?: BundleEntry[];
}

export interface BundleEntry {
  bundle: string; // Название связки (например, "Т1", "Т2")
  unscrew: number; // Открут в рублях
}

export interface UserData {
  projects: Project[];
  bundles?: BundleEntry[]; // Массив связок для таргетолога
}

export interface AppData {
  [key: string]: UserData;
}
