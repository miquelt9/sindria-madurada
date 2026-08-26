import { describe, it, expect } from 'vitest';
import { analyzeWatermelonImage, rgbToHsv } from './analyzer';
import { fuseRipenessSignals } from '../score/fusion';
import { AudioFeatures } from '../types';

describe('Vision Heuristics & Multimodal Fusion', () => {
  it('converts RGB to HSV accurately', () => {
    const yellow = rgbToHsv(255, 204, 0); // Golden yellow
    expect(yellow.h).toBeGreaterThan(40);
    expect(yellow.h).toBeLessThan(55);
    expect(yellow.s).toBeGreaterThan(0.9);
  });

  it('detects ripe characteristics from mock image data with yellow ground spot & high stripe contrast', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);

    // Create alternating dark green and light green stripes with a yellow patch in lower third
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        if (y > 75 && x > 30 && x < 70) {
          // Butter yellow spot (R: 240, G: 200, B: 60)
          data[idx] = 240;
          data[idx + 1] = 200;
          data[idx + 2] = 60;
          data[idx + 3] = 255;
        } else if ((x % 15) < 7) {
          // Dark green stripe (R: 20, G: 80, B: 30)
          data[idx] = 20;
          data[idx + 1] = 80;
          data[idx + 2] = 30;
          data[idx + 3] = 255;
        } else {
          // Light green ribbon valley (R: 120, G: 200, B: 110)
          data[idx] = 120;
          data[idx + 1] = 200;
          data[idx + 2] = 110;
          data[idx + 3] = 255;
        }
      }
    }

    const mockImageData = { data, width, height, colorSpace: 'srgb' as PredefinedColorSpace };
    const visual = analyzeWatermelonImage(mockImageData);

    expect(visual.groundSpotDetected).toBe(true);
    expect(visual.groundSpotScore).toBeGreaterThan(0.6);
    expect(visual.stripeContrastScore).toBeGreaterThan(0.4);

    // Fuse with ideal audio
    const mockAudio: AudioFeatures = {
      peakFrequencyHz: 155,
      rmsEnergy: 0.12,
      spectralCentroidHz: 210,
      amplitudeStdDev: 0.08,
      skewness: 1.2,
      kurtosis: 3.1,
      lowMidRatio: 2.2,
      knockCount: 3,
      acousticRipenessScore: 0.88,
      notes: ['Deep resonant tone'],
    };

    const fused = fuseRipenessSignals(visual, mockAudio);
    expect(fused.verdict).toBe('likely_ripe');
    expect(fused.overallScore).toBeGreaterThanOrEqual(70);
    expect(fused.actionableTips.length).toBeGreaterThan(0);
    expect(fused.eatFromDays).toBe(0);
    expect(fused.eatUntilDays).toBe(2);
    expect(fused.willNotRipenOffVine).toBe(false);
  });

  it('scores ground spot from a dedicated belly image instead of the rind crop', () => {
    const width = 40;
    const height = 40;

    const greenData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      greenData[idx] = 20;
      greenData[idx + 1] = 80;
      greenData[idx + 2] = 30;
      greenData[idx + 3] = 255;
    }

    const yellowData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      yellowData[idx] = 240;
      yellowData[idx + 1] = 200;
      yellowData[idx + 2] = 60;
      yellowData[idx + 3] = 255;
    }

    const rind = { data: greenData, width, height, colorSpace: 'srgb' as PredefinedColorSpace };
    const belly = { data: yellowData, width, height, colorSpace: 'srgb' as PredefinedColorSpace };

    const rindOnly = analyzeWatermelonImage(rind);
    expect(rindOnly.groundSpotDetected).toBe(false);

    const withBelly = analyzeWatermelonImage(rind, { groundSpotImage: belly });
    expect(withBelly.groundSpotDetected).toBe(true);
    expect(withBelly.groundSpotScore).toBeGreaterThan(0.6);
    expect(withBelly.stripeContrastScore).toBe(rindOnly.stripeContrastScore);
    expect(withBelly.notes.some((n) => /underside photo/i.test(n))).toBe(true);
  });
});
