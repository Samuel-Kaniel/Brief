export type CategoryId =
  | 'technology'
  | 'ai_ml'
  | 'system_design'
  | 'politics'
  | 'finance'
  | 'science'
  | 'health'
  | 'education';

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
}

export interface FeedSource {
  name: string;
  url: string;
  category: CategoryId;
}

export interface Article {
  id: string;
  title: string;
  link: string;
  sourceName: string;
  category: CategoryId;
  publishedAt: string; // ISO string
  summary: string; // ~60 second read
  rawDescription?: string;
  imageUrl?: string; // from the RSS item itself, when present
}

export interface UserPreferences {
  categories: CategoryId[];
  notificationsEnabled: boolean;
  notificationHour: number; // 0-23, local time
  notificationMinute: number; // 0-59
  onboardingComplete: boolean;
}

export interface Summarizer {
  summarize(title: string, rawDescription: string | undefined, targetSeconds?: number): string;
}
