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

  it('converts the primary colors and black and white', () => {
    expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
    expect(rgbToHsv(255, 255, 255)).toEqual({ h: 0, s: 0, v: 1 });
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 1, v: 1 });
    expect(rgbToHsv(0, 255, 0)).toEqual({ h: 120, s: 1, v: 1 });
    expect(rgbToHsv(0, 0, 255)).toEqual({ h: 240, s: 1, v: 1 });
    expect(rgbToHsv(255, 255, 0).h).toBeCloseTo(60);
  });

  it('returns a neutral result when the image has no pixels', () => {
    const empty = analyzeWatermelonImage(fill(0, 0, [0, 0, 0]));
    expect(empty).toEqual({
      stripeContrastScore: 0.5,
      groundSpotScore: 0.5,
      dullnessScore: 0.5,
      groundSpotDetected: false,
      notes: ['No image data provided'],
    });
    expect(analyzeWatermelonImage(fill(0, 8, [255, 0, 0])).notes).toEqual(['No image data provided']);
  });

  it('scores a single dark pixel as dull, with no stripe samples and no field spot', () => {
    const visual = analyzeWatermelonImage(fill(1, 1, [0, 0, 0]));
    expect(visual.stripeContrastScore).toBe(0);
    expect(visual.groundSpotDetected).toBe(false);
    expect(visual.groundSpotScore).toBe(0.5);
    expect(visual.dullnessScore).toBe(1);
  });

  it('detects a pale field spot only after it covers more than 4% of the frame', () => {
    const below = analyzeWatermelonImage(mixed(0, 4));
    const above = analyzeWatermelonImage(mixed(0, 5));
    expect(below.groundSpotDetected).toBe(false);
    expect(below.groundSpotScore).toBe(0.5);
    expect(above.groundSpotDetected).toBe(true);
    expect(above.groundSpotScore).toBe(0.25);
  });

  it('detects a yellow field spot only after it covers more than 2% of the frame', () => {
    const below = analyzeWatermelonImage(mixed(2, 0));
    const above = analyzeWatermelonImage(mixed(3, 0));
    const yellowWins = analyzeWatermelonImage(mixed(3, 50));
    expect(below.groundSpotDetected).toBe(false);
    expect(above.groundSpotDetected).toBe(true);
    expect(above.groundSpotScore).toBeCloseTo(0.375);
    expect(yellowWins.groundSpotScore).toBeCloseTo(0.375);
  });

  it('keeps an out-of-range tap from throwing and scores a tap on a yellow frame', () => {
    const outside = analyzeWatermelonImage(fill(20, 20, [240, 200, 60]), { x: 2, y: -1 });
    expect(outside.groundSpotDetected).toBe(false);
    expect(outside.groundSpotScore).toBe(0);

    const inside = analyzeWatermelonImage(fill(20, 20, [240, 200, 60]), { x: 0.5, y: 0.5 });
    expect(inside.groundSpotDetected).toBe(true);
    expect(inside.groundSpotScore).toBe(1);
  });

  it('scores the field spot from the belly photo when a rind tap is also present', () => {
    const rind = fill(20, 20, [240, 200, 60]);
    const belly = fill(20, 20, [20, 80, 30]);
    const visual = analyzeWatermelonImage(rind, {
      customSpotPoint: { x: 0.5, y: 0.5 },
      groundSpotImage: belly,
    });
    expect(visual.groundSpotDetected).toBe(false);
    expect(visual.notes.some((note) => /underside photo/i.test(note))).toBe(true);
  });
});

function fill(width: number, height: number, rgb: [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  return { data, width, height, colorSpace: 'srgb' as PredefinedColorSpace };
}

function mixed(yellowCount: number, whiteCount: number, total = 100) {
  const data = new Uint8ClampedArray(total * 4);
  for (let i = 0; i < total; i += 1) {
    let rgb: [number, number, number] = [20, 80, 30];
    if (i < yellowCount) rgb = [240, 200, 60];
    else if (i < yellowCount + whiteCount) rgb = [240, 230, 210];
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  return { data, width: total, height: 1, colorSpace: 'srgb' as PredefinedColorSpace };
}
