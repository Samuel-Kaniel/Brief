const OG_FETCH_TIMEOUT_MS = 6000;

function resolveUrl(maybeRelative: string, base: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    const baseOrigin = base.match(/^(https?:\/\/[^/]+)/i)?.[1];
    if (!baseOrigin) return maybeRelative;
    if (maybeRelative.startsWith('//')) return `https:${maybeRelative}`;
    if (maybeRelative.startsWith('/')) return `${baseOrigin}${maybeRelative}`;
    return `${baseOrigin}/${maybeRelative}`;
  }
}

const META_IMAGE_PATTERNS = [
  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
];

/**
 * Scrapes an article page for its og:image / twitter:image meta tag.
 * Best-effort: returns null on any failure, timeout, or missing tag rather
 * than throwing, since this is always a fallback for feed items with no
 * embedded image.
 */
export async function fetchOgImage(pageUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsSwipeApp/1.0)' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    for (const pattern of META_IMAGE_PATTERNS) {
      const match = html.match(pattern);
      if (match?.[1]) return resolveUrl(match[1], pageUrl);
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
