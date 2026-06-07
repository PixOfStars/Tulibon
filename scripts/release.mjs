import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env if present
const envPath = join(root, '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}

function bumpVersion(v) {
  const parts = v.split('.').map(Number);
  parts[2] += 1;
  if (parts[2] >= 10) { parts[2] = 0; parts[1] += 1; }
  if (parts[1] >= 100) { parts[1] = 0; parts[0] += 1; }
  return `${parts[0]}.${String(parts[1]).padStart(2,'0')}.${parts[2]}`;
}

function exec(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
}

function execSilent(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: 'pipe', ...opts }).toString().trim();
}

// ── Workspace check ──
const porcelain = execSilent('git status --porcelain');
if (porcelain.trim()) {
  console.error('❌ 工作区不干净，请先提交或暂存修改再发版');
  process.exit(1);
}

// ── Auto-detect secrets ──
// 1. GitHub token from Windows credential manager (same as git push uses)
let ghtoken = process.env.GH_TOKEN;
if (!ghtoken) {
  try {
    const cred = execSilent('printf "protocol=https\\nhost=github.com\\n\\n" | git credential fill');
    const match = cred.match(/password=(.+)/);
    if (match) ghtoken = match[1];
  } catch {}
}
if (!ghtoken) {
  console.error('❌ Cannot find GitHub token. Make sure you are logged in with gh auth login.');
  process.exit(1);
}

// 2. Signing key from ~/.tauri/
const keyPath = join(homedir(), '.tauri', 'Tulibon.key');
if (!existsSync(keyPath)) {
  console.error('❌ Signing key not found at ' + keyPath);
  console.error('   Generate it first: npx tauri signer generate -w ' + keyPath + ' -p Tulibon --ci');
  process.exit(1);
}
const signingKey = readFileSync(keyPath, 'utf8').trim();
const signingPass = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;
if (!signingPass) {
  console.error('❌ TAURI_SIGNING_PRIVATE_KEY_PASSWORD not set.');
  console.error('   Set it in your environment before running this script.');
  process.exit(1);
}

// ── Step 1: Bump version (before Tauri reads it) ──
const cargoPath = join(root, 'src-tauri', 'Cargo.toml');
let cargo = readFileSync(cargoPath, 'utf8');
const cargoMatch = cargo.match(/^version\s*=\s*"(\d+\.\d+\.\d+)"/m);
if (!cargoMatch) { console.error('Cannot find version in Cargo.toml'); process.exit(1); }
const currentVer = cargoMatch[1];
const newVer = bumpVersion(currentVer);

console.log(`\n📦 Release: ${currentVer} → ${newVer}\n`);

cargo = cargo.replace(/^version\s*=\s*"\d+\.\d+\.\d+"/m, `version = "${newVer}"`);
writeFileSync(cargoPath, cargo);

const tauriPath = join(root, 'src-tauri', 'tauri.conf.json');
let tauriConf = readFileSync(tauriPath, 'utf8');
tauriConf = tauriConf.replace(/"version"\s*:\s*"\d+\.\d+\.\d+"/, `"version": "${newVer}"`);
writeFileSync(tauriPath, tauriConf);

const aboutPath = join(root, 'src', 'components', 'settings', 'AboutTab.tsx');
let about = readFileSync(aboutPath, 'utf8');
about = about.replace(/const VERSION = '\d+\.\d+\.\d+'/, `const VERSION = '${newVer}'`);
writeFileSync(aboutPath, about);

const pkgPath = join(root, 'package.json');
let pkg = readFileSync(pkgPath, 'utf8');
pkg = pkg.replace(/"version"\s*:\s*"\d+\.\d+\.\d+"/, `"version": "${newVer}"`);
writeFileSync(pkgPath, pkg);

console.log('✅ Version bumped\n');

