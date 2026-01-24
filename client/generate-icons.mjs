#!/usr/bin/env node
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Source images
const STYLED_MASTER = join(__dirname, 'public/icons/bible-memory-master-880.png');
const PWA_MASTER = join(__dirname, 'public/icons/bible-memory-pwa-master-1024.png');
const ICONS_DIR = join(__dirname, 'public/icons');

const sizes = [
  // Styled icons (for favicons, README, social sharing, in-app display)
  { size: 16, name: 'favicon-16x16.png', source: STYLED_MASTER },
  { size: 32, name: 'favicon-32x32.png', source: STYLED_MASTER },
  { size: 192, name: 'icon-192.png', source: STYLED_MASTER },
  { size: 512, name: 'icon-512.png', source: STYLED_MASTER },
  // PWA icons (for iOS/Android home screen installation)
  { size: 180, name: 'pwa-apple-touch-icon.png', source: PWA_MASTER },
  { size: 192, name: 'pwa-icon-192.png', source: PWA_MASTER },
  { size: 512, name: 'pwa-icon-512.png', source: PWA_MASTER }
];

async function generateIcons() {
  console.log('Generating icons from dual sources...\n');
  console.log('Styled (880px): favicons, icon-192, icon-512');
  console.log('PWA (1024px):   pwa-apple-touch-icon, pwa-icon-192, pwa-icon-512\n');

  for (const { size, name, source } of sizes) {
    const output = join(ICONS_DIR, name);
    await sharp(source)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(output);
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
