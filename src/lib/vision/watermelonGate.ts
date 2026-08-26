export interface ClassificationPrediction {
  label: string;
  score: number;
}

export interface WatermelonGateResult {
  passed: boolean;
  confidence: number;
  detectedLabel?: string;
  couldNotVerify?: boolean;
  error?: string;
  topLabels?: ClassificationPrediction[];
}

export const WATERMELON_MODEL = 'Xenova/mobilenet_v2_1.0_224';
export const MIN_WATERMELON_SCORE = 0.15;

// Pure prediction scoring logic (isolated for testing and deterministic validation)
export function evaluatePredictions(
  predictions: ClassificationPrediction[],
  minScore = MIN_WATERMELON_SCORE
): { isWatermelon: boolean; matchedLabel?: string; score: number } {
  if (!predictions || predictions.length === 0) {
    return { isWatermelon: false, score: 0 };
  }

  // Look for 'watermelon' in labels (ImageNet label is often "watermelon" or "watermelon, Citrullus vulgaris")
  const watermelonMatch = predictions.find((p) =>
    p.label.toLowerCase().includes('watermelon')
  );

  if (watermelonMatch) {
    // If watermelon is found with score >= minScore, or if it is the top prediction (index 0)
    const isTop = predictions[0]?.label.toLowerCase().includes('watermelon');
    if (watermelonMatch.score >= minScore || isTop) {
      return {
        isWatermelon: true,
        matchedLabel: watermelonMatch.label,
        score: watermelonMatch.score,
      };
    }
  }

  // Top prediction non-watermelon
  return {
    isWatermelon: false,
    matchedLabel: predictions[0]?.label,
    score: predictions[0]?.score ?? 0,
  };
}

let classifierPromise: Promise<any> | null = null;
let isWarmingUp = false;

/**
 * Pre-warm the classifier pipeline in the background (e.g. triggered on landing page CTA)
 */
export async function warmupWatermelonGate(): Promise<void> {
  if (classifierPromise || isWarmingUp) return;
  isWarmingUp = true;
  try {
    await getClassifier();
  } catch {
    // Non-blocking background warmup failure
  } finally {
    isWarmingUp = false;
  }
}

async function getClassifier(): Promise<any> {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      if (typeof window !== 'undefined') {
        env.allowLocalModels = false;
        env.useBrowserCache = true;
      }
      return (pipeline as any)('image-classification', WATERMELON_MODEL, {
        dtype: 'q8',
      });
    })().catch((err: any) => {
      classifierPromise = null;
      throw err;
    });
  }
  return classifierPromise;
}

/**
 * Validates whether an image contains a watermelon.
 * Fallback policy: On network/model load error or offline mode, fails open (passed: true, couldNotVerify: true)
 * so users are never blocked from scoring.
 */
export async function validateWatermelonImage(
  imageInput: string | HTMLCanvasElement | HTMLImageElement | ImageData
): Promise<WatermelonGateResult> {
  try {
    const classifier = await getClassifier();
    
    // Convert ImageData or Canvas to data URL / compatible input if needed
    let source: any = imageInput;
    if (typeof ImageData !== 'undefined' && imageInput instanceof ImageData) {
      const canvas = document.createElement('canvas');
      canvas.width = imageInput.width;
      canvas.height = imageInput.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageInput, 0, 0);
        source = canvas.toDataURL('image/jpeg', 0.8);
      }
    }

    const rawOutput = await classifier(source, { topk: 5 });
    const predictions: ClassificationPrediction[] = Array.isArray(rawOutput)
      ? rawOutput.map((item: any) => ({
          label: String(item.label || ''),
          score: Number(item.score || 0),
        }))
      : [];

    const evaluation = evaluatePredictions(predictions);

    if (evaluation.isWatermelon) {
      return {
        passed: true,
        confidence: Math.round(evaluation.score * 100),
        detectedLabel: evaluation.matchedLabel,
        topLabels: predictions,
      };
    }

    return {
      passed: false,
      confidence: Math.round(evaluation.score * 100),
      detectedLabel: evaluation.matchedLabel,
      topLabels: predictions,
    };
  } catch (err: any) {
    // Fail-open for privacy & offline capability
    return {
      passed: true,
      confidence: 50,
      couldNotVerify: true,
      error: err?.message || 'Classifier unavailable',
    };
  }
}
