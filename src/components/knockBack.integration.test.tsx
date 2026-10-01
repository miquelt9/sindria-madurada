// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { I18nProvider } from '../i18n';
import { en } from '../i18n/en';
import { ThemeProvider } from './ui/ThemeProvider';
import { App } from '../App';
import { backFromKnock } from '../lib/scan/backFromKnock';

const recorderHost = vi.hoisted(() => ({
  instances: [] as Array<{
    onKnockDetected?: (count: number) => void;
    onVolumeUpdate?: (volume: number) => void;
    onSpectrumUpdate?: (data: Uint8Array) => void;
    startListening: ReturnType<typeof vi.fn>;
    stopAndAnalyze: ReturnType<typeof vi.fn>;
    captureManualKnock: ReturnType<typeof vi.fn>;
    getKnockCount: ReturnType<typeof vi.fn>;
    liveRms: number;
    noiseFloor: number;
  }>,
}));

const idb = vi.hoisted(() => {
  const put = vi.fn(async (..._args: unknown[]) => {});
  const openDB = vi.fn(async () => ({
    put,
    get: async () => undefined,
    getAllFromIndex: async () => [],
    delete: async () => {},
    clear: async () => {},
  }));
  return { put, openDB };
});

const vision = vi.hoisted(() => ({
  analyzeWatermelonImage: vi.fn(() => ({
    stripeContrastScore: 0.82,
    groundSpotScore: 0.74,
    dullnessScore: 0.61,
    groundSpotDetected: true,
    notes: ['preserved-visual'],
  })),
}));

vi.mock('idb', () => ({
  openDB: idb.openDB,
}));

vi.mock('../lib/vision/analyzer', () => ({
  analyzeWatermelonImage: vision.analyzeWatermelonImage,
}));

vi.mock('../lib/vision/watermelonGate', () => ({
  validateWatermelonImage: vi.fn(async () => ({ passed: true, confidence: 90 })),
  warmupWatermelonGate: vi.fn(async () => {}),
}));

vi.mock('../lib/audio/recorder', () => ({
  KnockRecorder: class {
    liveRms = 0;
    noiseFloor = 0.005;
    onKnockDetected?: (count: number) => void;
    onVolumeUpdate?: (volume: number) => void;
    onSpectrumUpdate?: (data: Uint8Array) => void;
    startListening = vi.fn(async () => {});
    stopAndAnalyze = vi.fn(() => ({
      peakFrequencyHz: 160,
      rmsEnergy: 0.02,
      spectralCentroidHz: 180,
      amplitudeStdDev: 0.1,
      skewness: 0,
      kurtosis: 0,
      lowMidRatio: 1.2,
      knockCount: 3,
      acousticRipenessScore: 0.8,
      notes: ['completed'],
    }));
    captureManualKnock = vi.fn(() => false);
    getKnockCount = vi.fn(() => 0);
    constructor() {
      recorderHost.instances.push(this);
    }
  },
}));

vi.mock('../lib/scan/backFromKnock', async () => {
  const actual = await vi.importActual<typeof import('../lib/scan/backFromKnock')>(
    '../lib/scan/backFromKnock'
  );
  return {
    backFromKnock: vi.fn((state: { step: string }) => actual.backFromKnock(state)),
  };
});

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 640;
  height = 480;
  private currentSrc = '';
  set src(value: string) {
    this.currentSrc = value;
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this.currentSrc;
  }
}

function installDomStubs() {
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal('createImageBitmap', vi.fn(async () => {
    throw new Error('use FileReader');
  }));
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => {
        throw new Error('no camera');
      }),
    },
  });

  const ctx = {
    drawImage: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(4, w * h * 4)),
      width: w,
      height: h,
    })),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => ctx
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,CROPPED');
}

function renderApp() {
  return render(
    <StrictMode>
      <I18nProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </I18nProvider>
    </StrictMode>
  );
}

function stepStatus(step: string): string | null {
  return document.querySelector(`[data-step="${step}"]`)?.getAttribute('data-status') ?? null;
}

