# Working in sindria-madurada

Guest-first, client-only PWA for a coarse three-way stage and texture hint: likely ripe, borderline, or likely unripe. The hint comes from a photo (field spot as loss of green against the rind, stripe contrast) and several knocks (dull versus tight). A hollow sound is a separate warning, not a ripeness point. It is not a sweetness test. This file is how to change the repo. Install and features stay in [README.md](../README.md).

## Scope

- Change the app in `src/`. The optional Hono API is `server/`. IndexedDB stays the source of truth. Nothing uploads unless `VITE_API_URL` is set and the guest turns sharing on.
- Verdict words only: `Likely ripe`, `Unsure / Borderline`, `Likely unripe`.
- Leave fusion weights and verdict cuts in `src/lib/score/fusion.ts` alone unless the task says to change them. The mix is a product choice.
- Do not claim sugar, °Brix, a headline accuracy, laser vibrometry, NIR, or a fixed ripe frequency window. A hollow flag does not add ripeness points.
- Prefer these `.agents/` notes over `.cursor/rules/sindria.mdc`.

## Docs

| File | What it is |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Short app map |
| [DESIGN.md](./DESIGN.md) | Look intent |
| [testing.md](./testing.md) | What `npm test` and CI lock |
| [scan-stepper.md](./scan-stepper.md) | Photo / Knock / Result stepper |
| [touch-targets.md](./touch-targets.md) | 44px hit areas |
| [../AGENTS.md](../AGENTS.md) | Product principles and the memory index |
| [../docs/memory/](../docs/memory/) | Product, research, architecture, roadmap, papers |

Link those files. Do not paste the topic notes or the memory essays into this file.

## Changes

- UI uses the semantic watermelon tokens and `cn(...)` from `src/lib/cn.ts`. Capture, vision, audio, scoring, and history stay in the browser.
- `npm test` is Vitest. `npm run build` typechecks and builds the PWA.

## Verify

`npm test` runs Vitest. CI (`.github/workflows/ci.yml`) runs `npm ci` and `npm test` on pull requests and on pushes to `main`, on Node 22. Details: [testing.md](./testing.md).
