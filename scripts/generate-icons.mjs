import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'assets', 'icon-source.png');
const appDir = path.join(root, 'src', 'app');

const ICON_SIZE = 512;
const APPLE_ICON_SIZE = 180;
const PREVIEW_SIZE = 32;
const CORNER_RADIUS_RATIO = 0.22;
const WHITE_THRESHOLD = 246;
const WHITE_BACKGROUND = { r: 255, g: 255, b: 255 };

function roundedMask(size) {
  const radius = Math.round(size * CORNER_RADIUS_RATIO);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`;
  return Buffer.from(svg);
}

async function detectContentBox() {
  const { data, info } = await sharp(sourcePath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const r = data[offset];
      const g = data[offset + 1] ?? r;
      const b = data[offset + 2] ?? r;
      if (r < WHITE_THRESHOLD || g < WHITE_THRESHOLD || b < WHITE_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    throw new Error('來源圖所有像素皆為白色，無法偵測內容範圍。');
  }

  return { minX, minY, maxX, maxY, width, height };
}

async function buildIcon(size, outputPath, { rounded }) {
  let pipeline = sharp(sourcePath).resize(size, size, {
    fit: 'contain',
    background: WHITE_BACKGROUND,
  });

  if (rounded) {
    pipeline = pipeline.ensureAlpha().composite([{ input: roundedMask(size), blend: 'dest-in' }]);
  }

  await pipeline.png({ compressionLevel: 9 }).toFile(outputPath);
}

async function main() {
  await mkdir(appDir, { recursive: true });

  const box = await detectContentBox();
  const contentWidth = box.maxX - box.minX + 1;
  const contentHeight = box.maxY - box.minY + 1;
  const coverage = Math.max(contentWidth / box.width, contentHeight / box.height);
  console.log(
    `來源圖 ${box.width}x${box.height}，內容範圍 x:${box.minX}-${box.maxX} y:${box.minY}-${box.maxY}，` +
      `佔邊長 ${(coverage * 100).toFixed(1)}%`,
  );
  if (coverage > 0.98) {
    console.warn('內容幾乎填滿整張圖，圓角遮罩可能裁切到圖形邊緣。');
  }

  const iconPath = path.join(appDir, 'icon.png');
  const appleIconPath = path.join(appDir, 'apple-icon.png');
  const previewPath = path.join(os.tmpdir(), 'icon-preview-32.png');

  await buildIcon(ICON_SIZE, iconPath, { rounded: true });
  await buildIcon(APPLE_ICON_SIZE, appleIconPath, { rounded: false });
  await buildIcon(PREVIEW_SIZE, previewPath, { rounded: true });

  for (const file of [iconPath, appleIconPath, previewPath]) {
    const metadata = await sharp(file).metadata();
    console.log(`產出 ${file} (${metadata.width}x${metadata.height}, hasAlpha=${metadata.hasAlpha})`);
  }
  console.log(`小尺寸預覽：${previewPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
