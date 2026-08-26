# Product Memory

## Purpose
Help everyday consumers pick sweet, ripe watermelons in grocery stores and markets in under 30 seconds using standard smartphone hardware (camera + microphone).

## The User Journey
1. **Landing & Privacy Gate**: User is greeted with the clear 3-step value prop, language selector (Catalan default `ca`, Spanish `es`, English `en`), anonymous data-sharing consent toggle (if backend is configured), and PWA installation prompt.
2. **Visual Scan & Prevalidation**:
   - User snaps or uploads a photo of the watermelon.
   - Client-side MobileNet ImageNet classifier pre-validates that the image contains a watermelon (with graceful fail-open offline handling and manual bypass).
   - Grocery UX features: torch toggle for dim supermarket stalls, EXIF orientation handling, compressed ~800px JPEG output.
   - Quick one-tap chips for Variety (`striped` vs `solid`) and Size (`small`, `medium`, `large`).
   - Optional dedicated Belly Photo capture for ground-spot yellow HSV analysis.
3. **Interactive Framing**: User taps to center-crop the melon rind (or tag the ground spot).
4. **Acoustic Knocking**:
   - Screen wake lock is active while listening.
   - Phone is rested against the melon rind; 3 knuckle thumps are captured with adaptive noise floor and transient onset detection.
   - "Tap when you knock" manual fallback for noisy supermarket environments.
5. **Instant Assessment & Honest Eating Window**:
   - App computes multimodal score (visual ribbon contrast + field spot yellowness + surface dullness + resonant peak frequency and Abbaszadeh acoustic moments).
   - Transparent verdicts: `Likely Ripe` (68–100%), `Borderline` (47–67%), `Likely Unripe` (0–46%).
   - Honest Best-to-Eat Window: explicitly reminds consumers that watermelons do not ripen or sweeten off the vine once picked.
6. **Side-by-Side Comparison & Local Share**:
   - If a previous scan exists, displays side-by-side comparison (score diff, eat window, pitch Hz, photo thumbnail).
   - Local Share Card: generates canvas summary PNG for Web Share API or download.
7. **Saved History & Taste Feedback Loop**:
   - Scan is saved to local IndexedDB.
   - Once cut at home, user logs taste validation (`Ripe/Sweet`, `Unripe`, `Overripe`).
   - If backend is configured and consent is granted, fire-and-forget anonymous sync uploads records for research.
