// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MelonScanRecord } from '../types';
import { SYNC_QUEUE_STORAGE_KEY, setShareConsent } from './consent';
import { enqueueFeedbackSync, enqueueScanSync, flushSyncQueue, isBackendConfigured, shouldSync } from './sync';

function scan(id: string): MelonScanRecord {
  return {
    id,
    createdAt: 1_700_000_000_000,
    photoDataUrl: `data:image/jpeg;base64,${id}`,
    feedback: 'unrated',
    result: {
      overallScore: 72,
      verdict: 'likely_ripe',
      confidence: 80,
      visualScore: 70,
      audioScore: 74,
      visualFeatures: {
        stripeContrastScore: 0.2,
        groundSpotScore: 0.8,
        dullnessScore: 0.7,
        groundSpotDetected: true,
        notes: [],
      },
      audioFeatures: {
        peakFrequencyHz: 160,
        rmsEnergy: 0.02,
        spectralCentroidHz: 180,
        amplitudeStdDev: 0.1,
        skewness: 0,
        kurtosis: 0,
        lowMidRatio: 1.2,
        knockCount: 3,
        acousticRipenessScore: 0.8,
        notes: [],
      },
      summaryExplanation: 'Likely ripe',
      actionableTips: [],
      eatFromDays: 0,
      eatUntilDays: 2,
      eatWindowLabel: 'Eat now',
      willNotRipenOffVine: false,
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('sync gates', () => {
  it('stays off when VITE_API_URL is unset, even after consent', () => {
    expect(isBackendConfigured()).toBe(false);
    expect(shouldSync()).toBe(false);
    setShareConsent(true);
    expect(shouldSync()).toBe(false);
  });

  it('does not write a queue or call fetch when the backend is unset', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setShareConsent(true);

    enqueueScanSync(scan('melon-1'));
    enqueueFeedbackSync('melon-1', 'ripe', 'note', 1_700_000_000_123);
    await flushSyncQueue();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)).toBeNull();
  });

  it('leaves a stored queue untouched while the backend is unset', async () => {
    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, '{');
    setShareConsent(true);
    await flushSyncQueue();
    expect(localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)).toBe('{');

    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, '[{"kind":"scan"}]');
    await flushSyncQueue();
    expect(localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)).toBe('[{"kind":"scan"}]');
  });

  it.fails('keeps a scan that is enqueued while a flush is in flight', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    try {
      setShareConsent(true);
      let releaseFetch: (response: Response) => void = () => {};
      const fetchMock = vi.fn((url: string, init?: { body?: string }) => {
        expect(String(url)).toBe('https://api.example.test/scans');
        expect(JSON.parse(String(init?.body)).id).toBe('melon-1');
        return new Promise<Response>((resolve) => {
          releaseFetch = resolve;
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      enqueueScanSync(scan('melon-1'));
      expect(fetchMock).toHaveBeenCalledTimes(1);

      enqueueScanSync(scan('melon-2'));
      releaseFetch(new Response(null, { status: 200 }));
      await flushSyncQueue();

      const queued = JSON.parse(localStorage.getItem(SYNC_QUEUE_STORAGE_KEY) ?? '[]') as Array<{
        payload?: { id?: string };
      }>;
      expect(queued.map((item) => item.payload?.id)).toEqual(['melon-2']);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('drops a corrupt queue entry instead of rejecting every later flush', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    try {
      setShareConsent(true);
      const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const valid = { kind: 'scan', payload: { id: 'melon-ok' }, attempts: 0 };
      localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify([null, valid]));

      await flushSyncQueue();
      expect(JSON.parse(localStorage.getItem(SYNC_QUEUE_STORAGE_KEY) ?? 'null')).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      localStorage.setItem(
        SYNC_QUEUE_STORAGE_KEY,
        JSON.stringify([{ kind: 'scan', payload: { id: 'melon-later' }, attempts: 0 }]),
      );
      await flushSyncQueue();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(JSON.parse(localStorage.getItem(SYNC_QUEUE_STORAGE_KEY) ?? 'null')).toEqual([]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('drops a feedback entry that has no valid id', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test');
    try {
      setShareConsent(true);
      const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      localStorage.setItem(
        SYNC_QUEUE_STORAGE_KEY,
        JSON.stringify([
          { kind: 'feedback', payload: { feedback: 'ripe' }, attempts: 0 },
          { kind: 'feedback', id: 12, payload: { feedback: 'ripe' }, attempts: 0 },
          { kind: 'feedback', id: '', payload: { feedback: 'ripe' }, attempts: 0 },
          { kind: 'scan', payload: { id: 'melon-ok' }, attempts: 0 },
        ]),
      );

      await flushSyncQueue();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://api.example.test/scans');
      expect(JSON.parse(localStorage.getItem(SYNC_QUEUE_STORAGE_KEY) ?? 'null')).toEqual([]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
