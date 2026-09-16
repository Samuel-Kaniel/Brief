# Daily lane

Daily is a **local calendar-day pack**: a short, ranked list of “today’s” stories
for the topics the user selected in onboarding / Settings.

This prototype keeps **on-device RSS**. There is no Live/Active ingest API yet.

## What Daily means now

| | Daily (this prototype) | Feed (unchanged) |
| --- | --- | --- |
| Window | Local calendar day, implemented as the last **~24 hours** (see below) | All items currently in selected RSS feeds |
| Order | Rank v1: **source weight × recency** | Newest `publishedAt` first |
| Size | Top **24** stories | Full swipe deck (minus saved/skipped) |
| Sources | Existing public RSS in `src/data/feeds.ts`, filtered to selected categories | Same sources |
| Fetch | Same on-device RSS pass as Feed (`loadHomeLanes`) | Same |

**“Today” for ranking.** Product intent is a local calendar-day pack. Timestamps
are ISO, so Daily includes items with `publishedAt` since **local midnight or
the last 24 hours, whichever window is wider**. That is the trailing 24 hours,
which always covers the device’s calendar day and still has last night’s
stories just after midnight.

**Rank v1.** For each eligible article:

```
recency = clamp(1 - ageMs / 24h, 0, 1)   // 1.0 just published
score   = sourceWeight × recency
```

Source weights live in `DEFAULT_SOURCE_WEIGHTS` (`src/services/daily.ts`), keyed
by feed name. Baseline is `1.0`. Ties break by newer `publishedAt`, then `id`.

The ranker is a pure function: `rankDaily(articles, prefs, options?)`. Tests
are in `src/services/daily.test.ts` (`npm test`).

## What Daily is not (yet)

- **Live / Active lanes** — not in the UI. Those need a faster ingest path
  (and likely Reddit/X later). Out of scope for this prototype.
- **Hosted worker / `GET /feeds/daily`** — not built. Ranking runs on the
  device after the existing RSS fetch.
- **Off-device ingest** — publishers are still pulled client-side. CORS will
  keep the web preview sparse; Expo Go / a native build is the full-feed path.

## Swapping in a server Daily later

The client is shaped so a hosted pack can replace the local ranker without a
UI rewrite.

1. **Keep the UI contract.** Daily still consumes `Article[]` (id, title, link,
   source, category, `publishedAt`, summary, image).
2. **Replace one function.** `fetchDailyPack()` in `src/services/daily.ts` is
   the swap point. Today it is:

   ```ts
   fetchArticlesForCategories(...)  // on-device RSS
   rankDaily(articles, prefs)       // local rank v1
   ```

   Later, keep the same signature and do:

   ```ts
   GET /feeds/daily?categories=technology,science
   // optional: timezone or `after=` midnight so the server can pack a true
   // local calendar day instead of a trailing 24h window
   ```

3. **Split the home loader.** `loadHomeLanes()` currently does one RSS pass
   and then splits Feed vs Daily. When the API exists it can become:

   ```ts
   Promise.all([
     fetchArticlesForCategories(...), // Feed, or a future GET /feeds
     fetchDailyPack(...),             // GET /feeds/daily
   ])
   ```

4. **Server ranker.** Either re-use the documented `weight × recency` formula
   or upgrade it off-device (source quality, topic fit, dedupe). The client
   should treat the API list as already ranked and stop calling `rankDaily`
   on that response.

5. **Still out of band until then:** Reddit/X, Live/Active UI, and any new
   hosted worker. Daily can ship against RSS-only ingest.
