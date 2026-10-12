# Architecture

Síndria Madurada is a Vite + React + TypeScript PWA. Capture, image cues, knocks, and history run in the browser. An optional Hono server stores anonymous scans when the guest opts in.

Depth: [docs/memory/architecture.md](../docs/memory/architecture.md).

## Client (`src/`)

| Piece | Where | Role |
| --- | --- | --- |
| Flow | `src/main.tsx`, `src/App.tsx` | Home, photo, knock, result, history. |
| Shell | `src/components/` | Landing, capture, knocks, result, history, and `ui/` primitives. |
| Vision | `src/lib/vision/` | Rind cues and the on-device watermelon gate. |
| Audio | `src/lib/audio/` | Knock onset, FFT, and acoustic features. |
| Score | `src/lib/score/` | Fusion and the eating window. Leave weights and verdict cuts unless the task says. |
| History | `src/lib/history/` | IndexedDB scan log and optional consent sync. |

IndexedDB (via `idb`) holds the scan records. The service worker and web app manifest come from `vite-plugin-pwa` in `vite.config.ts`.

## Optional server (`server/`)

Hono on Node with `node:sqlite`. Routes are `GET /health`, `POST /scans`, and `PATCH /scans/:id/feedback`. The PWA still works with the API unset. Setup and env: [server/README.md](../server/README.md).
