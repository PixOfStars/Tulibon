import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '..', 'src-tauri', 'icons');
const publicDir = resolve(__dirname, '..', 'public');
const svgPath = resolve(iconsDir, 'icon.svg');

const svgBuffer = readFileSync(svgPath);
const sizes = [32, 64, 128, 256];

for (const size of sizes) {
  const pngBuffer = await sharp(svgBuffer).resize(size, size).png().toBuffer();
  const outPath = resolve(iconsDir, `${size}x${size}.png`);
  writeFileSync(outPath, pngBuffer);
  console.log(`Generated ${outPath} (${pngBuffer.length} bytes)`);
}

// Copy 32x32 to icon.png in both locations
const png32 = readFileSync(resolve(iconsDir, '32x32.png'));
writeFileSync(resolve(iconsDir, 'icon.png'), png32);
writeFileSync(resolve(publicDir, 'icon.png'), png32);
console.log('Copied 32x32.png → icon.png');

// Copy to dist (for dev mode hot-reload)
const distPublicDir = resolve(__dirname, '..', 'dist');
if (existsSync(distPublicDir)) {
  writeFileSync(resolve(distPublicDir, 'icon.png'), png32);
  console.log('Copied icon.png → dist/');
}

// Generate ICO from 32x32 PNG
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(32, 0);
icoEntry.writeUInt8(32, 1);
icoEntry.writeUInt8(0, 2);
icoEntry.writeUInt8(0, 3);
icoEntry.writeUInt16LE(1, 4);
icoEntry.writeUInt16LE(32, 6);
icoEntry.writeUInt32LE(png32.length, 8);
icoEntry.writeUInt32LE(22, 12);

const ico = Buffer.concat([icoHeader, icoEntry, png32]);
writeFileSync(resolve(iconsDir, 'icon.ico'), ico);
console.log(`Generated icon.ico (${ico.length} bytes)`);

console.log('Done!');
