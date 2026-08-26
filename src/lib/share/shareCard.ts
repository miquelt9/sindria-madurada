import { RipenessResult } from '../types';

export async function generateShareCardBlob(
  result: RipenessResult,
  photoUrl?: string,
  labels?: {
    appTitle: string;
    scoreLabel: string;
    verdictLabel: string;
    eatWindow: string;
    visualLabel: string;
    audioLabel: string;
  }
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const width = 600;
  const height = 750;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  const isDark = document.documentElement.classList.contains('dark');
  ctx.fillStyle = isDark ? '#0C1F14' : '#FBF6EE';
  ctx.fillRect(0, 0, width, height);

  // Card Outer Border
  ctx.strokeStyle = isDark ? '#1C3A27' : '#E6DAC7';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Header Title
  ctx.fillStyle = '#1B7A3D';
  ctx.font = 'bold 28px Fraunces, serif, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(labels?.appTitle || 'Síndria Madurada', width / 2, 60);

  // Subtitle
  ctx.fillStyle = isDark ? '#9EB3A4' : '#6E6152';
  ctx.font = '14px DM Sans, sans-serif, system-ui';
  ctx.fillText('Watermelon Ripeness Assessment', width / 2, 85);

  let currentY = 120;

  // Photo drawing if present
  if (photoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = photoUrl;
      });

      const photoSize = 140;
      const photoX = (width - photoSize) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, currentY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, photoX, currentY, photoSize, photoSize);
      ctx.restore();

      ctx.strokeStyle = '#1B7A3D';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width / 2, currentY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      currentY += photoSize + 25;
    } catch {
      currentY += 20;
    }
  }

  // Verdict Banner Color
  let verdictColor = '#1B7A3D';
  let verdictBg = isDark ? 'rgba(27, 122, 61, 0.25)' : 'rgba(27, 122, 61, 0.12)';
  if (result.verdict === 'likely_unripe') {
    verdictColor = '#E11D48';
    verdictBg = isDark ? 'rgba(225, 29, 72, 0.25)' : 'rgba(225, 29, 72, 0.12)';
  } else if (result.verdict === 'borderline') {
    verdictColor = '#C4920A';
    verdictBg = isDark ? 'rgba(196, 146, 10, 0.25)' : 'rgba(196, 146, 10, 0.15)';
  }

  // Verdict Pill
  ctx.fillStyle = verdictBg;
  const pillW = 340;
  const pillH = 44;
  ctx.beginPath();
  ctx.roundRect((width - pillW) / 2, currentY, pillW, pillH, 22);
  ctx.fill();

  ctx.fillStyle = verdictColor;
  ctx.font = 'bold 20px Fraunces, serif, system-ui';
  ctx.fillText(labels?.verdictLabel || result.verdict, width / 2, currentY + 28);

  currentY += 75;

  // Score Number
  ctx.fillStyle = isDark ? '#FFFFFF' : '#141E17';
  ctx.font = '900 48px Fraunces, serif, system-ui';
  ctx.fillText(`${result.overallScore}/100`, width / 2, currentY);

  currentY += 35;

  // Breakdown metrics
  ctx.fillStyle = isDark ? '#D8E2DA' : '#334036';
  ctx.font = '15px DM Sans, sans-serif, system-ui';
  ctx.textAlign = 'center';
  const audioSummary =
    result.audioFeatures.knockCount > 0
      ? `${labels?.audioLabel || 'Audio'}: ${result.audioScore}% (${result.audioFeatures.peakFrequencyHz} Hz)`
      : `${labels?.audioLabel || 'Audio'}: —`;
  ctx.fillText(
    `${labels?.visualLabel || 'Visual'}: ${result.visualScore}%  •  ${audioSummary}`,
    width / 2,
    currentY
  );

  currentY += 45;

  // Eat Window box
  ctx.fillStyle = isDark ? '#16281E' : '#F3ECE0';
  ctx.beginPath();
  ctx.roundRect(40, currentY, width - 80, 80, 16);
  ctx.fill();

  ctx.fillStyle = isDark ? '#9EB3A4' : '#6E6152';
  ctx.font = 'bold 12px DM Sans, sans-serif, system-ui';
  ctx.fillText((labels?.eatWindow || 'Best Eating Window').toUpperCase(), width / 2, currentY + 28);

  ctx.fillStyle = isDark ? '#FFFFFF' : '#141E17';
  ctx.font = 'bold 16px DM Sans, sans-serif, system-ui';
  ctx.fillText(result.eatWindowLabel, width / 2, currentY + 54);

  // Footer
  ctx.fillStyle = isDark ? '#6B7F72' : '#9C8F7E';
  ctx.font = '11px DM Sans, sans-serif, system-ui';
  ctx.fillText(
    `Síndria Madurada • On-Device AI • ${new Date().toLocaleDateString()}`,
    width / 2,
    height - 30
  );

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
