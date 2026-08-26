import { VisualFeatures } from '../types';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number; // 0 to 360
  s: number; // 0 to 1
  v: number; // 0 to 1
}

export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, v };
}

export type SpotPoint = { x: number; y: number };

export interface AnalyzeWatermelonOptions {
  /** Tap on the rind crop (relative 0..1). Ignored when `groundSpotImage` is set. */
  customSpotPoint?: SpotPoint;
  /** Dedicated underside / belly photo — ground-spot HSV uses this instead of a tap. */
  groundSpotImage?: ImageData;
}

function isSpotPoint(value: SpotPoint | AnalyzeWatermelonOptions): value is SpotPoint {
  return (
    typeof (value as SpotPoint).x === 'number' &&
    typeof (value as SpotPoint).y === 'number' &&
    !('groundSpotImage' in value) &&
    !('customSpotPoint' in value)
  );
}

function resolveAnalyzeOptions(
  arg?: SpotPoint | AnalyzeWatermelonOptions
): AnalyzeWatermelonOptions {
  if (!arg) return {};
  if (isSpotPoint(arg)) return { customSpotPoint: arg };
  return arg;
}

function evaluateGroundSpot(
  imageData: ImageData,
  customSpotPoint?: SpotPoint
): { groundSpotScore: number; groundSpotDetected: boolean } {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  if (totalPixels === 0) {
    return { groundSpotScore: 0.5, groundSpotDetected: false };
  }

  if (customSpotPoint) {
    const cx = Math.floor(customSpotPoint.x * width);
    const cy = Math.floor(customSpotPoint.y * height);
    const radius = Math.floor(Math.min(width, height) * 0.12);
    let spotYellow = 0;
    let spotSamples = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          const hsv = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
          if (hsv.h >= 30 && hsv.h <= 70 && hsv.s >= 0.25 && hsv.v >= 0.35) {
            spotYellow++;
          }
          spotSamples++;
        }
      }
    }
    const yellowRatio = spotSamples > 0 ? spotYellow / spotSamples : 0;
    return {
      groundSpotScore: Math.min(1, yellowRatio * 1.5),
      groundSpotDetected: yellowRatio > 0.15,
    };
  }

  let yellowPixelCount = 0;
  let whiteSpotPixelCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const hsv = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
    if (hsv.h >= 32 && hsv.h <= 68 && hsv.s >= 0.28 && hsv.v >= 0.40) {
      yellowPixelCount++;
    } else if (hsv.h >= 30 && hsv.h <= 100 && hsv.s < 0.25 && hsv.v > 0.65) {
      whiteSpotPixelCount++;
    }
  }

  const yellowFraction = yellowPixelCount / totalPixels;
  const whiteFraction = whiteSpotPixelCount / totalPixels;

  if (yellowFraction > 0.02) {
    return {
      groundSpotDetected: true,
      groundSpotScore: Math.min(1, yellowFraction / 0.08),
    };
  }
  if (whiteFraction > 0.04) {
    return { groundSpotDetected: true, groundSpotScore: 0.25 };
  }
  return { groundSpotScore: 0.5, groundSpotDetected: false };
}

/**
 * Analyzes cropped image data for watermelon ripeness visual cues:
 * 1. Ground spot yellowness (creamy butter yellow vs pale/white)
 * 2. Ribbon/stripe contrast (local variance between light and dark rind bands)
 * 3. Surface dullness vs specular shine (mature melons have a matte/dull rind)
 *
 * Second argument remains a tap point for existing callers. Pass
 * `{ groundSpotImage }` to score the field spot from a dedicated belly photo.
 */
export function analyzeWatermelonImage(
  imageData: ImageData,
  customSpotPointOrOptions?: SpotPoint | AnalyzeWatermelonOptions
): VisualFeatures {
  const options = resolveAnalyzeOptions(customSpotPointOrOptions);
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  if (totalPixels === 0) {
    return {
      stripeContrastScore: 0.5,
      groundSpotScore: 0.5,
      dullnessScore: 0.5,
      groundSpotDetected: false,
      notes: ['No image data provided'],
    };
  }

  let specularShinePixels = 0;

  const grayscale = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    grayscale[i] = 0.299 * r + 0.587 * g + 0.114 * b;

    const hsv = rgbToHsv(r, g, b);

    // Specular highlight detection (very bright, low saturation)
    if (hsv.v > 0.92 && hsv.s < 0.2) {
      specularShinePixels++;
    }
  }

  // 1. Stripe / Ribbon Contrast Calculation: Local standard deviation across rows/columns
  // Striped watermelons have high alternating dark/light bands (ribbons).
  let localVarianceSum = 0;
  let varianceSampleCount = 0;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 40));

  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const left = grayscale[y * width + (x - step)];
      const right = grayscale[y * width + (x + step)];
      const top = grayscale[(y - step) * width + x];
      const bottom = grayscale[(y + step) * width + x];

      const diffH = Math.abs(right - left);
      const diffV = Math.abs(bottom - top);
      localVarianceSum += (diffH + diffV) / 2;
      varianceSampleCount++;
    }
  }

  const avgEdgeContrast = varianceSampleCount > 0 ? localVarianceSum / varianceSampleCount : 0;
  // Normalize contrast: rich alternating green ribbons have edge gradients > 12
  const stripeContrastScore = Math.min(1, Math.max(0, avgEdgeContrast / 35));

  // 2. Ground Spot Evaluation — dedicated belly photo wins over a tap on the rind crop
  const spotSource = options.groundSpotImage ?? imageData;
  const spotPoint = options.groundSpotImage ? undefined : options.customSpotPoint;
  const { groundSpotScore, groundSpotDetected } = evaluateGroundSpot(spotSource, spotPoint);

  // 3. Surface Dullness vs Glossy Shine
  // Young melons are shiny and waxy (high specular highlights); ripe melons are matte/dull.
  const shineFraction = specularShinePixels / totalPixels;
  // If shine is > 3%, it's likely glossy/shiny (lower score). If < 0.5%, it's dull/matte.
  const dullnessScore = Math.min(1, Math.max(0, 1 - shineFraction / 0.04));

  const notes: string[] = [];
  if (options.groundSpotImage) {
    notes.push('Ground spot scored from dedicated underside photo');
  }

  if (groundSpotDetected && groundSpotScore > 0.65) {
    notes.push('Yellow butter ground spot detected (strong ripeness indicator)');
  } else if (groundSpotDetected && groundSpotScore < 0.4) {
    notes.push('Pale/white ground spot detected (likely under-ripe vine detachment)');
  } else {
    notes.push('Ground spot not clearly exposed in photo (check underside)');
  }

  if (stripeContrastScore > 0.6) {
    notes.push('Deep ribbon stripe definition and contrast');
  } else if (stripeContrastScore < 0.35) {
    notes.push('Low stripe definition or uniform solid rind pattern');
  }

  if (dullnessScore > 0.7) {
    notes.push('Dull matte rind surface (mature sugar accumulation)');
  } else {
    notes.push('Shiny reflective rind (characteristic of earlier growth)');
  }

  return {
    stripeContrastScore,
    groundSpotScore,
    dullnessScore,
    groundSpotDetected,
    notes,
  };
}
