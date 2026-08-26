import type { MelonScanRecord, TasteFeedback } from '../types';
import { getDeviceId, hasShareConsent, SYNC_QUEUE_STORAGE_KEY } from './consent';

const MAX_QUEUE_ITEMS = 20;
const MAX_ATTEMPTS = 12;

type EatWindow = {
  eatFromDays?: number | null;
  eatUntilDays?: number | null;
  eatWindowLabel?: string;
  willNotRipenOffVine?: boolean;
};

type ScanExtras = {
  bellyPhotoDataUrl?: string;
  bellyPhotoJpeg?: string;
  audioBlob?: string | null;
};

export type ScanSyncPayload = {
  id: string;
  deviceId: string;
  createdAt: number;
  photoJpeg: string;
  visualFeatures: MelonScanRecord['result']['visualFeatures'];
  audioFeatures: MelonScanRecord['result']['audioFeatures'];
  result: MelonScanRecord['result'];
  eatWindow: EatWindow;
  feedback: TasteFeedback;
  feedbackAt?: number;
  userNote?: string;
  variety?: MelonScanRecord['variety'];
  size?: MelonScanRecord['size'];
  cropBox?: MelonScanRecord['cropBox'];
  groundSpotPoint?: MelonScanRecord['groundSpotPoint'];
  bellyPhotoJpeg?: string;
  audioBlob?: string | null;
};

type FeedbackSyncPayload = {
  deviceId: string;
  feedback: TasteFeedback;
  feedbackAt: number;
  userNote?: string;
};

type QueueItem =
  | { kind: 'scan'; payload: ScanSyncPayload; attempts: number }
  | { kind: 'feedback'; id: string; payload: FeedbackSyncPayload; attempts: number };

let flushInFlight: Promise<void> | null = null;
let listenersBound = false;

function getApiUrl(): string {
  const env = (import.meta as { env?: Record<string, unknown> }).env;
  const raw = env?.VITE_API_URL;
  return typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
}

export function isBackendConfigured(): boolean {
  return getApiUrl().length > 0;
}

export function shouldSync(): boolean {
  return isBackendConfigured() && hasShareConsent();
}

function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function persistQueue(queue: QueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    return;
  } catch {
    // Quota: drop photos on older scan items, then drop oldest entries.
  }
  const slim = queue.map((item, index) => {
    if (item.kind !== 'scan' || index === queue.length - 1) {
      return item;
    }
    return {
      ...item,
      payload: { ...item.payload, photoJpeg: '', bellyPhotoJpeg: undefined, audioBlob: null },
    };
  });
  try {
    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(slim));
    return;
  } catch {
    try {
      localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(slim.slice(-3)));
    } catch {
      try {
        localStorage.removeItem(SYNC_QUEUE_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }
}

function enqueue(item: QueueItem): void {
  const queue = loadQueue();
  queue.push(item);
  persistQueue(queue.slice(-MAX_QUEUE_ITEMS));
}

function eatWindowFrom(scan: MelonScanRecord): EatWindow {
  const result = scan.result;
  return {
    eatFromDays: result.eatFromDays,
    eatUntilDays: result.eatUntilDays,
    eatWindowLabel: result.eatWindowLabel,
    willNotRipenOffVine: result.willNotRipenOffVine,
  };
}

function buildScanPayload(scan: MelonScanRecord): ScanSyncPayload {
  const extras = scan as MelonScanRecord & ScanExtras;
  const eatWindow = eatWindowFrom(scan);
  return {
    id: scan.id,
    deviceId: getDeviceId(),
    createdAt: scan.createdAt,
    photoJpeg: scan.photoDataUrl,
    visualFeatures: scan.result.visualFeatures,
    audioFeatures: scan.result.audioFeatures,
    result: scan.result,
    eatWindow,
    feedback: scan.feedback,
    feedbackAt: scan.feedbackAt,
    userNote: scan.userNote,
    variety: scan.variety,
    size: scan.size,
    cropBox: scan.cropBox,
    groundSpotPoint: scan.groundSpotPoint,
    bellyPhotoJpeg: extras.bellyPhotoJpeg ?? extras.bellyPhotoDataUrl,
    audioBlob: extras.audioBlob ?? null,
  };
}

function dropClientError(status: number): boolean {
  return status >= 400 && status < 500 && status !== 429;
}

async function sendItem(item: QueueItem): Promise<'ok' | 'drop' | 'retry'> {
  const base = getApiUrl();
  const url =
    item.kind === 'scan' ? `${base}/scans` : `${base}/scans/${encodeURIComponent(item.id)}/feedback`;
  const method = item.kind === 'scan' ? 'POST' : 'PATCH';
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.payload),
    });
    if (response.ok) {
      return 'ok';
    }
    if (dropClientError(response.status)) {
      return 'drop';
    }
    return 'retry';
  } catch {
    return 'retry';
  }
}

export async function flushSyncQueue(): Promise<void> {
  if (!shouldSync()) {
    return;
  }
  if (flushInFlight) {
    return flushInFlight;
  }
  flushInFlight = (async () => {
    const queue = loadQueue();
    const remaining: QueueItem[] = [];
    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i];
      const outcome = await sendItem(item);
      if (outcome === 'ok' || outcome === 'drop') {
        continue;
      }
      const attempts = (item.attempts ?? 0) + 1;
      if (attempts < MAX_ATTEMPTS) {
        remaining.push({ ...item, attempts });
        remaining.push(...queue.slice(i + 1));
      } else {
        remaining.push(...queue.slice(i + 1));
      }
      break;
    }
    persistQueue(remaining);
  })().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

function bindFlushListeners(): void {
  if (listenersBound || typeof window === 'undefined') {
    return;
  }
  listenersBound = true;
  window.addEventListener('online', () => {
    void flushSyncQueue();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void flushSyncQueue();
    }
  });
}

/** Fire-and-forget scan upload. No-ops when `VITE_API_URL` is empty or consent is off. */
export function enqueueScanSync(scan: MelonScanRecord): void {
  bindFlushListeners();
  if (!shouldSync()) {
    return;
  }
  try {
    enqueue({ kind: 'scan', payload: buildScanPayload(scan), attempts: 0 });
  } catch {
    return;
  }
  void flushSyncQueue();
}

/** Fire-and-forget taste feedback patch. Never throws. */
export function enqueueFeedbackSync(
  id: string,
  feedback: TasteFeedback,
  note?: string,
  feedbackAt?: number,
): void {
  bindFlushListeners();
  if (!shouldSync()) {
    return;
  }
  try {
    enqueue({
      kind: 'feedback',
      id,
      payload: {
        deviceId: getDeviceId(),
        feedback,
        feedbackAt: feedbackAt ?? Date.now(),
        userNote: note,
      },
      attempts: 0,
    });
  } catch {
    return;
  }
  void flushSyncQueue();
}

bindFlushListeners();
if (typeof window !== 'undefined') {
  void flushSyncQueue();
}
