# Roadmap Memory

## Phase 1: MVP Client PWA (Completed)
- [x] Architectural documentation & research memory
- [x] Vite + React + Tailwind PWA scaffolding with custom theme tokens & dark mode
- [x] Camera capture + interactive tap-to-crop framing + torch toggle + EXIF handling
- [x] Watermelon prevalidation gate with browser MobileNet classifier & offline fail-open
- [x] Dedicated underside/belly photo capture & field spot HSV analysis
- [x] Variety (`striped` / `solid`) and Size (`small` / `medium` / `large`) chip adjustment
- [x] 3-Knock acoustic recording + wake lock + adaptive RMS onset detector + discrete FFT + Abbaszadeh statistical features
- [x] Canvas visual heuristics (Stripe ribbon contrast + ground spot yellowness + surface dullness)
- [x] Multimodal fusion scoring, honest eating window & explainable breakdown
- [x] Side-by-side previous scan comparison & local share card generation
- [x] Local IndexedDB history & feedback loop ("How did it taste?")
- [x] Multi-language localization (Catalan `ca`, Spanish `es`, English `en`)
- [x] Dual-mode sync: Local-only vs opt-in anonymous research sync with Hono + SQLite backend

## Phase 2: Native Packaging (Capacitor)
- [ ] Add `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`
- [ ] Configure native permissions for camera and microphone
- [ ] Generate App Store assets (splash screens, icons)

## Phase 3: ML Enhancements & Multimodal Model Fine-Tuning
- [ ] Train custom YOLO-nano watermelon & belly detector ONNX model
- [ ] Train multimodal classifier on collected validated taste dataset (Qilin + crowd feedback)
