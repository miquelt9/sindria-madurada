/** Next power of two ≥ n (minimum 1). */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

/** Periodic Hann window, length N. */
export function hannWindow(length: number): Float32Array {
  const w = new Float32Array(length);
  if (length <= 1) {
    if (length === 1) w[0] = 1;
    return w;
  }
  const denom = length - 1;
  for (let i = 0; i < length; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / denom));
  }
  return w;
}

/** Returns a Hann-windowed copy of `samples`. */
export function applyHann(samples: Float32Array): Float32Array {
  const w = hannWindow(samples.length);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] * w[i];
  }
  return out;
}

/**
 * Real-signal radix-2 FFT magnitudes for bins `[0, N/2)` (DC through just below Nyquist).
 * Input is zero-padded to the next power of two. Bin width is `sampleRate / N`.
 */
export function fftMagnitudes(realSignal: Float32Array): Float32Array {
  const n = nextPowerOfTwo(Math.max(1, realSignal.length));
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  real.set(realSignal);

  fftRadix2(real, imag);

  const half = n / 2;
  const mags = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    mags[i] = Math.hypot(real[i], imag[i]);
  }
  return mags;
}

/** In-place Cooley–Tukey radix-2 FFT (length must be a power of two). */
function fftRadix2(real: Float32Array, imag: Float32Array): void {
  const n = real.length;

  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    while ((j & bit) !== 0) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      const tr = real[i];
      real[i] = real[j];
      real[j] = tr;
      const ti = imag[i];
      imag[i] = imag[j];
      imag[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(angle);
    const wlenIm = Math.sin(angle);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let k = 0; k < half; k++) {
        const even = i + k;
        const odd = even + half;
        const vr = real[odd] * wRe - imag[odd] * wIm;
        const vi = real[odd] * wIm + imag[odd] * wRe;
        real[odd] = real[even] - vr;
        imag[odd] = imag[even] - vi;
        real[even] += vr;
        imag[even] += vi;
        const nextRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextRe;
      }
    }
  }
}
