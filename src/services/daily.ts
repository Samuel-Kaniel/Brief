import { Article, FeedSource, UserPreferences } from '../types';
import { fetchArticlesForCategories, FetchAllResult } from './rss';

/** Trailing window used for Daily v1 “today” (always covers the local calendar day). */
export const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Top of the Daily pack shown in the UI. */
export const DAILY_PACK_LIMIT = 24;

/** Baseline editorial weight when a source is missing from the map. */
export const DEFAULT_SOURCE_WEIGHT = 1;

/**
 * Editorial source weights for Daily rank v1.
 * 1.0 is the baseline. Higher = more likely to surface when recency is similar.
 * Keys match `FEED_SOURCES[].name` in `src/data/feeds.ts`.
 */
export const DEFAULT_SOURCE_WEIGHTS: Record<string, number> = {
  'Ars Technica': 1.25,
  'MIT Technology Review': 1.3,
  'arXiv cs.LG (Machine Learning)': 1.05,
  'arXiv cs.CV (Computer Vision)': 1.05,
  'arXiv cs.CL (NLP)': 1.05,
  'High Scalability': 1.1,
  'Netflix Tech Blog': 1.2,
  'AWS Architecture Blog': 1.15,
  'BBC News - Politics': 1.3,
  'NPR - Politics': 1.2,
  'Slashdot - Politics': 0.9,
  'Yahoo Finance': 1.0,
  'WSJ - Markets': 1.3,
  'ScienceDaily - Top Science': 1.1,
  NASA: 1.2,
  'ScienceDaily - Health': 1.1,
  'NPR - Health': 1.2,
  EdSource: 1.1,
  'The Hechinger Report': 1.15,
  'NPR - Education': 1.2,
  'K-12 Dive': 1.0,
};

export interface RankDailyOptions {
  now?: Date;
  limit?: number;
  sourceWeights?: Record<string, number>;
}

export interface DailyPackResult extends FetchAllResult {
  windowStart: string;
  generatedAt: string;
}

export interface HomeLanesResult {
  feedArticles: Article[];
  dailyArticles: Article[];
  failedSources: string[];
  windowStart: string;
  generatedAt: string;
}

/**
 * Start of the Daily window.
 *
 * Product: a local calendar-day pack.
 * Ranking v1: include items published since local midnight, or within the last
 * 24h — whichever window is wider. In practice that is the trailing 24 hours,
 * which always covers “today” in the device timezone and still has stories
 * just after midnight.
 */
export function getDailyCutoffMs(now: Date): number {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return Math.min(midnight.getTime(), now.getTime() - DAILY_WINDOW_MS);
}

export function sourceWeight(
  sourceName: string,
  weights: Record<string, number> = DEFAULT_SOURCE_WEIGHTS
): number {
  return weights[sourceName] ?? DEFAULT_SOURCE_WEIGHT;
}

/**
 * Recency in [0, 1]: 1.0 just published, 0.0 at the 24h window edge (or older).
 * Future-dated items clamp to 1.0.
 */
export function recencyScore(publishedAt: string, nowMs: number): number {
  const published = Date.parse(publishedAt);
  if (Number.isNaN(published)) return 0;
  const ageMs = Math.max(0, nowMs - published);
  return Math.max(0, Math.min(1, 1 - ageMs / DAILY_WINDOW_MS));
}

/**
 * Daily rank v1: `sourceWeight × recency`.
 * Documented so a server ranker can reproduce (or replace) this later.
 */
export function dailyScore(
  article: Article,
  nowMs: number,
  weights: Record<string, number> = DEFAULT_SOURCE_WEIGHTS
): number {
  return sourceWeight(article.sourceName, weights) * recencyScore(article.publishedAt, nowMs);
}

function publishedMs(iso: string): number | null {
  const value = Date.parse(iso);
  return Number.isNaN(value) ? null : value;
}

/**
 * Filter to the user's topics and the Daily window, then rank.
 *
 * Pure: no I/O. Safe to unit-test. A future `GET /feeds/daily` can return an
 * already-ranked list and the UI can skip this call.
 */
export function rankDaily(
  articles: Article[],
  prefs: Pick<UserPreferences, 'categories'>,
  options: RankDailyOptions = {}
): Article[] {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const cutoffMs = getDailyCutoffMs(now);
  const limit = options.limit ?? DAILY_PACK_LIMIT;
  const weights = options.sourceWeights ?? DEFAULT_SOURCE_WEIGHTS;
  const selected = new Set(prefs.categories);

  if (selected.size === 0 || limit <= 0) return [];

  const eligible = articles.filter((article) => {
    if (!selected.has(article.category)) return false;
    const published = publishedMs(article.publishedAt);
    if (published == null) return false;
    return published >= cutoffMs;
  });

  eligible.sort((a, b) => {
    const scoreDelta = dailyScore(b, nowMs, weights) - dailyScore(a, nowMs, weights);
    if (scoreDelta !== 0) return scoreDelta;
    const timeDelta = (publishedMs(b.publishedAt) ?? 0) - (publishedMs(a.publishedAt) ?? 0);
    if (timeDelta !== 0) return timeDelta;
    return a.id.localeCompare(b.id);
  });

  return eligible.slice(0, limit);
}

/**
 * Standalone Daily fetch — the swap point for `GET /feeds/daily`.
 *
 * Today this still pulls on-device RSS and runs `rankDaily`. When a hosted
 * ingest API exists, replace the body of this function (keep the signature)
 * and the rest of the app can stay the same.
 */
export async function fetchDailyPack(
  sources: FeedSource[],
  prefs: Pick<UserPreferences, 'categories'>,
  options: RankDailyOptions = {}
): Promise<DailyPackResult> {
  // Future:
  //   const res = await fetch(`${DAILY_API}/feeds/daily?categories=...`);
  //   return await res.json();
  return fetchDailyPackLocal(sources, prefs, options);
}

async function fetchDailyPackLocal(
  sources: FeedSource[],
  prefs: Pick<UserPreferences, 'categories'>,
  options: RankDailyOptions
): Promise<DailyPackResult> {
  const now = options.now ?? new Date();
  const { articles, failedSources } = await fetchArticlesForCategories(sources, prefs.categories);
  return {
    articles: rankDaily(articles, prefs, { ...options, now }),
    failedSources,
    windowStart: new Date(getDailyCutoffMs(now)).toISOString(),
    generatedAt: now.toISOString(),
  };
}

/**
 * Home screen loader: one on-device RSS pass, then split into Feed + Daily.
 *
 * Later this can become:
 *   `Promise.all([fetchFeedArticles(...), fetchDailyPack(...)])`
 * when Daily is served by `GET /feeds/daily` and Feed stays on-device (or also
 * moves server-side).
 */
export async function loadHomeLanes(
  sources: FeedSource[],
  prefs: Pick<UserPreferences, 'categories'>,
  options: RankDailyOptions = {}
): Promise<HomeLanesResult> {
  const now = options.now ?? new Date();
  const { articles, failedSources } = await fetchArticlesForCategories(sources, prefs.categories);
  return {
    feedArticles: articles,
    dailyArticles: rankDaily(articles, prefs, { ...options, now }),
    failedSources,
    windowStart: new Date(getDailyCutoffMs(now)).toISOString(),
    generatedAt: now.toISOString(),
  };
}
