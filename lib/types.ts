export type EventType = 'school' | 'exam' | 'study' | 'sport' | 'free' | 'other';
export type EventSource = 'webuntis' | 'ai' | 'manual';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  type: EventType;
  source: EventSource;
  color: string | null;
  recurrence: 'weekly' | 'biweekly' | null;
  recurrence_end: string | null;
  created_at: string;
}

export interface SubjectPreference {
  id: string;
  subject: string;
  enjoyment: number;
  grade: number;
  notes: string | null;
  updated_at: string;
}

export interface Activity {
  id: string;
  name: string;
  category: string;
  enjoyment: number;
  times_per_week: number;
  duration_mins: number;
  notes: string | null;
  updated_at: string;
}

export const TYPE_COLORS: Record<EventType, string> = {
  school: '#3B82F6',
  exam:   '#EF4444',
  study:  '#EAB308',
  sport:  '#22C55E',
  free:   '#A855F7',
  other:  '#6B7280',
};
