# AGENTS.md

Welcome to **Síndria madurada** (Catalan for "Ripe Watermelon"), a guest-first, client-only PWA. It offers a coarse three-way stage and texture hint — likely ripe, borderline, or likely unripe — from a photo (field spot as loss of green against the rind, stripe contrast) and several knocks (dull versus tight). A hollow sound is a separate warning, not a ripeness point. It is not a sweetness test.

## Core Principles

1. **Guest-First & Client-Side Privacy**: All capture, audio processing, image analysis, and history storage happen in the browser (IndexedDB). No mandatory login or external image/audio upload required for v1.
2. **Honest, Transparent Scoring**: The ceiling is a coarse three-way hint plus a separate hollow warning. Verdict words only: likely ripe, borderline, likely unripe. Field spot is a stage cue (loss of green against the rind, not absolute yellow or a centimetre rule). Knocks are firmness (dull versus tight) from several taps, not a bass or sweetness score. How photo and knocks are mixed is a product choice, not a paper result. Do not claim sugar, °Brix, a headline accuracy, laser vibrometry, NIR, or a fixed ripe frequency window.
3. **Multimodal Loop**: Photo Capture -> Tap-to-Crop -> 3-Knock Recording -> Combined Ripeness Assessment -> History Log -> Post-Consumption Validation ("Was it ripe?").
4. **PWA to Native Path**: Designed as an installable PWA (Vite + React + Tailwind) that can be seamlessly packaged for iOS and Android app stores using Capacitor without rewriting logic.

## Documentation Map

- `.agents/AGENTS.md` — How to change this repo. Prefer `.agents/` over `.cursor/rules`.
- `.agents/ARCHITECTURE.md` — Short app map. Depth stays in `docs/memory/architecture.md`.
- `.agents/DESIGN.md` — Look intent. Keep the current UI.
- `docs/memory/product.md` — Product vision, UX flows, guest model, and feedback loop.
- `docs/memory/research.md` — Scientific foundations, acoustic frequencies, rind texture analysis, and references.
- `docs/memory/architecture.md` — Technical architecture, Web Audio API FFT pipeline, Canvas CV heuristics, IndexedDB storage.
- `docs/memory/roadmap.md` — Future milestones (Qilin dataset fine-tuning, Capacitor mobile packaging, i18n).
- `docs/memory/papers/abbaszadeh-2013.md` — Digest of the vibration FFT amplitude feature extraction methodology (Abbaszadeh et al. 2013).
- `.cursor/rules/sindria.mdc` — Workspace rules for development conventions.
