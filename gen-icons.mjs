import sharp from 'sharp';
import { createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'icon.png');

// Android mipmap 크기
const androidSizes = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const androidBase = path.join(
  __dirname, '..', 'construction-docs', '작업일보-apk',
  'android', 'app', 'src', 'main', 'res'
);

async function main() {
  const src = sharp(SRC);

  // 1. Android mipmap ic_launcher PNGs
  for (const { dir, size } of androidSizes) {
    const outDir = path.join(androidBase, dir);
    // ic_launcher
    await src.clone().resize(size, size).toFile(path.join(outDir, 'ic_launcher.png'));
    // ic_launcher_round
    await src.clone().resize(size, size).toFile(path.join(outDir, 'ic_launcher_round.png'));
    // ic_launcher_foreground (72% 크기 패딩 추가)
    const padded = Math.round(size * 0.72);
    const offset = Math.round((size - padded) / 2);
    const fg = await src.clone().resize(padded, padded).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: { r:26,g:58,b:42,alpha:1 } } })
      .composite([{ input: fg, top: offset, left: offset }])
      .png().toFile(path.join(outDir, 'ic_launcher_foreground.png'));
    console.log(`✓ Android ${dir} (${size}px)`);
  }

  // 2. Electron icon (512px PNG → construction-docs/icon.png)
  const electronIcon = path.join(__dirname, '..', 'construction-docs', 'icon.png');
  await src.clone().resize(512, 512).toFile(electronIcon);
  console.log('✓ Electron icon.png (512px)');

  // 3. SVG manifest icon 덮어쓰기용 1024px
  await src.clone().resize(1024, 1024).toFile(path.join(__dirname, 'icon-1024.png'));
  console.log('✓ icon-1024.png (1024px)');

  console.log('\n모든 아이콘 생성 완료!');
}

main().catch(console.error);
