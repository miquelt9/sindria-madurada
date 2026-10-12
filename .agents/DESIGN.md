# Design

Keep the current watermelon UI. Light is cream pulp paper; dark is rind-black. Fraunces (`font-display`) is for titles and scores. DM Sans is for UI and body. A visual redesign needs Product.

## Tokens

Semantic colors live in `src/index.css` and `tailwind.config.js`: `bg-surface`, `bg-surface-raised`, `bg-surface-subtle`, `text-ink`, `text-ink-muted`, `border-border`, `bg-primary`, `bg-spot`, `bg-accent`, `text-ripe`, `text-unripe`, `text-borderline`. Use those classes in new UI. Skip raw `slate-*` and `emerald-*` utilities.

Theme is light, dark, or system through `ThemeProvider` and `useTheme()`. Merge dynamic classes with `cn(...)` from `src/lib/cn.ts`.

## Touch

Language, variety, size, and crop-mode controls use a 44px hit area. Details: [touch-targets.md](./touch-targets.md). The scan stepper is display-only: [scan-stepper.md](./scan-stepper.md).

## Copy

Verdict words only: `Likely ripe`, `Unsure / Borderline`, `Likely unripe`. Field spot copy is loss of green against the rind. Knock copy is dull versus tight from several knocks. A hollow sound is a separate warning, not a ripeness point. Do not claim sugar, a headline accuracy, laser vibrometry, NIR, or a fixed ripe frequency window.

## No look drift

New UI uses the existing tokens, type, and shell. Palette, radius, density, and layout changes are their own task and need Product.
