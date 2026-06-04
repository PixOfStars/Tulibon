// Generate icons from SVG at all required sizes
import { readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '../src-tauri/icons');
const publicDir = resolve(__dirname, '../public');

const svg = readFileSync(resolve(iconsDir, 'icon.svg'));

const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '64x64.png', size: 64 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: '256x256.png', size: 256 },
  { name: 'icon.png', size: 256 },
];

async function main() {
  for (const { name, size } of sizes) {
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    writeFileSync(resolve(iconsDir, name), png);
    console.log(`Generated ${name} (${size}x${size}, ${png.length} bytes)`);
  }

  // Copy to public/icon.png for frontend use
  const publicIcon = await sharp(svg).resize(256, 256).png().toBuffer();
  writeFileSync(resolve(publicDir, 'icon.png'), publicIcon);
  console.log(`Generated public/icon.png (256x256, ${publicIcon.length} bytes)`);

  // Generate ICO with 32x32 and 256x256 embedded
  const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
  const png256 = await sharp(svg).resize(256, 256).png().toBuffer();
  writeIco(resolve(iconsDir, 'icon.ico'), [{ png: png32, size: 32 }, { png: png256, size: 256 }]);
  console.log('Generated icon.ico');
}

function writeIco(path, entries) {
  const headerSize = 6;
  const entrySize = 16;
  const totalHeader = headerSize + entrySize * entries.length;
  const imageData = Buffer.concat(entries.map(e => e.png));
  const totalSize = totalHeader + imageData.byteLength;

  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  // ICO header
  buf.writeUInt16LE(0, offset); offset += 2;     // reserved
  buf.writeUInt16LE(1, offset); offset += 2;     // ICO type
  buf.writeUInt16LE(entries.length, offset); offset += 2; // count

  // Write entries
  let dataOffset = totalHeader;
  for (const { png, size } of entries) {
    const w = size >= 256 ? 0 : size;
    const h = size >= 256 ? 0 : size;
    buf.writeUInt8(w, offset); offset += 1;
    buf.writeUInt8(h, offset); offset += 1;
    buf.writeUInt8(0, offset); offset += 1; // color palette
    buf.writeUInt8(0, offset); offset += 1; // reserved
    buf.writeUInt16LE(0, offset); offset += 2; // color planes
    buf.writeUInt16LE(32, offset); offset += 2; // bits per pixel
    buf.writeUInt32LE(png.byteLength, offset); offset += 4; // image size
    buf.writeUInt32LE(dataOffset, offset); offset += 4; // offset
    dataOffset += png.byteLength;
  }

  // Write image data
  for (const { png } of entries) {
    png.copy(buf, offset);
    offset += png.byteLength;
  }

  writeFileSync(path, buf);
}

main().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
