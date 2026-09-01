# Brief

A mobile news reader built with Expo (React Native + TypeScript). Aggregates live
public RSS feeds into a single swipeable card interface — no API key required.
Configurable by topic, with scheduled local notifications for a daily digest.

Topics covered: Technology, AI/ML/Computer Vision/NLP, System Design, Politics,
Finance, Science, Health, and Education.

<img src="docs/screenshot-feed.jpg" alt="Brief feed screen: a swipeable news card with photo, category tag, headline, summary, and source" width="280" />

## Running it on your phone

You don't need Xcode or Android Studio — just the free **Expo Go** app.

1. Install dependencies (only needed once):
   ```bash
   cd news-app
   npm install
   ```
2. Start the dev server:
   ```bash
   npx expo start
   ```
3. Install **Expo Go** on your phone (App Store / Google Play).
4. Scan the QR code printed in the terminal with your phone's camera (iOS) or the
   Expo Go app (Android). The app opens on your device, connected live to your
   computer — edits you make to the code hot-reload on the phone.

Your computer and phone need to be on the same Wi‑Fi network. If the QR code
connection doesn't work, press `w` in the terminal to try the web preview instead,
or switch the dev server to tunnel mode (press `s` then choose "tunnel" in the
Expo CLI, or run `npx expo start --tunnel`).

To run in a simulator instead of a physical phone (requires Xcode/Android Studio):
```bash
npx expo start --ios       # iOS Simulator
npx expo start --android   # Android Emulator
```

## How it works

- **Onboarding** — first launch asks you to pick topics and a daily digest time.
  Saved to on-device storage (`AsyncStorage`), so it only runs once.
- **Feed** — a gesture-driven card deck (`SwipeCardStack`, built on
  `react-native-gesture-handler` + `react-native-reanimated`). Each card renders an
  image, headline, source, timestamp, and a ~60-second summary. Swiping right saves
  the story, left dismisses it; crossing ~28% of screen width or exceeding a
  velocity threshold commits the action and the card exits, with a bookmark or X
  icon fading in during the drag to indicate which action is pending. Tapping
  without dragging opens the source article. Once all stories in the selected
  topics are exhausted, an empty-state screen provides a manual refresh control
  and, if any stories were dismissed, an option to restore them.
- **Saved** — a plain list of everything you've swiped right on, with a thumbnail,
  tap-to-open, and a remove button. Reachable from the Feed header.
- **Settings** — change your topics or notification time anytime.
- **Daily notification** — a local notification (via `expo-notifications`) fires
  once a day at your chosen time with a couple of headlines from your topics. No
  server or push infrastructure involved — it's scheduled entirely on-device.

### Article images

Each RSS item is checked, in order, for `media:content`, `media:thumbnail`,
`media:group > media:content`, `enclosure`, and finally the first `<img>` inside
`content:encoded`/`description`. When a feed offers more than one size (some
publishers list several `media:content` variants), the largest is picked; if the
best size a feed declares is still under 300px on its shorter side (Yahoo
Finance and BBC both ship ~130–240px thumbnails, for example), it's treated as
too small to show full-bleed and skipped in favor of the fallback below —
stretching a tiny thumbnail to card size just looks blurry.

If none of the above are present or usable (arXiv and ScienceDaily's feeds, for
example, carry no image at all), the app lazily fetches the article page itself
and scrapes its `og:image`/`twitter:image` meta tag — only for cards currently in
the visible stack (top 3), so this never blocks the feed from rendering. The
resolved (or "not found") result is cached per-article in AsyncStorage
(`src/services/storage.ts`, `getCachedImage`/`setCachedImage`) so it's never
re-scraped. If no image can be found at all, the card falls back to a
category-colored, typographic placeholder instead of a broken image box.
Rendering and on-device caching (memory + disk) is handled by `expo-image`, with
a light gradient at the very bottom of the photo (not a heavy overlay) so the
image stays clear and just blends into the card below it.

News comes straight from each publisher's public RSS feed (see the full list in
`src/data/feeds.ts`) — Ars Technica, MIT Technology Review, arXiv (cs.LG/cs.CV/cs.CL),
Netflix/AWS/HighScalability engineering blogs, BBC/NPR/Slashdot politics, Yahoo
Finance, WSJ Markets, ScienceDaily, NASA, and several education outlets. Nothing is
scraped beyond the feed itself, and no API key is needed.

## Project structure

