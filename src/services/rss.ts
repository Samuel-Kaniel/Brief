import { XMLParser } from 'fast-xml-parser';
import { Article, CategoryId, FeedSource } from '../types';
import { defaultSummarizer } from './summarizer';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: true,
  trimValues: true,
});

const FETCH_TIMEOUT_MS = 12000;

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return asText(value[0]);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj['#text'] === 'string') return obj['#text'];
    if (typeof obj['@_href'] === 'string') return obj['@_href'];
  }
  return '';
}

function parseDate(rawDate: string | undefined): string {
  if (!rawDate) return new Date().toISOString();
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function extractLink(item: Record<string, unknown>): string {
  const rawLink = item.link;
  if (typeof rawLink === 'string' && rawLink.trim()) return rawLink.trim();
  if (Array.isArray(rawLink)) {
    for (const entry of rawLink) {
      const href = asText(entry);
      if (href) return href;
    }
  }
  const asObjHref = asText(rawLink);
  if (asObjHref) return asObjHref;
  const guid = item.guid;
  const guidText = asText(guid);
  if (guidText && guidText.startsWith('http')) return guidText;
  return '';
}

function extractUrlPreferringImageType(value: unknown): string | undefined {
  if (value == null) return undefined;
  const candidates = Array.isArray(value) ? value : [value];
  let fallback: string | undefined;
  for (const candidate of candidates) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const obj = candidate as Record<string, unknown>;
    const url = obj['@_url'];
    if (typeof url !== 'string' || !url) continue;
    const type = obj['@_type'];
    if (typeof type === 'string' && type && !type.startsWith('image')) {
      fallback = fallback ?? url;
      continue;
    }
    return url;
  }
  return fallback;
}

function extractImageFromItem(item: Record<string, unknown>): string | undefined {
  const mediaContent = extractUrlPreferringImageType(item['media:content']);
  if (mediaContent) return mediaContent;

  const thumbnail = extractUrlPreferringImageType(item['media:thumbnail']);
  if (thumbnail) return thumbnail;

  const group = item['media:group'];
  if (group && typeof group === 'object') {
    const groupContent = extractUrlPreferringImageType((group as Record<string, unknown>)['media:content']);
    if (groupContent) return groupContent;
  }

  const enclosure = extractUrlPreferringImageType(item.enclosure);
  if (enclosure) return enclosure;

  // Last resort: the first <img> embedded in the item's own HTML content.
  const html = asText(item['content:encoded']) || asText(item.description) || '';
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  return undefined;
}

function hashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function fetchWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsSwipeApp/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFeed(source: FeedSource): Promise<Article[]> {
  const xml = await fetchWithTimeout(source.url);
  const parsed = parser.parse(xml);

  // RSS 2.0 nests <item> inside <channel>. RSS 1.0/RDF puts <item> as a
  // sibling of <channel>, directly under the <rdf:RDF> root.
  const rdfRoot = parsed?.['rdf:RDF'];
  const channel = parsed?.rss?.channel ?? parsed?.feed ?? rdfRoot?.channel;
  if (!channel) return [];

  const itemHost = rdfRoot ?? channel;
  const rawItems: Record<string, unknown>[] = Array.isArray(itemHost.item)
    ? itemHost.item
    : itemHost.item
    ? [itemHost.item]
    : Array.isArray(itemHost.entry)
    ? itemHost.entry
    : itemHost.entry
    ? [itemHost.entry]
    : [];

  const articles: Article[] = rawItems.map((item) => {
    const title = asText(item.title) || '(untitled)';
    const link = extractLink(item);
    const description =
      asText(item.description) || asText(item['content:encoded']) || asText(item.summary) || '';
    const pubDate = asText(item.pubDate) || asText(item.published) || asText(item.updated);
    const publishedAt = parseDate(pubDate);
    const id = hashId(`${source.name}|${link || title}`);
    const imageUrl = extractImageFromItem(item);

    return {
      id,
      title: title.trim(),
      link: link || source.url,
      sourceName: source.name,
      category: source.category,
      publishedAt,
      rawDescription: description,
      summary: defaultSummarizer.summarize(title, description),
      imageUrl,
    };
  });

  return articles;
}

export interface FetchAllResult {
  articles: Article[];
  failedSources: string[];
}

export async function fetchArticlesForCategories(
  sources: FeedSource[],
  categories: CategoryId[]
): Promise<FetchAllResult> {
  const relevant = sources.filter((s) => categories.includes(s.category));
  const failedSources: string[] = [];

  const results = await Promise.all(
    relevant.map(async (source) => {
      try {
        return await fetchFeed(source);
      } catch (err) {
        failedSources.push(source.name);
        return [] as Article[];
      }
    })
  );

  const seen = new Set<string>();
  const articles: Article[] = [];
  for (const list of results) {
    for (const article of list) {
      if (seen.has(article.id)) continue;
      seen.add(article.id);
      articles.push(article);
    }
  }

  articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return { articles, failedSources };
}
