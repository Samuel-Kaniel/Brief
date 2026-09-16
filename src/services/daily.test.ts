import {
  DAILY_PACK_LIMIT,
  DAILY_WINDOW_MS,
  dailyScore,
  getDailyCutoffMs,
  rankDaily,
  recencyScore,
  sourceWeight,
} from './daily';
import { Article, CategoryId } from '../types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`);
  }
}

function article(partial: Partial<Article> & Pick<Article, 'id' | 'publishedAt'>): Article {
  return {
    title: partial.title ?? partial.id,
    link: `https://example.com/${partial.id}`,
    sourceName: partial.sourceName ?? 'Ars Technica',
    category: partial.category ?? 'technology',
    summary: 'summary',
    ...partial,
  };
}

const now = new Date('2026-09-16T18:00:00.000Z');
const nowMs = now.getTime();
const hour = 60 * 60 * 1000;

function hoursAgo(hours: number): string {
  return new Date(nowMs - hours * hour).toISOString();
}

function run(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok  - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

run('cutoff is the wider of local midnight and last 24h (trailing 24h)', () => {
  const cutoff = getDailyCutoffMs(now);
  assertEqual(cutoff, nowMs - DAILY_WINDOW_MS, 'cutoff should be now - 24h');
  assert(cutoff <= nowMs, 'cutoff is not in the future');
});

run('recency is 1 at publish time and 0 at the 24h edge', () => {
  assertEqual(recencyScore(now.toISOString(), nowMs), 1, 'just published');
  assertEqual(recencyScore(hoursAgo(24), nowMs), 0, 'exactly 24h old');
  assertEqual(recencyScore(hoursAgo(12), nowMs), 0.5, '12h old');
  assertEqual(recencyScore(hoursAgo(48), nowMs), 0, 'older than window');
  assertEqual(recencyScore('not-a-date', nowMs), 0, 'invalid timestamp');
});

run('sourceWeight falls back to 1 for unknown sources', () => {
  assert(sourceWeight('MIT Technology Review') > sourceWeight('Unknown Outlet'), 'known > default');
  assertEqual(sourceWeight('Unknown Outlet'), 1, 'default weight');
});

run('dailyScore is weight × recency', () => {
  const recent = article({ id: 'a', publishedAt: hoursAgo(0), sourceName: 'BBC News - Politics' });
  const older = article({ id: 'b', publishedAt: hoursAgo(12), sourceName: 'BBC News - Politics' });
  assert(dailyScore(recent, nowMs) > dailyScore(older, nowMs), 'fresher scores higher');
  assertEqual(dailyScore(recent, nowMs), sourceWeight('BBC News - Politics') * 1, 'fresh BBC = weight');
});

run('rankDaily drops other categories, stale items, and invalid dates', () => {
  const ranked = rankDaily(
    [
      article({ id: 'tech-fresh', publishedAt: hoursAgo(2), category: 'technology' }),
      article({ id: 'tech-old', publishedAt: hoursAgo(30), category: 'technology' }),
      article({ id: 'science-fresh', publishedAt: hoursAgo(1), category: 'science', sourceName: 'NASA' }),
      article({ id: 'bad-date', publishedAt: 'whenever', category: 'technology' }),
    ],
    { categories: ['technology'] },
    { now }
  );
  assertEqual(ranked.map((a) => a.id).join(','), 'tech-fresh', 'only in-window selected category');
});

run('rankDaily prefers higher weight × recency and respects limit', () => {
  const weights = { Premium: 2, Cheap: 1 };
  const ranked = rankDaily(
    [
      article({
        id: 'cheap-fresh',
        publishedAt: hoursAgo(1),
        sourceName: 'Cheap',
        category: 'finance',
      }),
      article({
        id: 'premium-mid',
        publishedAt: hoursAgo(6),
        sourceName: 'Premium',
        category: 'finance',
      }),
      article({
        id: 'cheap-mid',
        publishedAt: hoursAgo(6),
        sourceName: 'Cheap',
        category: 'finance',
      }),
    ],
    { categories: ['finance'] },
    { now, limit: 2, sourceWeights: weights }
  );
  // premium-mid: 2 * 0.75 = 1.50
  // cheap-fresh: 1 * (1 - 1/24) ≈ 0.958
  // cheap-mid: 1 * 0.75 = 0.75
  assertEqual(ranked.length, 2, 'limit 2');
  assertEqual(ranked[0].id, 'premium-mid', 'higher weight×recency first');
  assertEqual(ranked[1].id, 'cheap-fresh', 'then fresher baseline source');
});

run('rankDaily returns [] for empty topics or non-positive limit', () => {
  const items = [article({ id: 'x', publishedAt: hoursAgo(1), category: 'technology' as CategoryId })];
  assertEqual(rankDaily(items, { categories: [] }, { now }).length, 0, 'no topics');
  assertEqual(rankDaily(items, { categories: ['technology'] }, { now, limit: 0 }).length, 0, 'limit 0');
});

run('rankDaily defaults to DAILY_PACK_LIMIT', () => {
  const items = Array.from({ length: DAILY_PACK_LIMIT + 5 }, (_, i) =>
    article({
      id: `story-${i}`,
      publishedAt: hoursAgo(i * 0.2),
      category: 'politics',
      sourceName: 'NPR - Politics',
    })
  );
  assertEqual(rankDaily(items, { categories: ['politics'] }, { now }).length, DAILY_PACK_LIMIT, 'default cap');
});

run('equal scores break ties by newer publishedAt, then id', () => {
  const weights = { Same: 1 };
  const ranked = rankDaily(
    [
      article({ id: 'b', publishedAt: hoursAgo(3), sourceName: 'Same', category: 'health' }),
      article({ id: 'a', publishedAt: hoursAgo(3), sourceName: 'Same', category: 'health' }),
      article({ id: 'c', publishedAt: hoursAgo(2), sourceName: 'Same', category: 'health' }),
    ],
    { categories: ['health'] },
    { now, sourceWeights: weights }
  );
  assertEqual(ranked.map((a) => a.id).join(','), 'c,a,b', 'newer first, then id');
});

console.log('\nAll daily ranker tests passed.');
