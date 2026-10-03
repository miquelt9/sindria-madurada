# Síndria Madurada 🍉

> **Síndria madurada** (Catalan for *"Ripe Watermelon"*) is a guest-first, client-only Progressive Web App (PWA). It gives a **coarse three-way stage and texture hint** — likely ripe, borderline, or likely unripe — from a photo and several knocks. A hollow sound is a **separate warning**, not a ripeness point. It is not a sweetness test.

---

## Key Features

- **100% On-Device & Privacy-First**: All camera capture, image canvas analysis, audio FFT processing, and scan history are stored locally in IndexedDB. No login or cloud upload required.
- **Coarse stage and texture hint**:
  - **Photo**: Prefer a frame that shows the field spot. The cue is loss of green against the rest of the rind, not absolute yellow and not a centimetre rule. Stripe contrast is a rind cue. A dull rind does not mean ripe for every cultivar.
  - **Knocks**: Several knocks, not one. Dull versus tight is a firmness cue, not more bass and not a sweetness reading.
  - **Hollow**: A hollow sound is its own warning. It is not a ripeness point.
- **Honest verdicts**: Words only — `Likely ripe`, `Unsure / Borderline`, `Likely unripe`. The fruit does not ripen or sweeten after picking. Treat the hint as low confidence when the field spot is missing, the room is noisy, or the fruit is extreme in size. How the photo and the knocks are combined is a product choice, not a result from any paper.
- **Multi-language Localization**: Fully localized in Catalan (`ca`), Spanish (`es`), and English (`en`).
- **PWA & Offline-Ready**: Installable on iOS/Android/desktop with service worker caching and offline-first fallback.
- **Post-Consumption Feedback Loop**: Rate watermelon taste after cutting to log validation data.
- **Optional Anonymous Sync**: Opt-in research dataset synchronization with a lightweight local Hono + SQLite backend.

---

## Tech Stack

- **Frontend**: Vite, React 18, TypeScript, Tailwind CSS, Lucide React
- **Audio Signal Processing**: Web Audio API (`AudioContext`, `AnalyserNode`), Radix-2 FFT, Adaptive RMS onset detector
- **Computer Vision & ML**: HTML5 Canvas 2D API (`ImageData`), HSV color segmentation, on-demand `@huggingface/transformers` MobileNet prevalidation gate
- **Storage**: IndexedDB (via `idb`)
- **Backend (Optional)**: Hono, Node.js (`node:sqlite`), CORS
- **Testing**: Vitest

---

## Getting Started

### Prerequisites

- Node.js 18+ (Node 22+ recommended for built-in `node:sqlite`)
- npm / pnpm / yarn

### Installation

```bash
# Install frontend dependencies
npm install

# Install optional server dependencies
cd server && npm install && cd ..
```

### Development

```bash
# Start Vite development server
npm run dev

# Start with HTTPS (recommended for camera & microphone testing on mobile)
npm run dev:https

# Start full stack (Vite frontend + Hono backend)
npm run dev:full
```

### Testing & Build

```bash
# Run unit test suite
npm test

# Build for production
npm run build

# Preview production build
npm run preview

# Generate PWA app icons
npm run generate-icons
```

---

## Architecture & Codebase Map

```
src/
  ├── i18n/            # Translations (ca, es, en), I18nProvider, useI18n hook
  ├── lib/
  │    ├── audio/      # Web Audio recorder, knock onset detector, FFT & moment feature extraction
  │    ├── vision/     # Canvas image heuristics, ground spot HSV segmentation, MobileNet gate
  │    ├── score/      # Multimodal fusion scoring algorithm & honest eating window
  │    ├── history/    # IndexedDB storage, consent management, optional sync queue
  │    ├── share/      # Canvas-rendered share card generator
  │    ├── theme.ts    # Light / Dark / System theme management
  │    └── cn.ts       # Tailwind class merge helper
  ├── components/
  │    ├── ui/                 # Semantic UI primitives (AppShell, Button, Card, Badge, ErrorBoundary)
  │    ├── LandingPage.tsx     # Hero, 3-step value prop, language switch, consent toggle
  │    ├── PhotoCapture.tsx    # Camera viewfinder, torch, object-cover tap-to-crop, belly photo
  │    ├── KnockRecorderView.tsx # Audio FFT spectrum meter, wake lock, onset detector
  │    ├── ResultCard.tsx       # Multimodal score, eat window, comparison, taste feedback
  │    └── HistoryView.tsx      # Scan log, eating window & detail inspection
server/
  ├── src/             # Hono REST API (POST /scans, PATCH /scans/:id/feedback, GET /health, SQLite db)
```

---

## Memory & Documentation for Agents

Detailed specifications and research background are kept in `docs/memory/`:

- `docs/memory/product.md` — Product vision, UX flows, guest model, and feedback loop.
- `docs/memory/research.md` — Scientific foundations, acoustic frequencies, rind texture analysis.
- `docs/memory/architecture.md` — Technical architecture, Web Audio API pipeline, Canvas CV heuristics.
- `docs/memory/roadmap.md` — Milestones (Capacitor mobile packaging, custom fine-tuned classifiers).
- `docs/memory/papers/abbaszadeh-2013.md` — Digest of the vibration FFT feature extraction methodology.
- `AGENTS.md` — Guidelines and principles for AI coding agents working on this project.
- `.cursor/rules/sindria.mdc` — Workspace rules for design tokens and coding conventions.

---

## License

Private / Personal Project.
