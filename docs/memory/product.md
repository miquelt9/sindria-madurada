# Product Memory

## Purpose
Help someone in a shop form a coarse three-way hint — likely ripe, borderline, or likely unripe — from a phone photo and several knocks. It is a stage and texture hint plus a separate hollow warning. It is not a sweetness test. No paper sets the fusion weight; that mix is a product choice.

## The User Journey
1. **Landing & Privacy Gate**: User is greeted with the clear 3-step value prop, language selector (Catalan default `ca`, Spanish `es`, English `en`), anonymous data-sharing consent toggle (if backend is configured), and PWA installation prompt.
2. **Visual Scan & Prevalidation**:
   - User snaps or uploads a photo of the watermelon.
   - Client-side MobileNet ImageNet classifier pre-validates that the image contains a watermelon (with graceful fail-open offline handling and manual bypass).
   - Grocery UX features: torch toggle for dim supermarket stalls, EXIF orientation handling, compressed ~800px JPEG output.
   - Quick one-tap chips for Variety (`striped` vs `solid`) and Size (`small`, `medium`, `large`).
   - Optional field-spot photo. The cue is loss of green against the rest of the rind, not absolute yellow and not a centimetre size.
3. **Interactive Framing**: User taps to center-crop the melon rind (or tag the ground spot).
4. **Acoustic Knocking**:
   - Screen wake lock is active while listening.
   - Phone is rested against the melon rind; 3 knuckle thumps are captured with adaptive noise floor and transient onset detection.
   - "Tap when you knock" manual fallback for noisy supermarket environments.
5. **Instant Assessment & Honest Eating Window**:
   - The on-device heuristic mixes photo cues and knock firmness. The mix is a product choice, not a measured accuracy and not a sweetness assay.
   - Verdict words only: `Likely ripe`, `Unsure / Borderline`, `Likely unripe`.
   - The fruit does not ripen or sweeten after picking.
   - A hollow sound is a separate warning, not a ripeness point. This document does not treat a hollow flag as something that should add to the ripe score.
6. **Side-by-Side Comparison & Local Share**:
   - If a previous scan exists, displays a side-by-side comparison (score diff, eat window, firmness word, photo thumbnail).
   - Local Share Card: generates canvas summary PNG for Web Share API or download.
7. **Saved History & Taste Feedback Loop**:
   - Scan is saved to local IndexedDB.
   - Once cut at home, user logs taste validation (`Ripe/Sweet`, `Unripe`, `Overripe`).
   - If backend is configured and consent is granted, fire-and-forget anonymous sync uploads records for research.
