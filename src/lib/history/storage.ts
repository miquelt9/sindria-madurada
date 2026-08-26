import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MelonScanRecord, TasteFeedback } from '../types';
import { enqueueFeedbackSync, enqueueScanSync } from './sync';

interface SindriaDB extends DBSchema {
  scans: {
    key: string;
    value: MelonScanRecord;
    indexes: {
      'by-date': number;
      'by-feedback': string;
    };
  };
}

const DB_NAME = 'sindria-madurada-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SindriaDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SindriaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SindriaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('scans')) {
          const store = db.createObjectStore('scans', { keyPath: 'id' });
          store.createIndex('by-date', 'createdAt');
          store.createIndex('by-feedback', 'feedback');
        }
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function saveScanRecord(scan: MelonScanRecord): Promise<void> {
  const db = await getDB();
  await db.put('scans', scan);
  try {
    enqueueScanSync(scan);
  } catch {
    // IndexedDB is source of truth; network sync must never block scoring.
  }
}

export async function getAllScanRecords(): Promise<MelonScanRecord[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('scans', 'by-date');
  return records.reverse(); // Newest first
}

export async function getScanRecordById(id: string): Promise<MelonScanRecord | undefined> {
  const db = await getDB();
  return db.get('scans', id);
}

export async function updateScanFeedback(id: string, feedback: TasteFeedback, note?: string): Promise<void> {
  const db = await getDB();
  const record = await db.get('scans', id);
  if (!record) return;

  record.feedback = feedback;
  record.feedbackAt = Date.now();
  if (note !== undefined) {
    record.userNote = note;
  }
  await db.put('scans', record);
  try {
    enqueueFeedbackSync(id, feedback, note, record.feedbackAt);
  } catch {
    // IndexedDB is source of truth; network sync must never block scoring.
  }
}

export async function deleteScanRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('scans', id);
}

export async function clearAllScans(): Promise<void> {
  const db = await getDB();
  await db.clear('scans');
}
