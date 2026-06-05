import { build } from 'esbuild';
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pluginsDir = join(root, 'plugins');
const registryPath = join(root, 'plugins.json');

const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

// Collect all plugins with TSX source
const plugins = [];
for (const entry of registry) {
  const dir = join(pluginsDir, entry.id);
  if (!existsSync(dir)) continue;
  for (const name of ['index.tsx', 'settings.tsx']) {
    const src = join(dir, name);
    if (existsSync(src)) {
      plugins.push({ id: entry.id, src, out: src.replace(/\.tsx$/, '.js') });
    }
  }
}

if (plugins.length === 0) {
  console.log('No plugin TSX files found. Skipping plugin build.');
  process.exit(0);
}

console.log('Building ' + plugins.length + ' plugin files...\n');

for (const p of plugins) {
  try {
    await build({
      entryPoints: [p.src],
      outfile: p.out,
      bundle: false,
      format: 'iife',
      target: 'es2020',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      write: true,
      minify: false,
    });
    const inSize = readFileSync(p.src).length;
    const outSize = readFileSync(p.out).length;
    const name = p.src.replace(/\\/g, '/').split('/').pop();
    console.log('  ' + p.id + '/' + name +
      '  ' + (inSize / 1024).toFixed(1) + 'KB -> ' + (outSize / 1024).toFixed(1) + 'KB');
  } catch (e) {
    console.error('  FAILED: ' + p.src + ' - ' + e.message);
  }
}

console.log('\nDone.');
