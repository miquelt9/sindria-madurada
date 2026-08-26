import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function resolveDbPath(): string {
  const fromEnv = process.env.SQLITE_PATH ?? process.env.DATABASE_PATH;
  if (fromEnv && fromEnv.length > 0) {
    return isAbsolute(fromEnv) ? fromEnv : join(serverRoot, fromEnv);
  }
  return join(serverRoot, 'data', 'sindria.sqlite');
}

export function openDatabase(): DatabaseSync {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      photo_jpeg TEXT,
      visual_features TEXT NOT NULL,
      audio_features TEXT NOT NULL,
      fused_result TEXT NOT NULL,
      eat_from_days INTEGER,
      eat_until_days INTEGER,
      eat_window_label TEXT,
      will_not_ripen_off_vine INTEGER,
      created_at INTEGER NOT NULL,
      feedback TEXT NOT NULL DEFAULT 'unrated',
      feedback_at INTEGER,
      user_note TEXT,
      variety TEXT,
      size TEXT,
      crop_box TEXT,
      ground_spot_point TEXT,
      belly_photo_jpeg TEXT,
      audio_blob BLOB
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_scans_device_id ON scans(device_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);');
  return db;
}

export type ScanRow = {
  id: string;
  device_id: string;
  photo_jpeg: string | null;
  visual_features: string;
  audio_features: string;
  fused_result: string;
  eat_from_days: number | null;
  eat_until_days: number | null;
  eat_window_label: string | null;
  will_not_ripen_off_vine: number | null;
  created_at: number;
  feedback: string;
  feedback_at: number | null;
  user_note: string | null;
  variety: string | null;
  size: string | null;
  crop_box: string | null;
  ground_spot_point: string | null;
  belly_photo_jpeg: string | null;
  audio_blob: Uint8Array | null;
};
