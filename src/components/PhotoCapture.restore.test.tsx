// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { I18nProvider } from '../i18n';
import { en } from '../i18n/en';
import { PhotoCapture, PhotoFraming } from './PhotoCapture';

vi.mock('../lib/vision/watermelonGate', () => ({
  validateWatermelonImage: vi.fn(async () => {
    throw new Error('gate should not run when restoring a capture');
  }),
  warmupWatermelonGate: vi.fn(),
}));

const RIND = 'data:image/jpeg;base64,RIND';
const BELLY = 'data:image/jpeg;base64,BELLY';

const restored: PhotoFraming = {
  rindImage: RIND,
  bellyImage: BELLY,
  cropBox: { x: 0.1, y: 0.2, size: 0.5 },
  groundSpotPoint: { x: 0.4, y: 0.6 },
  variety: 'solid',
  size: 'small',
};

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 400;
  height = 300;
  private currentSrc = '';
  set src(value: string) {
    this.currentSrc = value;
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this.currentSrc;
  }
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('sindria.lang', 'en');
  localStorage.setItem('sindria.variety', 'striped');
  localStorage.setItem('sindria.size', 'large');

  vi.stubGlobal('Image', FakeImage);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => { throw new Error('no camera'); }) },
  });

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,CROPPED');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PhotoCapture restored framing', () => {
  it('reopens the existing crop editor with the preserved capture', async () => {
    const onPhotoCropped = vi.fn();
    const onBack = vi.fn();

    render(
      <StrictMode>
        <I18nProvider>
          <PhotoCapture initialFraming={restored} onPhotoCropped={onPhotoCropped} onBack={onBack} />
        </I18nProvider>
      </StrictMode>
    );

    expect(screen.getByAltText('Síndria capturada').getAttribute('src')).toBe(RIND);
    expect(screen.getByAltText('Panxa').getAttribute('src')).toBe(BELLY);
    expect(screen.getByText(en.bellyShotAdded)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.retake })).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.back })).toBeNull();
    expect(screen.queryByRole('button', { name: en.takePhoto })).toBeNull();
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();

    const crop = document.querySelector('.bg-primary\\/15') as HTMLElement;
    expect(crop.style.left).toBe('10%');
    expect(crop.style.top).toBe('20%');
    expect(crop.style.width).toBe('50%');

    const pin = document.querySelector('.animate-bounce') as HTMLElement;
    expect(pin.style.left).toBe('40%');
    expect(pin.style.top).toBe('60%');

    expect(screen.getByRole('button', { name: en.varietySolid }).className).toContain('bg-primary');
    expect(screen.getByRole('button', { name: en.varietyStriped }).className).not.toContain('bg-primary');
    expect(screen.getByRole('button', { name: 'P' }).className).toContain('bg-spot');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: en.cropModeCrop }));

    fireEvent.click(screen.getByRole('button', { name: en.continueKnocks }));

    await waitFor(() => expect(onPhotoCropped).toHaveBeenCalledTimes(1));
    expect(onPhotoCropped.mock.calls[0][0]).toMatchObject({
      photoDataUrl: 'data:image/jpeg;base64,CROPPED',
      bellyPhotoDataUrl: BELLY,
      variety: 'solid',
      size: 'small',
      framing: {
        rindImage: RIND,
        bellyImage: BELLY,
        cropBox: { x: 0.1, y: 0.2, size: 0.5 },
        groundSpotPoint: { x: 0.4, y: 0.6 },
        variety: 'solid',
        size: 'small',
      },
    });
    expect(onBack).not.toHaveBeenCalled();
  });
});
