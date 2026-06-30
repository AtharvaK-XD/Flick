export type SourceType = 'text' | 'pdf' | 'url';

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  source_type: SourceType;
  source_preview: string | null;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  user_id: string;
  front: string;
  back: string;
  explanation: string | null;
  hint: string | null;
  choices?: string[];
  next_review: string; // ISO date string (YYYY-MM-DD)
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  created_at: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  streak: number;
  xp: number;
  total_cards_studied: number;
  last_study_date: string | null; // ISO date string (YYYY-MM-DD)
  created_at: string;
  updated_at: string;
}

export interface RecentActivity {
  id: string;
  deck_id: string;
  deck_title: string;
  reviewed_count: number;
  timestamp: string;
}
