import { createServer as createHttpsServer } from 'node:https';
import { readFileSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { corsOrigin } from './cors';
import { openDatabase, type ScanRow } from './db';

const PORT = Number.parseInt(process.env.PORT ?? '8787', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const FEEDBACK_VALUES = new Set(['ripe', 'unripe', 'overripe', 'unrated']);

const db = openDatabase();
const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => corsOrigin(origin) ?? '',
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  }),
);

app.use(
  '*',
  bodyLimit({
    maxSize: 12 * 1024 * 1024,
    onError: (c) => c.json({ error: 'payload too large' }, 413),
  }),
);

function health(c: Context) {
  db.prepare('SELECT 1 AS ok').get();
  return c.json({ ok: true, service: 'sindria-api' });
}

app.get('/health', health);
app.get('/healthz', health);

app.post('/scans', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid json' }, 400);
  }

  const parsed = parseScanPayload(body);
  if ('error' in parsed) {
    return c.json({ error: parsed.error }, 400);
  }

  const existing = db.prepare('SELECT device_id, feedback FROM scans WHERE id = ?').get(parsed.id) as
    | Pick<ScanRow, 'device_id' | 'feedback'>
    | undefined;

  if (existing && existing.device_id !== parsed.deviceId) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const keepExistingFeedback =
    existing !== undefined && existing.feedback !== 'unrated' && parsed.feedback === 'unrated';

  db.prepare(
    `
    INSERT INTO scans (
      id, device_id, photo_jpeg, visual_features, audio_features, fused_result,
      eat_from_days, eat_until_days, eat_window_label, will_not_ripen_off_vine,
      created_at, feedback, feedback_at, user_note, variety, size,
      crop_box, ground_spot_point, belly_photo_jpeg, audio_blob
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      photo_jpeg = excluded.photo_jpeg,
      visual_features = excluded.visual_features,
      audio_features = excluded.audio_features,
      fused_result = excluded.fused_result,
      eat_from_days = excluded.eat_from_days,
      eat_until_days = excluded.eat_until_days,
      eat_window_label = excluded.eat_window_label,
      will_not_ripen_off_vine = excluded.will_not_ripen_off_vine,
      created_at = excluded.created_at,
      feedback = CASE WHEN ? THEN scans.feedback ELSE excluded.feedback END,
      feedback_at = CASE WHEN ? THEN scans.feedback_at ELSE excluded.feedback_at END,
      user_note = COALESCE(excluded.user_note, scans.user_note),
      variety = excluded.variety,
      size = excluded.size,
      crop_box = excluded.crop_box,
      ground_spot_point = excluded.ground_spot_point,
      belly_photo_jpeg = excluded.belly_photo_jpeg,
      audio_blob = COALESCE(excluded.audio_blob, scans.audio_blob)
    WHERE scans.device_id = excluded.device_id
    `,
  ).run(
    parsed.id,
    parsed.deviceId,
    parsed.photoJpeg,
    parsed.visualFeaturesJson,
    parsed.audioFeaturesJson,
    parsed.fusedResultJson,
    parsed.eatFromDays,
    parsed.eatUntilDays,
    parsed.eatWindowLabel,
    parsed.willNotRipenOffVine,
    parsed.createdAt,
    parsed.feedback,
    parsed.feedbackAt,
    parsed.userNote,
    parsed.variety,
    parsed.size,
    parsed.cropBoxJson,
    parsed.groundSpotPointJson,
    parsed.bellyPhotoJpeg,
    parsed.audioBlob,
    keepExistingFeedback ? 1 : 0,
    keepExistingFeedback ? 1 : 0,
  );

  return c.json({ ok: true, id: parsed.id }, existing ? 200 : 201);
});