```
src/
  types/            Shared TypeScript types (Article, Category, UserPreferences, ...)
  data/feeds.ts      Category list + RSS feed source URLs
  services/
    rss.ts           Fetches + parses RSS/RDF/Atom feeds into Article[], incl. image extraction
    summarizer.ts     Turns a raw RSS description into a ~60-second digest
    ogImage.ts        Best-effort og:image/twitter:image scrape, used as an image fallback
    storage.ts        AsyncStorage helpers (preferences, saved articles, skipped ids, image cache)
    notifications.ts  Schedules the daily local notification
  hooks/useArticleImage.ts   Resolves an article's image: feed → cache → og:image scrape
  context/PreferencesContext.tsx   App-wide preferences state
  screens/           Onboarding, Feed, Saved, Settings
  components/        NewsCard, ArticleImage, SwipeCardStack, TimePicker
  navigation/        Stack navigator (Onboarding -> Feed <-> Settings/Saved)
```

## Plugging in a better summarizer

Right now, summaries are produced by `RuleBasedSummarizer` in
`src/services/summarizer.ts` — it strips HTML from the RSS `<description>` and
truncates it to a target word count (~3.3 words/second of reading). It's behind a
small interface:

```ts
export interface Summarizer {
  summarize(title: string, rawDescription: string | undefined, targetSeconds?: number): string;
}
```

To use an LLM instead (e.g. to properly compress long descriptions or the full
article body instead of just truncating), implement that interface — for example:

```ts
// src/services/llmSummarizer.ts
export class LLMSummarizer implements Summarizer {
  async summarize(title: string, rawDescription: string | undefined, targetSeconds = 60) {
    // call your LLM endpoint here, prompt it to produce a ~60-second summary
  }
}
```

Then swap the export in `src/services/rss.ts` (`import { defaultSummarizer } from
'./summarizer'`) to point at your new implementation. Note `summarize` is currently
called synchronously inside `fetchFeed` — if your implementation is async (an LLM
call almost certainly will be), change that call site to `await` it and consider
caching results locally (e.g. in `storage.ts`) so you're not re-summarizing on every
feed refresh.

## Known limitations / next steps

- The daily notification's headline text is generated once, at the moment you
  save your preferences/time — it won't refresh with new headlines each morning
  without the app being opened. A background fetch task (`expo-background-fetch` +
  `expo-task-manager`) could refresh it daily, but that requires a native build
  (won't work in Expo Go).
- A couple of feeds (e.g. Yahoo Finance) don't include a description in their RSS,
  so those cards fall back to showing just the headline.
- No offline caching of the feed yet — each open re-fetches from all selected
  sources (which does mean you're always seeing the latest available articles,
  sorted newest-first — there's no stale-cache layer to go out of date).
- There's no per-story "undo" — skipping is a deliberate action, but if you skip
  something by mistake, "Show skipped stories again" on the empty-deck screen
  brings everything back at once rather than restoring just the last one.

## If you upgrade react-native-reanimated

Expo Go ships a fixed, precompiled native binary — the JS-side
`react-native-worklets` version (Reanimated 4's separate native-worklets package,
not `react-native-reanimated` itself) **must exactly match** the version baked into
whatever Expo Go build you're running, or the app crashes on launch with
`Exception in HostFunction` inside `NativeWorklets`, before any of your code runs.
This project pins it explicitly in `package.json`:
```json
"react-native-worklets": "0.5.1"
```
That's the exact version listed for SDK 54 in `expo/bundledNativeModules.json` —
without the pin, npm resolves `react-native-worklets` to whatever the newest
version satisfying `react-native-reanimated`'s internal range is (which drifts
ahead of what Expo Go actually ships). If you bump `expo`/`react-native-reanimated`,
re-check that file for the version Expo Go for your new SDK expects and update the
pin to match. Also note `babel.config.js` must list `react-native-worklets/plugin`
(not the older `react-native-reanimated/plugin`, which Reanimated 4 moved out).

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`: installs deps,
type-checks (`tsc --noEmit`), runs `expo-doctor` (advisory — flags dependency
issues without blocking merges), and does a bundle sanity check
(`expo export --platform web`) to catch Metro/bundling regressions the same way
this project's been manually verified throughout development.

`.github/workflows/cd.yml` is a scaffold for shipping OTA updates via
[EAS Update](https://docs.expo.dev/eas-update/introduction/) on every push to
`main`. It intentionally **no-ops** until you activate it, so it won't fail CI
in the meantime. To activate it:

1. `npx eas login` (creates/uses an Expo account), then `npx eas init` from the
   project root — this links the project and adds a `projectId` to `app.json`.
2. Generate an access token at https://expo.dev/accounts/[account]/settings/access-tokens
   and add it as a GitHub Actions **secret** named `EXPO_TOKEN`
   (repo Settings → Secrets and variables → Actions → Secrets).
3. Add a GitHub Actions **variable** named `EAS_PROJECT_LINKED` set to `true`
   (same page → Variables tab) — this is the switch that turns the workflow on.

Until step 3, the `deploy` job is skipped on every run. This only publishes a
JS/asset OTA update to whoever already has the app installed via EAS Update's
runtime — it doesn't build or submit a new native binary to the App Store/Play
Store (that's `eas build` / `eas submit`, a separate, heavier flow not wired up
here).
