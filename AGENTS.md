# AGENTS.md

Welcome to **Síndria madurada** (Catalan for "Ripe Watermelon"), a guest-first, client-only PWA for checking watermelon ripeness via photo (visual rind stripe ribbon contrast & ground spot yellowness) and acoustic tapping response (knuckle knock FFT analysis).

## Core Principles

1. **Guest-First & Client-Side Privacy**: All capture, audio processing, image analysis, and history storage happen in the browser (IndexedDB). No mandatory login or external image/audio upload required for v1.
2. **Honest, Transparent Scoring**: Never output exaggerated 99% claims. Score signals transparently (Visual Stripe Contrast, Ground Spot Yellowness, Surface Dullness, Knock Resonance) with actionable explanations so users learn how to judge fruit.
3. **Multimodal Loop**: Photo Capture -> Tap-to-Crop -> 3-Knock Recording -> Combined Ripeness Assessment -> History Log -> Post-Consumption Validation ("Was it ripe?").
4. **PWA to Native Path**: Designed as an installable PWA (Vite + React + Tailwind) that can be seamlessly packaged for iOS and Android app stores using Capacitor without rewriting logic.

## Documentation Map

- `docs/memory/product.md` — Product vision, UX flows, guest model, and feedback loop.
- `docs/memory/research.md` — Scientific foundations, acoustic frequencies, rind texture analysis, and references.
- `docs/memory/architecture.md` — Technical architecture, Web Audio API FFT pipeline, Canvas CV heuristics, IndexedDB storage.
- `docs/memory/roadmap.md` — Future milestones (Qilin dataset fine-tuning, Capacitor mobile packaging, i18n).
- `docs/memory/papers/abbaszadeh-2013.md` — Digest of the vibration FFT amplitude feature extraction methodology (Abbaszadeh et al. 2013).
- `.cursor/rules/sindria.mdc` — Workspace rules for development conventions.
