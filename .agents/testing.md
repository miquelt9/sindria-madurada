# Tests

`npm test` runs Vitest (`vitest run`).

The suite covers client logic that stays stable without a visual pass: the watermelon gate and rind heuristics, knock onset detection, FFT magnitudes, acoustic features, ripeness fusion, eating-window fields, back-from-knock draft handling, and the Photo / Knock / Result stepper. DOM tests opt into jsdom with `@vitest-environment jsdom`. There is no browser or screenshot harness.

CI is `.github/workflows/ci.yml`. Pull requests and pushes to `main` run `npm ci` and then `npm test` on Node 22.
