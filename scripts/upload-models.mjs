// Upload OCR model files to GitHub Releases
// Usage: node scripts/upload-models.mjs [tesseract|paddle|all]
// Default: all

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function exec(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
}

function execSilent(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: 'pipe', ...opts }).toString().trim();
}

// Auto-detect GH_TOKEN
let ghtoken = process.env.GH_TOKEN;
if (!ghtoken) {
  try {
    const cred = execSilent('printf "protocol=https\\nhost=github.com\\n\\n" | git credential fill');
    const match = cred.match(/password=(.+)/);
    if (match) ghtoken = match[1];
  } catch {}
}
if (!ghtoken) {
  console.error('❌ Cannot find GitHub token. Run gh auth login first.');
  process.exit(1);
}

const REPO = 'PixOfStars/AI-Vision';

// ── Model definitions ──
const MODELS = {
  tesseract: {
    tag: 'tesseract-lang',
    assetName: 'tesseract-lang.zip',
    sourceDir: join(root, 'public', 'tesseract'),
    sourceFiles: ['chi_sim.traineddata.gz', 'eng.traineddata.gz'],
    description: 'Tesseract OCR language data (Chinese Simplified + English)',
  },
  paddle: {
    tag: 'paddleocr-models',
    assetName: 'paddleocr-models.zip',
    sourceDir: join(root, '.tmp-models', 'paddle'),
    sourceFiles: [
      'ch_PP-OCRv4_det_infer.onnx',
      'ch_PP-OCRv4_rec_infer.onnx',
      'ppocr_keys_v1.txt',
    ],
    description: 'PP-OCRv4 ONNX detection + recognition models + dictionary (~15MB)',
    // Download source files first:
    //   curl -L -o .tmp-models/paddle/ch_PP-OCRv4_det_infer.onnx "https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.4.0/onnx/PP-OCRv4/det/ch_PP-OCRv4_det_infer.onnx"
    //   curl -L -o .tmp-models/paddle/ch_PP-OCRv4_rec_infer.onnx "https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.4.0/onnx/PP-OCRv4/rec/ch_PP-OCRv4_rec_infer.onnx"
    //   gh api repos/PaddlePaddle/PaddleOCR/contents/ppocr/utils/ppocr_keys_v1.txt?ref=release/2.7 --jq '.content' | base64 -d > .tmp-models/paddle/ppocr_keys_v1.txt
  },
};

function createZip(name) {
  const model = MODELS[name];
  const tmpDir = join(root, '.tmp-models');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const zipPath = join(tmpDir, model.assetName);
  if (existsSync(zipPath)) rmSync(zipPath);

  const files = model.sourceFiles
    .map(f => join(model.sourceDir, f))
    .filter(f => existsSync(f));

  if (files.length === 0) {
    console.log(`  ⚠ No source files found for ${name}.`);
    return null;
  }

  // Use PowerShell Compress-Archive on Windows, zip on Unix
  try {
    // Try PowerShell first (Windows)
    const escapedFiles = files.map(f => `'${f.replace(/'/g, "''")}'`).join(', ');
    const escapedDest = zipPath.replace(/'/g, "''");
    execSilent(`powershell -Command "Compress-Archive -Path ${escapedFiles} -DestinationPath '${escapedDest}' -Force"`);
  } catch {
    // Fallback: use zip command (Git Bash / MSYS2 / Unix)
    exec(`zip -j "${zipPath}" ${files.map(f => `"${f}"`).join(' ')}`);
  }

  for (const f of files) console.log(`  + ${f.replace(model.sourceDir + '/', '')}`);
  const sizeMB = (readFileSync(zipPath).length / 1_048_576).toFixed(1);
  console.log(`  ✅ ${model.assetName} (${sizeMB} MB)`);

  return zipPath;
}

async function uploadModel(name) {
  const model = MODELS[name];
  if (!model) {
    console.error(`Unknown model: ${name}`);
    return;
  }

  console.log(`\n📦 Packaging ${name} model...`);

  const zipPath = model.sourceDir ? createZip(name) : null;

  if (!zipPath) {
    console.log(`  → No ZIP to upload. Place ${model.assetName} in .tmp-models/ and re-run.`);
    return;
  }

  // Delete existing release with same tag
  try {
    execSilent(`gh release delete ${model.tag} --repo ${REPO} --yes`, {
      env: { ...process.env, GH_TOKEN: ghtoken },
    });
    console.log(`  🗑 Deleted old release ${model.tag}`);
  } catch {
    console.log(`  (no previous release ${model.tag})`);
  }

  // Create release and upload
  console.log(`  🚀 Creating release ${model.tag}...`);
  const notes = `${model.description}\n\nAuto-uploaded by upload-models.mjs`;
  exec(`gh release create ${model.tag} "${zipPath}" --repo ${REPO} --title "${model.tag}" --notes "${notes}"`, {
    env: { ...process.env, GH_TOKEN: ghtoken },
  });

  console.log(`  ✅ Done: https://github.com/${REPO}/releases/tag/${model.tag}`);
}

async function main() {
  const arg = process.argv[2] || 'all';

  if (arg === 'all') {
    await uploadModel('tesseract');
    await uploadModel('paddle');
  } else {
    await uploadModel(arg);
  }

  // Cleanup
  const tmpDir = join(root, '.tmp-models');
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });

  console.log('\n✅ All model uploads complete!\n');
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
