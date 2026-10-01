// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import { ca } from '../i18n/ca';
import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { KnockRecorderView } from './KnockRecorderView';

type RecorderStub = {
  onKnockDetected?: (count: number) => void;
  onVolumeUpdate?: (volume: number) => void;
  onSpectrumUpdate?: (data: Uint8Array) => void;
  startListening: ReturnType<typeof vi.fn>;
  stopAndAnalyze: ReturnType<typeof vi.fn>;
  captureManualKnock: ReturnType<typeof vi.fn>;
  getKnockCount: ReturnType<typeof vi.fn>;
  liveRms: number;
  noiseFloor: number;
};

const recorderHost = vi.hoisted(() => ({
  instances: [] as RecorderStub[],
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
      peakFrequencyHz: 140,
      rmsEnergy: 0.02,
      spectralCentroidHz: 160,
      amplitudeStdDev: 0.1,
      skewness: 0,
      kurtosis: 0,
      lowMidRatio: 1,
      knockCount: 3,
      acousticRipenessScore: 0.8,
      notes: [],
    }));
    captureManualKnock = vi.fn(() => false);
    getKnockCount = vi.fn(() => 0);
    constructor() {
      recorderHost.instances.push(this);
    }
  },
}));

function renderKnock(onBack: () => void, onKnockComplete: (features: unknown) => void = () => {}) {
  return render(
    <I18nProvider>
      <KnockRecorderView onKnockComplete={onKnockComplete} onBack={onBack} />
    </I18nProvider>
  );
}

beforeEach(() => {
  recorderHost.instances.length = 0;
  localStorage.clear();
  localStorage.setItem('sindria.lang', 'en');
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Knock back control', () => {
  it.each([
    ['ca', ca],
    ['es', es],
    ['en', en],
  ] as const)('labels Back from the %s catalog and keeps a 44px target', (lang, dict) => {
    localStorage.setItem('sindria.lang', lang);
    renderKnock(() => {});

    const button = screen.getByRole('button', { name: dict.back });
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toContain(dict.back);
    expect(button.className).toContain('touch-target');
    expect(button.className).toContain('min-h-[44px]');
    expect(button.className).toContain('min-w-[44px]');
  });

  it('stops the session and drops a pending auto-finish', () => {
    vi.useFakeTimers();
    const onBack = vi.fn();
    const onKnockComplete = vi.fn();
    renderKnock(onBack, onKnockComplete);

    const recorder = recorderHost.instances.at(-1);
    expect(recorder).toBeTruthy();

    act(() => {
      recorder?.onKnockDetected?.(3);
    });

    fireEvent.click(screen.getByRole('button', { name: en.back }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onKnockComplete).not.toHaveBeenCalled();
    expect(recorder?.stopAndAnalyze).toHaveBeenCalled();
    expect(screen.getByText(en.knockPressStart)).toBeTruthy();
    expect(screen.queryByText(/Detected knock #3/)).toBeNull();

    act(() => {
      recorder?.onKnockDetected?.(1);
    });
    expect(onKnockComplete).not.toHaveBeenCalled();
  });
});
