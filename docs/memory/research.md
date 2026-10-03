# Research Memory

These notes are lab background. They are **not** the accuracy of this PWA.

The app is a coarse three-way stage and texture hint (likely ripe, borderline, or likely unripe) plus a separate hollow warning. It does not measure sweetness. No paper sets the fusion weight; that weight is a product choice.

Do not quote a lab percentage, a sugar figure, or a frequency window as what this app achieves.

## What may be cited, and only with the instrument

- Abbaszadeh et al. 2013 recorded vibration with a **laser Doppler vibrometer (LDV)**, not a phone microphone, on a small Crimson Sweet lab set. FFT amplitude features on that LDV task reached about **95%** (also reported as 94.74% with KNN). That figure is the LDV result. It is not this PWA’s accuracy. See `papers/abbaszadeh-2013.md`.
- Other headline rates (a phone SVM on about 40 fruit with no sugar labels, an MFCC classifier, a fuzzy score against an expert, an NIR sugar error, a light-box study, a starfruit study) belong to those instruments and those limits. They are not this app’s accuracy, and they do not belong in the UI or the README.

## What this product is allowed to say

- The fruit does not ripen or sweeten after picking.
- Field spot is a stage cue: loss of green against the rest of the rind. It does not prove sweetness, and a centimetre size is not a rule.
- Several knocks. Dull versus tight is a firmness cue, not more bass.
- A hollow sound is its own warning, not a ripeness point. If the current heuristic still moves the score when a low knock is present, that behaviour is not described here as intended, and this file does not add a hollow detector.
- A dull rind does not mean ripe for every cultivar.
- This file does not set a ripe frequency window for the app.
