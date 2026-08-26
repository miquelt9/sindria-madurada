# Síndria optional API

Opt-in backend for training labels. The PWA still keeps IndexedDB as the source of truth. Nothing is uploaded unless `VITE_API_URL` is set **and** the guest turns on share consent.

## Run

From this folder:

```bash
npm install
npm run dev
```

The API listens on **port 8787** (`http://127.0.0.1:8787`). Override with `PORT` / `HOST` (default host `0.0.0.0` so phones on LAN can reach it).

In a second terminal, from the repo root, start Vite with the env var:

```bash
VITE_API_URL=http://127.0.0.1:8787 npm run dev
```

Or from the repo root (starts this API and Vite together):

```bash
npm run dev:full
```

`npm run dev` at the repo root stays web-only (no API, no uploads).

## Env

| Variable | Role |
|---|---|
| `VITE_API_URL` | **Frontend** (Vite). Empty = local-only. Example: `http://127.0.0.1:8787` |
| `PORT` | API port, default `8787` |
| `HOST` | Bind address, default `0.0.0.0` |
| `SQLITE_PATH` | SQLite file (default `data/sindria.sqlite`) |
| `CORS_ORIGIN` | Extra allowed origins, comma-separated |
| `SSL_KEY` / `SSL_CERT` | Optional TLS so a HTTPS Vite origin can call the API without mixed-content blocks |

LAN HTTPS: camera/mic need HTTPS on the phone. If Vite is `https://192.168.x.x:5173`, point `VITE_API_URL` at an HTTPS API origin (or use HTTP localhost). CORS already allows Vite localhost and private LAN HTTP/HTTPS origins.

## Routes

| Method | Path | Body |
|---|---|---|
| `GET` | `/health` | — (`/healthz` alias) |
| `POST` | `/scans` | Scan payload (upsert by `id`) |
| `PATCH` | `/scans/:id/feedback` | `{ deviceId, feedback, feedbackAt?, userNote? }` |

`POST /scans` JSON:

- `id`, `deviceId`, `createdAt`
- `photoJpeg` (cropped JPEG data URL; aliases `photoDataUrl`, `croppedJpeg`)
- `visualFeatures`, `audioFeatures`, `result` (fused score + optional eat-window fields)
- `eatWindow` (optional `{ eatFromDays, eatUntilDays, eatWindowLabel, willNotRipenOffVine }`)
- `feedback`, `feedbackAt`, `userNote`
- optional `variety`, `size`, `cropBox`, `groundSpotPoint`, `bellyPhotoJpeg`
- optional `audioBlob` (base64 / data URL) — column exists for later knock audio; this pass usually omits it

SQLite stores knock **features** now and keeps a nullable `audio_blob` column so a later audio upload does not need a second migration.