app.patch('/scans/:id/feedback', async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'missing id' }, 400);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid json' }, 400);
  }

  if (!isRecord(body)) {
    return c.json({ error: 'invalid body' }, 400);
  }

  const deviceId = asNonEmptyString(body.deviceId);
  const feedback = asNonEmptyString(body.feedback);
  if (!deviceId || !feedback || !FEEDBACK_VALUES.has(feedback)) {
    return c.json({ error: 'deviceId and feedback are required' }, 400);
  }

  const existing = db.prepare('SELECT device_id FROM scans WHERE id = ?').get(id) as
    | Pick<ScanRow, 'device_id'>
    | undefined;

  if (!existing) {
    return c.json({ error: 'not found' }, 404);
  }
  if (existing.device_id !== deviceId) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const feedbackAt = asFiniteNumber(body.feedbackAt) ?? Date.now();
  const userNote = optionalString(body.userNote);

  db.prepare(
    `
    UPDATE scans
    SET feedback = ?, feedback_at = ?, user_note = COALESCE(?, user_note)
    WHERE id = ? AND device_id = ?
    `,
  ).run(feedback, feedbackAt, userNote, id, deviceId);

  return c.json({ ok: true, id });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function jsonColumn(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function decodeOptionalAudioBlob(value: unknown): Uint8Array | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const comma = value.indexOf(',');
  const base64 = value.startsWith('data:') && comma >= 0 ? value.slice(comma + 1) : value;
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

function firstRecord(...values: unknown[]): Record<string, unknown> | undefined {
  for (const value of values) {
    if (isRecord(value)) {
      return value;
    }
  }
  return undefined;
}

type ParsedScan = {
  id: string;
  deviceId: string;
  photoJpeg: string | null;
  visualFeaturesJson: string;
  audioFeaturesJson: string;
  fusedResultJson: string;
  eatFromDays: number | null;
  eatUntilDays: number | null;
  eatWindowLabel: string | null;
  willNotRipenOffVine: number | null;
  createdAt: number;
  feedback: string;
  feedbackAt: number | null;
  userNote: string | null;
  variety: string | null;
  size: string | null;
  cropBoxJson: string | null;
  groundSpotPointJson: string | null;
  bellyPhotoJpeg: string | null;
  audioBlob: Uint8Array | null;
};

function parseScanPayload(body: unknown): ParsedScan | { error: string } {
  if (!isRecord(body)) {
    return { error: 'invalid body' };
  }

  const id = asNonEmptyString(body.id);
  const deviceId = asNonEmptyString(body.deviceId);
  if (!id || !deviceId) {
    return { error: 'id and deviceId are required' };
  }

  const createdAt = asFiniteNumber(body.createdAt) ?? asFiniteNumber(body.timestamp);
  if (createdAt === null) {
    return { error: 'createdAt is required' };
  }

  const result = firstRecord(body.result);
  const visualFeatures = firstRecord(
    body.visualFeatures,
    body.visualFeatures,
    result?.visualFeatures,
    result?.visualFeatures,
  );
  const audioFeatures = firstRecord(
    body.audioFeatures,
    body.audioFeatures,
    result?.audioFeatures,
    result?.audioFeatures,
  );
  if (!visualFeatures || !audioFeatures || !result) {
    return { error: 'visualFeatures, audioFeatures, and result are required' };
  }

  const photoJpeg =
    optionalString(body.photoJpeg) ??
    optionalString(body.photoDataUrl) ??
    optionalString(body.photoDataUrl) ??
    optionalString(body.croppedJpeg);

  const eatSource = firstRecord(body.eatWindow, result) ?? {};
  const eatFromDays = asFiniteNumber(eatSource.eatFromDays) ?? asFiniteNumber(eatSource.eatFromDays);
  const eatUntilDays = asFiniteNumber(eatSource.eatUntilDays) ?? asFiniteNumber(eatSource.eatUntilDays);
  const eatWindowLabel = optionalString(eatSource.eatWindowLabel) ?? optionalString(eatSource.eatWindowLabel);
  const willNotRipenRaw = eatSource.willNotRipenOffVine ?? eatSource.willNotRipenOffVine;
  const willNotRipen =
    typeof willNotRipenRaw === 'boolean' ? (willNotRipenRaw ? 1 : 0) : asFiniteNumber(willNotRipenRaw);

  const feedbackRaw = asNonEmptyString(body.feedback) ?? 'unrated';
  if (!FEEDBACK_VALUES.has(feedbackRaw)) {
    return { error: 'invalid feedback' };
  }

  return {
    id,
    deviceId,
    photoJpeg,
    visualFeaturesJson: JSON.stringify(visualFeatures),
    audioFeaturesJson: JSON.stringify(audioFeatures),
    fusedResultJson: JSON.stringify(result),
    eatFromDays,
    eatUntilDays,
    eatWindowLabel,
    willNotRipenOffVine: willNotRipen,
    createdAt,
    feedback: feedbackRaw,
    feedbackAt: asFiniteNumber(body.feedbackAt) ?? asFiniteNumber(body.feedbackAt),
    userNote: optionalString(body.userNote) ?? optionalString(body.userNote),
    variety: optionalString(body.variety),
    size: optionalString(body.size),
    cropBoxJson: jsonColumn(body.cropBox ?? body.cropBox),
    groundSpotPointJson: jsonColumn(body.groundSpotPoint ?? body.groundSpotPoint),
    bellyPhotoJpeg:
      optionalString(body.bellyPhotoJpeg) ??
      optionalString(body.bellyPhotoDataUrl) ??
      optionalString(body.bellyPhotoDataUrl),
    audioBlob: decodeOptionalAudioBlob(body.audioBlob),
  };
}

const sslKeyPath = process.env.SSL_KEY;
const sslCertPath = process.env.SSL_CERT;
const useTls = Boolean(sslKeyPath && sslCertPath);
const listenLabel = `${useTls ? 'https' : 'http'}://${HOST}:${PORT}`;

if (useTls && sslKeyPath && sslCertPath) {
  serve({
    fetch: app.fetch,
    port: PORT,
    hostname: HOST,
    createServer: createHttpsServer,
    serverOptions: {
      key: readFileSync(sslKeyPath),
      cert: readFileSync(sslCertPath),
    },
  });
} else {
  serve({
    fetch: app.fetch,
    port: PORT,
    hostname: HOST,
  });
}

console.log(`Síndria API listening on ${listenLabel}`);
