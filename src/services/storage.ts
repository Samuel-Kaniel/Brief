import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article, UserPreferences } from '../types';

const PREFERENCES_KEY = 'news-app:preferences';
const SAVED_ARTICLES_KEY = 'news-app:saved-articles';
const SKIPPED_IDS_KEY = 'news-app:skipped-ids';
const IMAGE_CACHE_KEY = 'news-app:image-cache';
const IMAGE_CACHE_MAX_ENTRIES = 500;

export const DEFAULT_PREFERENCES: UserPreferences = {
  categories: [],
  notificationsEnabled: true,
  notificationHour: 8,
  notificationMinute: 0,
  onboardingComplete: false,
};

export async function loadPreferences(): Promise<UserPreferences> {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
}

async function loadIdSet(key: string): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

async function saveIdSet(key: string, set: Set<string>): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(Array.from(set)));
}

export async function loadSavedArticles(): Promise<Record<string, Article>> {
  const raw = await AsyncStorage.getItem(SAVED_ARTICLES_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, Article>;
  } catch {
    return {};
  }
}

export async function loadSavedIds(): Promise<Set<string>> {
  const saved = await loadSavedArticles();
  return new Set(Object.keys(saved));
}

export async function markSaved(article: Article): Promise<Record<string, Article>> {
  const saved = await loadSavedArticles();
  saved[article.id] = article;
  await AsyncStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(saved));
  return saved;
}

export async function unmarkSaved(id: string): Promise<Record<string, Article>> {
  const saved = await loadSavedArticles();
  delete saved[id];
  await AsyncStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(saved));
  return saved;
}

export async function loadSkippedIds(): Promise<Set<string>> {
  return loadIdSet(SKIPPED_IDS_KEY);
}

export async function markSkipped(id: string): Promise<Set<string>> {
  const set = await loadSkippedIds();
  set.add(id);
  await saveIdSet(SKIPPED_IDS_KEY, set);
  return set;
}

export async function resetSkipped(): Promise<void> {
  await AsyncStorage.removeItem(SKIPPED_IDS_KEY);
}

async function loadImageCache(): Promise<Record<string, string | null>> {
  const raw = await AsyncStorage.getItem(IMAGE_CACHE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string | null>;
  } catch {
    return {};
  }
}

export async function getCachedImage(articleId: string): Promise<string | null | undefined> {
  const cache = await loadImageCache();
  return articleId in cache ? cache[articleId] : undefined;
}

export async function setCachedImage(articleId: string, url: string | null): Promise<void> {
  const cache = await loadImageCache();
  cache[articleId] = url;
  const keys = Object.keys(cache);
  if (keys.length > IMAGE_CACHE_MAX_ENTRIES) {
    for (const key of keys.slice(0, keys.length - IMAGE_CACHE_MAX_ENTRIES)) delete cache[key];
  }
  await AsyncStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
}
