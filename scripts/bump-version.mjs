import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function bumpVersion(v) {
  const parts = v.split('.').map(Number);
  parts[2] += 1;
  if (parts[2] >= 10) {
    parts[2] = 0;
    parts[1] += 1;
  }
  if (parts[1] >= 10) {
    parts[1] = 0;
    parts[0] += 1;
  }
  return parts.join('.');
}

// Update Cargo.toml
const cargoPath = join(root, 'src-tauri', 'Cargo.toml');
let cargo = readFileSync(cargoPath, 'utf8');
const cargoMatch = cargo.match(/^version\s*=\s*"(\d+\.\d+\.\d+)"/m);
if (cargoMatch) {
  const newVer = bumpVersion(cargoMatch[1]);
  cargo = cargo.replace(/^version\s*=\s*"\d+\.\d+\.\d+"/m, `version = "${newVer}"`);
  writeFileSync(cargoPath, cargo);
  console.log(`Cargo.toml: ${cargoMatch[1]} → ${newVer}`);
}

// Update tauri.conf.json
const tauriPath = join(root, 'src-tauri', 'tauri.conf.json');
let tauri = readFileSync(tauriPath, 'utf8');
const tauriMatch = tauri.match(/"version"\s*:\s*"(\d+\.\d+\.\d+)"/);
if (tauriMatch) {
  const newVer = bumpVersion(tauriMatch[1]);
  tauri = tauri.replace(/"version"\s*:\s*"\d+\.\d+\.\d+"/, `"version": "${newVer}"`);
  writeFileSync(tauriPath, tauri);
  console.log(`tauri.conf.json: ${tauriMatch[1]} → ${newVer}`);
}

// Update AboutTab.tsx
const aboutPath = join(root, 'src', 'components', 'settings', 'AboutTab.tsx');
let about = readFileSync(aboutPath, 'utf8');
const aboutMatch = about.match(/const VERSION = '\d+\.\d+\.\d+'/);
if (aboutMatch) {
  const newVer = bumpVersion(aboutMatch[0].match(/\d+\.\d+\.\d+/)[0]);
  about = about.replace(/const VERSION = '\d+\.\d+\.\d+'/, `const VERSION = '${newVer}'`);
  writeFileSync(aboutPath, about);
  console.log(`AboutTab.tsx: ${aboutMatch[0].match(/\d+\.\d+\.\d+/)[0]} → ${newVer}`);
}

console.log('Version bump complete.');
