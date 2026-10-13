import { describe, expect, it } from 'vitest';
import { applyHann, fftMagnitudes, hannWindow, nextPowerOfTwo } from './fft';

describe('nextPowerOfTwo', () => {
  it('returns 1 for empty, unit, and non-positive lengths', () => {
    expect(nextPowerOfTwo(0)).toBe(1);
    expect(nextPowerOfTwo(1)).toBe(1);
    expect(nextPowerOfTwo(-4)).toBe(1);
  });

  it('rounds up to the next power of two and keeps exact powers', () => {
    expect(nextPowerOfTwo(2)).toBe(2);
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(4)).toBe(4);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(1.5)).toBe(2);
    expect(nextPowerOfTwo(1024)).toBe(1024);
    expect(nextPowerOfTwo(1025)).toBe(2048);
  });
});

describe('Hann window', () => {
  it('is empty for length 0 and unity for length 1', () => {
    expect(hannWindow(0)).toHaveLength(0);
    expect(Array.from(hannWindow(1))).toEqual([1]);
    expect(Array.from(applyHann(new Float32Array()))).toEqual([]);
  });

  it('is zero at both ends and one at the center of an odd window', () => {
    const window = hannWindow(5);
    expect(window[0]).toBe(0);
    expect(window[4]).toBe(0);
    expect(window[2]).toBe(1);
    expect(window[1]).toBeCloseTo(0.5);

    const samples = new Float32Array([2, 2, 2, 2, 2]);
    const windowed = applyHann(samples);
    expect(Array.from(samples)).toEqual([2, 2, 2, 2, 2]);
    expect(windowed[0]).toBe(0);
    expect(windowed[2]).toBe(2);
    expect(windowed[4]).toBe(0);
  });
});

describe('fftMagnitudes', () => {
  it('returns no bins for an empty signal and does not mutate the input', () => {
    const samples = new Float32Array([1, 2, 3]);
    expect(fftMagnitudes(new Float32Array())).toHaveLength(0);
    fftMagnitudes(samples);
    expect(Array.from(samples)).toEqual([1, 2, 3]);
  });

  it('puts a constant signal entirely in the DC bin', () => {
    const magnitudes = fftMagnitudes(new Float32Array(8).fill(1));
    expect(magnitudes).toHaveLength(4);
    expect(magnitudes[0]).toBeCloseTo(8);
    for (let i = 1; i < magnitudes.length; i += 1) {
      expect(magnitudes[i]).toBeCloseTo(0);
    }
  });

  it('pads a non-power-of-two length and keeps an impulse flat across the half spectrum', () => {
    const magnitudes = fftMagnitudes(new Float32Array([1, 0, 0]));
    expect(magnitudes).toHaveLength(2);
    expect(magnitudes[0]).toBeCloseTo(1);
    expect(magnitudes[1]).toBeCloseTo(1);
  });

  it('recovers bin 4 of a 64-sample cosine', () => {
    const samples = new Float32Array(64);
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = Math.cos((2 * Math.PI * 4 * i) / samples.length);
    }
    const magnitudes = fftMagnitudes(samples);
    expect(magnitudes).toHaveLength(32);
    expect(magnitudes[4]).toBeCloseTo(32);
    for (let i = 0; i < magnitudes.length; i += 1) {
      if (i === 4) continue;
      expect(magnitudes[i]).toBeCloseTo(0, 5);
    }
  });
});
