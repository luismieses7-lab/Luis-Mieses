export type WorkoutType = 'AMRAP' | 'EMOM' | 'FOR_TIME' | 'STRENGTH' | 'SKILL' | 'CHIPPER' | 'HERO' | 'BENCHMARK';

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  name: string;
  description: string;
  result?: string;
  rpe?: number;
  notes?: string;
  rxd?: boolean;
}

export interface Competition {
  id: string;
  name: string;
  date: string;
  location?: string;
  category?: string;
  strategy?: string;
  mentalNotes?: string;
  completed?: boolean;
  result?: string;
}

export type AthleteLevel = 'Principiante' | 'Intermedio' | 'RX' | 'Elite';

export interface UserProfile {
  name: string;
  level: AthleteLevel;
  goals: string;
  yearsTraining?: string;
  box?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
