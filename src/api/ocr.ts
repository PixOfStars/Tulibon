import { createWorker, type Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('chi_sim+eng', 1, {
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
  return workerPromise;
}

export async function recognizeText(imageDataUrl: string, timeoutMs = 30000): Promise<string> {
  const worker = await getWorker();
  const result = await Promise.race([
    worker.recognize(imageDataUrl),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('OCR timed out')), timeoutMs)
    ),
  ]);
  return result.data.text || '';
}

export async function terminateWorker(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
