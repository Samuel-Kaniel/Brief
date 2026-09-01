import { useEffect, useState } from 'react';
import { Article } from '../types';
import { getCachedImage, setCachedImage } from '../services/storage';
import { fetchOgImage } from '../services/ogImage';

export type ImageStatus = 'resolved' | 'loading' | 'unavailable';

export function useArticleImage(article: Article): { uri: string | null; status: ImageStatus } {
  const [uri, setUri] = useState<string | null>(article.imageUrl ?? null);
  const [status, setStatus] = useState<ImageStatus>(article.imageUrl ? 'resolved' : 'loading');

  useEffect(() => {
    if (article.imageUrl) {
      setUri(article.imageUrl);
      setStatus('resolved');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    (async () => {
      const cached = await getCachedImage(article.id);
      if (cached !== undefined) {
        if (!cancelled) {
          setUri(cached);
          setStatus(cached ? 'resolved' : 'unavailable');
        }
        return;
      }

      const found = await fetchOgImage(article.link);
      await setCachedImage(article.id, found);
      if (!cancelled) {
        setUri(found);
        setStatus(found ? 'resolved' : 'unavailable');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [article.id, article.imageUrl, article.link]);

  return { uri, status };
}
