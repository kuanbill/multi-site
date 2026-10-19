import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const appDir = path.join(root, 'src', 'app');

const iconSets = [
  {
    name: 'admin',
    sourcePath: path.join(root, 'assets', 'branding', 'admin-icon-source.png'),
    appDir,
    pwaIconDir: path.join(root, 'public', 'icons'),
  },
  {
    name: 'site',
    sourcePath: path.join(root, 'assets', 'branding', 'site-icon-source.png'),
    appDir: null,
    pwaIconDir: path.join(root, 'public', 'site-icons'),
  },
];

const ICON_SIZE = 512;
const APPLE_ICON_SIZE = 180;
const PREVIEW_SIZE = 32;
const PWA_ICON_SIZES = [192, 512];
const MASKABLE_SIZE = 512;
// maskable 圖示的重要內容必須落在中央 80% 安全區內，留白比例依規範加大。
const MASKABLE_CONTENT_RATIO = 0.75;
const CORNER_RADIUS_RATIO = 0.22;
const WHITE_THRESHOLD = 246;
const WHITE_BACKGROUND = { r: 255, g: 255, b: 255 };

function roundedMask(size) {
  const radius = Math.round(size * CORNER_RADIUS_RATIO);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`;
  return Buffer.from(svg);
}

async function detectContentBox(sourcePath) {
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

async function buildIcon(sourcePath, size, outputPath, { rounded }) {
  let pipeline = sharp(sourcePath).resize(size, size, {
    fit: 'contain',
    background: WHITE_BACKGROUND,
  });

  if (rounded) {
    pipeline = pipeline.ensureAlpha().composite([{ input: roundedMask(size), blend: 'dest-in' }]);
  }

  await pipeline.png({ compressionLevel: 9 }).toFile(outputPath);
}

async function buildMaskableIcon(sourcePath, size, outputPath) {
  const contentSize = Math.round(size * MASKABLE_CONTENT_RATIO);
  const content = await sharp(sourcePath)
    .resize(contentSize, contentSize, { fit: 'contain', background: WHITE_BACKGROUND })
    .png()
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background: { ...WHITE_BACKGROUND, alpha: 1 } } })
    .composite([{ input: content, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function generateIconSet({ name, sourcePath, appDir: outputAppDir, pwaIconDir }) {
  if (outputAppDir) await mkdir(outputAppDir, { recursive: true });
  await mkdir(pwaIconDir, { recursive: true });

  const box = await detectContentBox(sourcePath);
  const contentWidth = box.maxX - box.minX + 1;
  const contentHeight = box.maxY - box.minY + 1;
  const coverage = Math.max(contentWidth / box.width, contentHeight / box.height);
  console.log(
    `[${name}] 來源圖 ${box.width}x${box.height}，內容範圍 x:${box.minX}-${box.maxX} y:${box.minY}-${box.maxY}，` +
      `佔邊長 ${(coverage * 100).toFixed(1)}%`,
  );
  if (coverage > 0.98) {
    console.warn(`[${name}] 內容幾乎填滿整張圖，圓角遮罩可能裁切到圖形邊緣。`);
  }

  const outputFiles = [];
  if (outputAppDir) {
    const iconPath = path.join(outputAppDir, 'icon.png');
    await buildIcon(sourcePath, ICON_SIZE, iconPath, { rounded: true });
    outputFiles.push(iconPath);
  }

  const appleIconPath = outputAppDir
    ? path.join(outputAppDir, 'apple-icon.png')
    : path.join(pwaIconDir, 'apple-icon.png');
  await buildIcon(sourcePath, APPLE_ICON_SIZE, appleIconPath, { rounded: false });
  outputFiles.push(appleIconPath);

  const previewPath = path.join(os.tmpdir(), `icon-preview-${name}-32.png`);
  await buildIcon(sourcePath, PREVIEW_SIZE, previewPath, { rounded: true });
  outputFiles.push(previewPath);

  for (const size of PWA_ICON_SIZES) {
    const pwaIconPath = path.join(pwaIconDir, `icon-${size}.png`);
    await buildIcon(sourcePath, size, pwaIconPath, { rounded: true });
    outputFiles.push(pwaIconPath);
  }

  const maskablePath = path.join(pwaIconDir, 'maskable-512.png');
  await buildMaskableIcon(sourcePath, MASKABLE_SIZE, maskablePath);
  outputFiles.push(maskablePath);

  for (const file of outputFiles) {
    const metadata = await sharp(file).metadata();
    console.log(`[${name}] 產出 ${file} (${metadata.width}x${metadata.height}, hasAlpha=${metadata.hasAlpha})`);
  }
  console.log(`[${name}] 小尺寸預覽：${previewPath}`);
}

async function main() {
  for (const iconSet of iconSets) {
    await generateIconSet(iconSet);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