// ── Step 1.5: Generate changelog ──
let changelog = '';
try {
  const prevTags = execSilent('git tag --sort=-v:refname');
  const prevTag = prevTags ? prevTags.split('\n')[0].trim() : '';
  if (prevTag) {
    const log = execSilent(`git log ${prevTag}..HEAD --pretty=format:"- %s" --no-merges`);
    if (log) {
      changelog = log;
      console.log(`📝 Changelog since ${prevTag}:\n${changelog}\n`);
    }
  }
  if (!changelog) {
    changelog = `- Release ${newVer}`;
  }
} catch {
  changelog = `- Release ${newVer}`;
}

// ── Step 2: Pre-clean deps cache ──
const depsDir = join(root, 'src-tauri', 'target', 'release', 'deps');
if (existsSync(depsDir)) {
  rmSync(depsDir, { recursive: true, force: true });
  console.log('🧹 Pre-cleaned target/release/deps/\n');
}

// ── Step 3: Build ──
console.log('🔨 Building...\n');
exec('npx tsc -b && npx vite build');
exec('npx tauri build', {
  env: { ...process.env, GH_TOKEN: ghtoken, TAURI_SIGNING_PRIVATE_KEY: signingKey, TAURI_SIGNING_PRIVATE_KEY_PASSWORD: signingPass },
});

// ── Step 3: Find artifacts ──
const nsisDir = join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
function findArtifact(ver) {
  const inst = join(nsisDir, `Tulibon_${ver}_x64-setup.exe`);
  const sig = join(nsisDir, `Tulibon_${ver}_x64-setup.exe.sig`);
  if (existsSync(inst) && existsSync(sig)) return { inst, sig, ver };
  return null;
}
const artifacts = findArtifact(newVer) || findArtifact(currentVer);
if (!artifacts) { console.error('❌ Build artifacts not found!'); process.exit(1); }

const installerName = artifacts.inst.split('/').pop().split('\\').pop();
const sigContent = readFileSync(artifacts.sig, 'utf8').trim();
console.log(`\n✅ Installer: ${installerName}\n`);

// ── Step 4: Delete old release (keep only latest) ──
const prevTag = `v${currentVer}`;
try {
  execSilent(`gh release delete ${prevTag} --repo PixOfStars/Tulibon --yes`, {
    env: { ...process.env, GH_TOKEN: ghtoken },
  });
  console.log(`🗑️  Deleted old release ${prevTag}`);
} catch {
  console.log(`  (no previous release ${prevTag} to delete)`);
}

// ── Step 5: GitHub Release ──
const tag = `v${newVer}`;
const releaseNote = process.env.RELEASE_NOTES || `Release ${tag}\n\n${changelog}`;
console.log(`🚀 Creating GitHub Release ${tag}...`);
exec(`gh release create ${tag} "${artifacts.inst}" "${artifacts.sig}" --repo PixOfStars/Tulibon --title "${tag}" --notes "${releaseNote}"`, {
  env: { ...process.env, GH_TOKEN: ghtoken },
});

// ── Step 6: Update latest.json + CHANGELOG.md via GitHub API (no clone needed) ──
console.log('📝 Updating latest.json & CHANGELOG.md via API...');

function ghApi(cmd) {
  return execSilent(`gh api ${cmd}`, {
    env: { ...process.env, GH_TOKEN: ghtoken },
  });
}

function pushFile(path, content, commitMsg) {
  const encoded = Buffer.from(content).toString('base64');
  let existingSha = '';
  try {
    const getResult = JSON.parse(ghApi(`repos/PixOfStars/Tulibon/contents/${path}?ref=master`));
    existingSha = getResult.sha;
  } catch {}
  const payload = { message: commitMsg, content: encoded, branch: 'master' };
  if (existingSha) payload.sha = existingSha;
  const tmpPayload = join(root, '..', '.tmp-payload.json');
  writeFileSync(tmpPayload, JSON.stringify(payload));
  ghApi(`repos/PixOfStars/Tulibon/contents/${path} --input "${tmpPayload}" -X PUT`);
  execSilent(`rm -f "${tmpPayload}"`);
}

