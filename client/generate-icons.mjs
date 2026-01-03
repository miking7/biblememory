#!/usr/bin/env node
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = join(__dirname, 'public/legacy/bible.png');
const ICONS_DIR = join(__dirname, 'public/icons');
const PUBLIC_DIR = join(__dirname, 'public');

const sizes = [
  { size: 16, name: 'favicon-16x16.png', dir: ICONS_DIR },
  { size: 32, name: 'favicon-32x32.png', dir: ICONS_DIR },
  { size: 180, name: 'apple-touch-icon.png', dir: ICONS_DIR },
  { size: 192, name: 'icon-192.png', dir: ICONS_DIR },
  { size: 512, name: 'icon-512.png', dir: ICONS_DIR }
];

async function generateIcons() {
  console.log('Generating PWA icons from bible.png (57x57)...\n');

  for (const { size, name, dir } of sizes) {
    const output = join(dir, name);
    await sharp(SOURCE)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(output);
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (32x32 version)
  const icoBuffer = await sharp(SOURCE)
    .resize(32, 32, {
      kernel: sharp.kernel.lanczos3,
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toBuffer();

  writeFileSync(join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  console.log('✓ Generated favicon.ico (32x32)');

  console.log('\n✅ All PWA icons generated successfully!');
  console.log('\nNote: Source image is 57x57. For production, consider creating');
  console.log('a higher resolution source (512x512+) for better quality on large displays.');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
