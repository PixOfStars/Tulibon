import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}

function exec(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
}
function execSilent(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: 'pipe', ...opts }).toString().trim();
}

// Auto-detect GitHub token
let ghtoken = process.env.GH_TOKEN;
if (!ghtoken) {
  try {
    const cred = execSilent('printf "protocol=https\\nhost=github.com\\n\\n" | git credential fill');
    const match = cred.match(/password=(.+)/);
    if (match) ghtoken = match[1];
  } catch {}
}
if (!ghtoken) {
  console.error('Cannot find GitHub token. Run gh auth login first.');
  process.exit(1);
}

const ghEnv = { ...process.env, GH_TOKEN: ghtoken };

// Read registry
const registryPath = join(root, 'plugins.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

// Build zip for a plugin
function zipPlugin(pluginId, sourceDir) {
  const tmpDir = join(root, 'plugins', '.tmp');
  mkdirSync(tmpDir, { recursive: true });
  const zipPath = join(tmpDir, pluginId + '.zip');
  try {
    execSilent('powershell -Command "Compress-Archive -Path \"' + sourceDir + '\*\" -DestinationPath \"' + zipPath + '\" -Force"');
  } catch (e) {
    console.error('  Warning: PowerShell zip failed for ' + pluginId + ', trying tar...');
    execSilent('tar -a -cf "' + zipPath + '" -C "' + sourceDir + '" .');
  }
  return zipPath;
}

// Publish one plugin
function publishPlugin(entry) {
  const { id, version } = entry;
  const tag = 'plugin-' + id + '-v' + version;
  const pluginDir = join(root, 'plugins', id);

  if (!existsSync(pluginDir)) {
    console.error('  Plugin directory not found: plugins/' + id);
    return false;
  }

  console.log();
  console.log('Publishing plugin: ' + id + ' v' + version);

  // 1. Zip
  const zipPath = zipPlugin(id, pluginDir);
  const zipSize = readFileSync(zipPath).length;
  console.log('   ZIP: ' + (zipSize / 1024).toFixed(1) + ' KB');

  // 2. Delete existing tag + release if any
  try { execSilent('gh release delete ' + tag + ' --repo PixOfStars/Tulibon --yes', { env: ghEnv }); } catch {}
  try { execSilent('git push origin :refs/tags/' + tag); } catch {}
  try { execSilent('git tag -d ' + tag); } catch {}

  // 3. Create tag
  execSilent('git tag ' + tag);
  execSilent('git push origin ' + tag);

  // 4. Create GitHub Release
  const notes = id + ' plugin v' + version;
  exec('gh release create ' + tag + ' "' + zipPath + '" --repo PixOfStars/Tulibon --title "Plugin: ' + id + ' v' + version + '" --notes "' + notes + '"', { env: ghEnv });

  // 5. Cleanup
  execSilent('rm -f "' + zipPath + '"');
  console.log('   Published: https://github.com/PixOfStars/Tulibon/releases/tag/' + tag);
  return true;
}

// Main
console.log('Tulibon Plugin Publisher');
console.log();
console.log('Found ' + registry.length + ' plugins in registry');
console.log();

let success = 0;
for (const entry of registry) {
  if (publishPlugin(entry)) success++;
}

// Cleanup tmp
const tmpDir = join(root, 'plugins', '.tmp');
if (existsSync(tmpDir)) {
  execSilent('rm -rf "' + tmpDir + '"');
}

console.log();
console.log('Published ' + success + '/' + registry.length + ' plugins');
console.log('Run the app and try installing plugins again.');
console.log();
