# Scan stepper

`AppShell` shows a display-only Photo → Knock → Result stepper when `currentStep` is `photo`, `knock`, or `result`. It stays hidden on `home` and `history`.

The steps are not controls, so they are not 44px hit targets. Back navigation from Knock to Photo is a separate change.
