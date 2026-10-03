# Summary: Abbaszadeh et al. (2013)

**Title**: *An intelligent procedure for watermelon ripeness detection based on vibration signals*  
**Authors**: Rouzbeh Abbaszadeh, Ashkan Moosavian, Ali Rajabipour, Gholamhassan Najafi  
**Journal**: *Journal of Food Science and Technology* (DOI: 10.1007/s13197-013-1068-x)

## Core Methodology
1. **Sample**: 43 Crimson Sweet watermelons (24 training, 19 test).
2. **Excitation**: 0 to 1000 Hz vibration spectrum recorded via Laser Doppler Vibrometer.
3. **Signal Transformation**: Fast Fourier Transform (FFT) applied to extract Amplitude and Phase spectra.
4. **Key Finding**: FFT **Amplitude** spectrum is dramatically superior to Phase angle in separating ripe vs unripe classes. Phase angle suffered heavy overlap and low accuracy (32–58%), whereas FFT Amplitude achieved **94.74% accuracy** (KNN with K=2).

## Extracted Statistical Features (Table 1)
- **Mean value**: $\frac{1}{n}\sum x_i$
- **Standard deviation**: $\sqrt{\frac{1}{n}\sum (x_i - \bar{x})^2}$
- **Root mean square (RMS)**: $\sqrt{\frac{1}{n}\sum x_i^2}$
- **Skewness (3rd moment)**: $\frac{\frac{1}{n}\sum (x_i - \bar{x})^3}{\sigma^3}$
- **Kurtosis (4th moment)**: $\frac{\frac{1}{n}\sum (x_i - \bar{x})^4}{\sigma^4}$
- **Peak / Max value**: $\max |x_i|$

## What this paper is, and what it is not
The **94.74%** figure is KNN accuracy on **laser Doppler vibrometer** spectra from this lab set (43 Crimson Sweet fruit). It is not the accuracy of the Síndria Madurada PWA. The PWA does not use laser vibrometry, does not measure sweetness, and this digest does not set a ripe frequency window for the app.

A phone microphone records airborne knocks, which is a different instrument from an LDV. The on-device knock cue stays a firmness hint (dull versus tight, from several knocks). A hollow sound is a separate warning, not a ripeness point.
