import {
  VisualFeatures,
  AudioFeatures,
  RipenessResult,
  RipenessVerdict,
  FusionInputs,
} from '../types';
import { knockHint } from '../audio/knockHint';
import { eatingWindowForVerdict } from './eatingWindow';

function visualComposite(visual: VisualFeatures, variety: FusionInputs['variety']): number {
  if (variety === 'solid') {
    // Solid rind has no ribbons — do not punish low stripe contrast.
    return visual.groundSpotScore * 0.70 + visual.dullnessScore * 0.30;
  }
  return (
    visual.groundSpotScore * 0.45 +
    visual.stripeContrastScore * 0.35 +
    visual.dullnessScore * 0.20
  );
}

/**
 * Fuses visual cues (stripe ribbons, ground spot, surface dullness)
 * and acoustic knocking cues (coarse knock hint, Abbaszadeh moments)
 * into a transparent, honest consumer score.
 */
export function fuseRipenessSignals(
  visual: VisualFeatures,
  audio: AudioFeatures,
  inputs: FusionInputs = {}
): RipenessResult {
  const variety = inputs.variety ?? 'striped';
  const size = inputs.size;

  const visualScoreRaw = visualComposite(visual, variety);
  const visualScore = Math.round(visualScoreRaw * 100);

  const reading = knockHint(audio, size);
  const acousticScore = audio.knockCount > 0 ? reading.score : audio.acousticRipenessScore;
  const audioScore = Math.round(acousticScore * 100);

  // Fusion weighting is a product choice, not a result from any paper.
  // With two or more knocks the mix is half visual and half knock. Fewer knocks
  // lean on the photo. These weights are not a sweetness measurement.
  let fusedScoreRaw: number;
  let confidence: number;

  if (audio.knockCount >= 2) {
    fusedScoreRaw = visualScoreRaw * 0.50 + acousticScore * 0.50;
    confidence = Math.min(92, 60 + audio.knockCount * 8 + (visual.groundSpotDetected ? 15 : 5));
  } else if (audio.knockCount === 1) {
    fusedScoreRaw = visualScoreRaw * 0.65 + acousticScore * 0.35;
    confidence = 65;
  } else {
    fusedScoreRaw = visualScoreRaw;
    confidence = visual.groundSpotDetected ? 60 : 45;
  }

  let overallScore = Math.round(fusedScoreRaw * 100);

  // The only fusion change beyond reading the hint: a muddy peak cannot be ripe.
  // 67 sits one point under the ripe cut so the capped score and the verdict agree.
  if (audio.knockCount > 0 && audio.peakClarity === 'muddy') {
    overallScore = Math.min(overallScore, 67);
  }

  let verdict: RipenessVerdict;
  if (overallScore >= 68) {
    verdict = 'likely_ripe';
  } else if (overallScore <= 46) {
    verdict = 'likely_unripe';
  } else {
    verdict = 'borderline';
  }

  const eatWindow = eatingWindowForVerdict(verdict);

  let summaryExplanation = '';
  const actionableTips: string[] = [];

  if (verdict === 'likely_ripe') {
    summaryExplanation =
      'Likely ripe — a coarse stage and texture hint, not a sweetness reading. The field spot, when it is in frame, is loss of green against the rind. Dull versus tight, from several knocks, is a firmness cue, not more bass. A hollow sound is a separate warning, not a ripeness point. The fruit does not ripen or sweeten after picking.';
  } else if (verdict === 'likely_unripe') {
    summaryExplanation =
      'Likely unripe. The field spot may be missing or still green against the rind, or the knocks may sound tight rather than dull. A hollow sound is a separate warning, not a ripeness point. The fruit does not ripen or sweeten after picking.';
  } else {
    summaryExplanation =
      'Borderline. The stage and texture cues disagree. Prefer a frame that shows the field spot, and take several knocks. A hollow sound is a separate warning, not a ripeness point. The fruit does not ripen or sweeten after picking.';
  }

  if (!visual.groundSpotDetected || visual.groundSpotScore < 0.5) {
    actionableTips.push(
      'Prefer a frame that shows the field spot. Score loss of green against the rest of the rind, not absolute yellow.'
    );
  } else {
    actionableTips.push(
      'The field spot is in frame. It is a stage cue — loss of green against the rind — not proof of sweetness.'
    );
  }

  if (reading.hint === 'tight') {
    actionableTips.push('Knocks sound tight rather than dull. That is a firmness cue, not more bass.');
  } else if (reading.hint === 'dull') {
    actionableTips.push(
      size === 'small'
        ? 'Several knocks on this smaller melon sound dull rather than tight. That is a firmness cue, not more bass.'
        : 'Several knocks sound dull rather than tight. That is a firmness cue, not more bass.'
    );
  }

  if (variety !== 'solid' && visual.stripeContrastScore < 0.4) {
    actionableTips.push(
      'On striped fruit, look for contrast between ribbon stripes. A dull rind does not mean ripe for every cultivar.'
    );
  }

  if (verdict !== 'likely_ripe') {
    actionableTips.push('Remember: Watermelons do not continue to ripen or sweeten once picked from the vine.');
  }

  return {
    overallScore,
    verdict,
    confidence,
    visualScore,
    audioScore,
    visualFeatures: visual,
    audioFeatures: audio,
    ...(reading.hint ? { knockHint: reading.hint } : {}),
    summaryExplanation,
    actionableTips,
    ...eatWindow,
  };
}
