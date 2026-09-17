# Hyperframes Composition Brief: Brief

## Objective
Create a short launch-style brag video for Brief, the Expo RSS news reader in this repo.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: vertical — 1080x1920
- Duration: 20 seconds

## Source Material
- Project root: `/workspace`
- Primary files read: `README.md`, `app.json`, `src/screens/*`, `src/components/NewsCard.tsx`, `src/components/SwipeCardStack.tsx`, `src/data/feeds.ts`, `docs/screenshot-feed.jpg`
- Product name: Brief
- Tagline / strongest claim: Swipeable public RSS. No API key. ~60-second summaries.
- Key UI or visual moment to recreate: news card + swipe save/skip + topic chips + daily digest
- Copy that must appear verbatim:
  - Brief
  - What do you want to follow?
  - Start reading
  - Skipped · Undo
  - Technology
  - AI / ML
  - Science
  - Finance

## Creative Direction
- Tone preset: `app-store`
- Creative direction: polished iOS feature-card film of a real RSS reader
- Interpretation: clean title-case feature lines, slide transitions, sparse SFX, the product UI is the hero
- Angle: Show opening Brief — charcoal cards, blue chips, a real headline, save/skip, one digest at 8 AM
- Hook: The news, without the scroll.
- Outro / punchline: Brief. / Read it in a minute.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - Voiceover

## Visual Identity
- Background: `#0f1115`
- Text: `#ffffff`
- Accent: `#2563eb`
- Display font: Inter (local @font-face)
- Body font: Inter
- Visual references from the project: NewsCard (rounded 28, category pill, NPR footer), onboarding chips, Saved rows, header **Brief**

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 2.5s — The news, without the scroll.
2. Reveal — 3.5s — Phone + Brief feed card (real photo)
3. Topics — 4.0s — Onboarding chips → Start reading
4. Swipe — 4.5s — Right save / left skip + Undo bar
5. Digest — 3.0s — Saved list + 8:00 AM digest banner
6. Outro — 2.5s — Brief. Read it in a minute.

## Audio
- Audio role: warm bed
- Audio arc: steady bed, sparse UI hits, fade under outro
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: volume 0.32, fade from ~18.4s
- Music cue guidance: bundled preset `skills/brag/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` — lock Start reading ~8.74s, save swipe ~10.93s, outro ~17.47s; chips on 6.00 / 6.56 / 7.09 / 7.64
- Audio-reactive treatment: subtle; phone glow / background warmth from RMS/bass
- Audio-coupled moments:
  - topics chips — sequential clicks
  - Start reading — tap
  - swipe save/skip — card slides
  - digest banner — drop
  - outro name — soft bong
- SFX selection guidance: low HF risk interface clicks + one card-slide + soft impacts; see sfx-analysis.md
- Exact SFX choice: Hyperframes should choose filenames after the animation exists
- Audio files: copy into `brag-output/composition/assets/`

## Hyperframes Instructions
Load hyperframes-core, hyperframes-animation, hyperframes-creative, hyperframes-keyframes, hyperframes-cli. Do not enter the /hyperframes intent interview.

Requirements:
- Show real Brief UI recreation (not generic SaaS).
- Keep all text readable.
- Keep the video 15–25 seconds (target 20).
- Include music/SFX.
- Treat cue metadata as optional timing hints.
- Use local assets.
- Run `hyperframes check` before render.
