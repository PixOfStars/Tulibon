import { createWorker, type Worker } from 'tesseract.js';

// ── Reference-counted worker singleton ──
// Each call to recognizeText acquires a reference; the worker is terminated
// only when all active calls have released their references.
let workerPromise: Promise<Worker> | null = null;
let refCount = 0;

function createTesseractWorker(): Promise<Worker> {
  return createWorker('chi_sim+eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/tesseract-core.wasm.js',
    langPath: '/tesseract/',
    logger: (m) => {
      if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
        console.debug(`[OCR] ${m.status}: ${Math.round((m.progress || 0) * 100)}%`);
      }
    },
  });
}

async function acquireWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createTesseractWorker();
  }
  refCount++;
  return workerPromise;
}

async function releaseWorker(): Promise<void> {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}

export async function recognizeText(imageDataUrl: string, timeoutMs = 30000): Promise<string> {
  const worker = await acquireWorker();
  try {
    const result = await Promise.race([
      worker.recognize(imageDataUrl),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timed out')), timeoutMs)
      ),
    ]);
    return result.data.text || '';
  } catch (e) {
    // On timeout or any failure, terminate the worker to prevent resource leaks.
    // The next recognizeText call will create a fresh worker.
    if (workerPromise) {
      const w = await workerPromise;
      await w.terminate();
      workerPromise = null;
      refCount = 0;
    }
    throw e;
  } finally {
    await releaseWorker();
  }
}

export async function terminateWorker(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
    refCount = 0;
  }
}
