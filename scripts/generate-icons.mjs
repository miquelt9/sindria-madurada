import sharp from 'sharp';
import path from 'path';

const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#1B7A3D"/>
  <circle cx="256" cy="256" r="190" fill="#FBF6EE"/>
  <!-- Watermelon slice -->
  <g transform="translate(256, 266) scale(4.0) translate(-50, -50)">
    <path d="M10 50 A40 40 0 0 0 90 50 Z" fill="#15803d" stroke="#14532d" stroke-width="2"/>
    <path d="M16 50 A34 34 0 0 0 84 50 Z" fill="#bbf7d0"/>
    <path d="M20 50 A30 30 0 0 0 80 50 Z" fill="#e11d48"/>
    <!-- Seeds -->
    <circle cx="35" cy="58" r="2.5" fill="#0f172a"/>
    <circle cx="50" cy="65" r="2.5" fill="#0f172a"/>
    <circle cx="65" cy="58" r="2.5" fill="#0f172a"/>
    <circle cx="42" cy="70" r="2.5" fill="#0f172a"/>
    <circle cx="58" cy="70" r="2.5" fill="#0f172a"/>
  </g>
</svg>
`;

async function generateIcons() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const svgBuffer = Buffer.from(svgIcon);

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // apple-touch-icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // favicon.ico / png 64x64
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico');
}

generateIcons().catch(console.error);