async function capturePhoto(): Promise<{ rindSrc: string; cropStyle: string }> {
  fireEvent.click(screen.getByRole('button', { name: en.landingCheckCta }));
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array([9, 8, 7, 6])], 'melon.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByRole('button', { name: en.continueKnocks }, { timeout: 3000 });

  fireEvent.click(screen.getByRole('button', { name: en.varietySolid }));
  fireEvent.click(screen.getByRole('button', { name: 'G' }));

  const frame = document.querySelector('.cursor-crosshair') as HTMLElement;
  frame.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 200,
      bottom: 200,
      width: 200,
      height: 200,
      toJSON() {
        return {};
      },
    }) as DOMRect;
  fireEvent.click(frame, { clientX: 160, clientY: 40 });

  const rind = document.querySelector('img[alt="Síndria capturada"]') as HTMLImageElement;
  const crop = document.querySelector('.bg-primary\\/15') as HTMLElement;
  return {
    rindSrc: rind.getAttribute('src') || '',
    cropStyle: crop.getAttribute('style') || '',
  };
}

async function confirmToKnock() {
  fireEvent.click(screen.getByRole('button', { name: en.continueKnocks }));
  await screen.findByRole('heading', { name: en.knockTitle }, { timeout: 3000 });
}

beforeEach(() => {
  recorderHost.instances.length = 0;
  idb.put.mockClear();
  idb.openDB.mockClear();
  vision.analyzeWatermelonImage.mockClear();
  vi.mocked(backFromKnock).mockClear();
  localStorage.clear();
  localStorage.setItem('sindria.lang', 'en');
  installDomStubs();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Back from Knock to Photo', () => {
  it('returns to photo with the capture intact and does not write IndexedDB', async () => {
    renderApp();
    const { rindSrc, cropStyle } = await capturePhoto();
    expect(rindSrc.length).toBeGreaterThan(0);
    expect(cropStyle).not.toContain('width: 60%');
    expect(cropStyle).not.toContain('left: 20%');

    const cameraCalls = vi.mocked(navigator.mediaDevices.getUserMedia).mock.calls.length;
    await confirmToKnock();

    expect(stepStatus('photo')).toBe('completed');
    expect(stepStatus('knock')).toBe('current');
    expect(stepStatus('result')).toBe('upcoming');

    const stepper = document.querySelector('[data-scan-stepper]');
    expect(stepper?.querySelector('button, a')).toBeNull();
    fireEvent.click(document.querySelector('[data-step="photo"]') as HTMLElement);
    expect(screen.getByRole('heading', { name: en.knockTitle })).toBeTruthy();
    expect(stepStatus('knock')).toBe('current');

    fireEvent.click(screen.getByRole('button', { name: en.knockStartBtn }));
    await screen.findByRole('button', { name: /Finish with/ });
    const recorder = recorderHost.instances.at(-1);
    act(() => {
      recorder?.onKnockDetected?.(2);
    });
    expect(screen.getByText(/Detected knock #2/)).toBeTruthy();

    localStorage.setItem('sindria.variety', 'striped');
    localStorage.setItem('sindria.size', 'small');
    const opensBeforeBack = idb.openDB.mock.calls.length;
    const backButton = screen.getByRole('button', { name: en.back });
    expect(stepper?.contains(backButton)).toBe(false);

    fireEvent.click(backButton);

    await screen.findByRole('button', { name: en.continueKnocks });
    expect(screen.queryByRole('heading', { name: en.knockTitle })).toBeNull();
    expect(screen.queryByText(en.landingTagline)).toBeNull();
    expect(screen.queryByText(en.verdictRipe)).toBeNull();
    expect(stepStatus('photo')).toBe('current');
    expect(stepStatus('knock')).toBe('upcoming');
    expect(screen.queryByRole('button', { name: en.back })).toBeNull();

    expect(document.querySelector('img[alt="Síndria capturada"]')?.getAttribute('src')).toBe(rindSrc);
    expect(document.querySelector('.bg-primary\\/15')?.getAttribute('style')).toBe(cropStyle);
    expect(screen.getByRole('button', { name: en.varietySolid }).className).toContain('bg-primary');
    expect(screen.getByRole('button', { name: 'G' }).className).toContain('bg-spot');
    expect(screen.getByRole('button', { name: 'P' }).className).not.toContain('bg-spot');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: en.cropModeCrop }));
    expect(vi.mocked(navigator.mediaDevices.getUserMedia).mock.calls.length).toBe(cameraCalls);

    expect(idb.put).not.toHaveBeenCalled();
    expect(idb.openDB.mock.calls.length).toBe(opensBeforeBack);
    expect(vi.mocked(backFromKnock)).toHaveBeenCalledTimes(1);
    const snapshot = vi.mocked(backFromKnock).mock.calls[0][0] as {
      step: string;
      variety: string;
      size: string;
      croppedPhotoUrl: string;
      visualFeatures: { notes: string[] } | null;
      framing: { rindImage: string; cropBox: { x: number; y: number; size: number } };
    };
    expect(snapshot.step).toBe('knock');
    expect(snapshot.variety).toBe('solid');
    expect(snapshot.size).toBe('large');
    expect(snapshot.croppedPhotoUrl).toBe('data:image/jpeg;base64,CROPPED');
    expect(snapshot.visualFeatures?.notes).toEqual(['preserved-visual']);
    expect(snapshot.framing.rindImage).toBe(rindSrc);
    const next = vi.mocked(backFromKnock).mock.results[0].value as typeof snapshot;
    expect(next.step).toBe('photo');
    expect(next.visualFeatures).toBe(snapshot.visualFeatures);
    expect(next.framing).toBe(snapshot.framing);

    fireEvent.click(screen.getByRole('button', { name: en.continueKnocks }));
    await screen.findByRole('heading', { name: en.knockTitle });
    expect(screen.getByText(en.knockPressStart)).toBeTruthy();
    expect(screen.queryByText(/Detected knock #2/)).toBeNull();
    expect(stepStatus('knock')).toBe('current');
    expect(idb.put).not.toHaveBeenCalled();
    expect(recorder?.stopAndAnalyze).toHaveBeenCalled();
  });

  it('still skips knock from the restored photo without an earlier history row', async () => {
    renderApp();
    await capturePhoto();
    await confirmToKnock();
    fireEvent.click(screen.getByRole('button', { name: en.back }));
    await screen.findByRole('button', { name: en.continueKnocks });
    expect(idb.put).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: en.continueKnocks }));
    await screen.findByRole('heading', { name: en.knockTitle });
    fireEvent.click(screen.getByRole('button', { name: en.knockSkip }));

    expect(await screen.findByText(en.verdictRipe)).toBeTruthy();
    expect(stepStatus('result')).toBe('current');
    expect(idb.put).toHaveBeenCalledTimes(1);
    const saved = idb.put.mock.calls[0][1] as unknown as {
      photoDataUrl: string;
      variety: string;
      size: string;
      feedback: string;
      result: { audioFeatures: { notes: string[] } };
    };
    expect(saved.photoDataUrl).toBe('data:image/jpeg;base64,CROPPED');
    expect(saved.variety).toBe('solid');
    expect(saved.size).toBe('large');
    expect(saved.feedback).toBe('unrated');
    expect(saved.result.audioFeatures.notes).toContain('Audio knock skipped by user');
  });

  it('still completes knock from the restored photo', async () => {
    renderApp();
    await capturePhoto();
    await confirmToKnock();
    fireEvent.click(screen.getByRole('button', { name: en.back }));
    await screen.findByRole('button', { name: en.continueKnocks });
    fireEvent.click(screen.getByRole('button', { name: en.continueKnocks }));
    await screen.findByRole('heading', { name: en.knockTitle });
    expect(idb.put).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: en.knockStartBtn }));
    const finish = await screen.findByRole('button', { name: /Finish with/ });
    fireEvent.click(finish);

    expect(await screen.findByText(en.verdictRipe)).toBeTruthy();
    expect(idb.put).toHaveBeenCalledTimes(1);
    const saved = idb.put.mock.calls[0][1] as unknown as {
      result: { audioFeatures: { knockCount: number } };
    };
    expect(saved.result.audioFeatures.knockCount).toBe(3);
  });
});
