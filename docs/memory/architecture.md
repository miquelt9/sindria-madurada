# Architecture Memory

## Tech Stack
- **Frontend**: React 18 / Vite / TypeScript / Tailwind CSS
- **Design System & Typography**: Custom semantic watermelon token palette (`index.css` + `tailwind.config.js`), `@fontsource/fraunces` (display titles), `@fontsource/dm-sans` (UI/body)
- **Internationalization (i18n)**: Tiny typed dictionary system supporting Catalan default (`ca`), Spanish (`es`), English (`en`) with `localStorage` persistence.
- **Theming**: Class-based Light / Dark / System mode (`ThemeProvider`, `ThemeToggle`, `localStorage`, `prefers-color-scheme`, dynamic `meta[name="theme-color"]` and FOUC prevention script)
- **Icons & UI**: Lucide React, dedicated UI primitives (`Button`, `IconButton`, `Card`, `Badge`, `ScoreRing`, `ProgressDots`, `EmptyState`, `AppShell`, `ErrorBoundary`)
- **Watermelon Prevalidation Gate**: On-demand dynamic-imported `@huggingface/transformers` running MobileNet image classification in-browser with fail-open offline policy and background warmup.
- **Audio Signal Processing**: Web Audio API (`AudioContext.resume()`, `AnalyserNode`, adaptive RMS threshold transient onset detector, 200ms PCM windowing, custom discrete FFT + Abbaszadeh et al. statistical moment extraction)
- **Image Processing**: Canvas 2D API (`getImageData`, HSV color segmentation for field spot, local ribbon contrast variance, specular highlight thresholding)
- **Local Database & Sync**: IndexedDB (via `idb`) as local source of truth + optional anonymous backend synchronization (`Hono` + `node:sqlite`) with explicit user consent.
- **PWA Capabilities**: Service Worker (via `vite-plugin-pwa`), Web App Manifest, Standalone display mode, offline-ready, custom 192/512/apple-touch icons.

## Subsystems
```
src/
  ├── i18n/            # Translations (ca, es, en), I18nProvider, useI18n hook
  ├── lib/
  │    ├── audio/      # Web Audio recording, knock onset detection, FFT & Abbaszadeh features
  │    ├── vision/     # Rind stripe contrast, field spot HSV detection, shine analysis, watermelonGate
  │    ├── score/      # Multimodal fusion scoring algorithm, eating window & explainability
  │    ├── history/    # IndexedDB schema, anonymous consent, queue & dual-mode sync
  │    ├── share/      # Canvas-rendered share card generation & Web Share API
  │    ├── theme.ts    # Light/Dark/System theme resolution & meta synchronization
  │    └── cn.ts       # clsx + twMerge utility helper
  ├── components/
  │    ├── ui/                 # Core primitives (AppShell, Button, Card, Badge, ScoreRing, ProgressDots, etc.)
  │    ├── LandingPage.tsx     # Hero, 3-step value prop, language switch, consent toggle, PWA prompt
  │    ├── PhotoCapture.tsx    # Camera viewfinder, torch, EXIF handling, watermelon gate, belly shot, variety/size chips
  │    ├── KnockRecorderView.tsx # Audio FFT spectrum meter, wake lock, adaptive threshold & manual knock tap
  │    ├── ResultCard.tsx       # Multimodal score, eat window, previous scan compare, local share, taste feedback
  │    └── HistoryView.tsx      # Local scan log, eating window & detail inspection
server/
  ├── src/             # Hono REST API (POST /scans, PATCH /scans/:id/feedback, GET /health, SQLite db)
```

## Design System & Watermelon Theme

### Palette & Tokens
- **Surface**: Cream pulp paper in Light (`#FBF6EE`), deep rind-black in Dark (`#0C1F14`).
- **Primary**: Deep rind-green in Light (`#1B7A3D`), crisp rind-mint in Dark (`#3DCC6A`).
- **Accent**: Ripe watermelon flesh rose/pink (`#E11D48` / `#FB7185`) used for unripe warnings and key feedback highlights.
- **Spot**: UI token (`#C4920A` / `#FACC15`) for field-spot controls. The product cue is loss of green against the rind, not absolute yellow.
- **Rules**: Always use semantic Tailwind classes (`bg-surface`, `bg-surface-raised`, `text-ink`, `text-ink-muted`, `border-border`, `bg-primary`, `text-ripe`, etc.) rather than raw `slate-*` / `emerald-*` classes.