const latestJson = {
  version: newVer,
  notes: releaseNote,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: sigContent,
      url: `https://github.com/PixOfStars/Tulibon/releases/download/${tag}/${installerName}`,
    },
  },
};
pushFile('latest.json', JSON.stringify(latestJson, null, 2) + '\n', `Release ${tag}`);

// Sync README.md from local repo
const readmePath = join(root, 'README.md');
if (existsSync(readmePath)) {
  const readmeContent = readFileSync(readmePath, 'utf8');
  pushFile('README.md', readmeContent, `Update README for ${tag}`);
}

// Sync CHANGELOG.md from local repo (local file is the source of truth)
const localChangelogPath = join(root, 'CHANGELOG.md');
if (existsSync(localChangelogPath)) {
  const localChangelog = readFileSync(localChangelogPath, 'utf8');
  pushFile('CHANGELOG.md', localChangelog, `Update changelog for ${tag}`);
} else {
  // Fallback: generate from git log if local file doesn't exist
  const changelogEntry = `## ${tag} (${new Date().toISOString().slice(0, 10)})\n\n${changelog}\n\n`;
  let existingChangelog = '';
  try {
    const getResult = JSON.parse(ghApi('repos/PixOfStars/Tulibon/contents/CHANGELOG.md?ref=master'));
    existingChangelog = Buffer.from(getResult.content, 'base64').toString('utf8');
  } catch {}
  let newChangelog;
  if (existingChangelog) {
    const insertPos = existingChangelog.indexOf('\n## ') === -1 ? existingChangelog.length : existingChangelog.indexOf('\n## ');
    newChangelog = existingChangelog.slice(0, insertPos) + '\n' + changelogEntry + existingChangelog.slice(insertPos);
  } else {
    newChangelog = `# Changelog\n\n${changelogEntry}`;
  }
  pushFile('CHANGELOG.md', newChangelog, `Update changelog for ${tag}`);
}

// ── Step 7: Commit version bump + push to main repo ──
console.log('📤 Committing version bump...');
execSilent('git add src-tauri/Cargo.toml src-tauri/tauri.conf.json src/components/settings/AboutTab.tsx package.json');
execSilent(`git commit -m "Bump version to ${newVer}"`);
try {
  execSilent('git push');
  console.log('   Pushed to main repo');
} catch {
  console.log('   ⚠️  git push failed (network), run it later manually');
}

// ── Step 8: Clean up build artifacts ──
console.log('🧹 Cleaning build artifacts...');
const releaseDir = join(root, 'src-tauri', 'target', 'release');
const debugDir = join(root, 'src-tauri', 'target', 'debug');
const nsisCleanDir = join(releaseDir, 'bundle', 'nsis');

// Clean target/debug (safe to always delete)
if (existsSync(debugDir)) {
  rmSync(debugDir, { recursive: true, force: true });
  console.log('   Deleted target/debug/');
}

// Clean target/release intermediate build artifacts (keep bundle/)
const keepDirs = new Set(['bundle', '.fingerprint']);
for (const entry of readdirSync(releaseDir, { withFileTypes: true })) {
  if (entry.isDirectory() && !keepDirs.has(entry.name)) {
    rmSync(join(releaseDir, entry.name), { recursive: true, force: true });
  }
}
// Remove loose files in release/ (keep only directories)
for (const entry of readdirSync(releaseDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    rmSync(join(releaseDir, entry.name), { force: true });
  }
}
console.log('   Cleaned target/release/ (kept bundle/)');

// Remove old installers from nsis (keep only current version)
for (const f of readdirSync(nsisCleanDir)) {
  if (!f.includes(newVer)) {
    rmSync(join(nsisCleanDir, f), { force: true });
  }
}
console.log('   Removed old installers');

console.log(`\n✅ Release ${tag} complete!`);
console.log(`   https://github.com/PixOfStars/Tulibon/releases/tag/${tag}\n`);
