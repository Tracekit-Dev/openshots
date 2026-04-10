import type { WorkerRequest, WorkerResponse, ProgressInfo } from './types';

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return worker;
}

export async function removeBackground(
  imageDataUrl: string,
  onProgress?: (info: ProgressInfo) => void,
): Promise<string> {
  const w = getWorker();

  return new Promise<string>((resolve, reject) => {
    let modelLoaded = false;

    const handler = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;

      switch (msg.type) {
        case 'progress':
          onProgress?.(msg.payload);
          break;

        case 'loaded':
          modelLoaded = true;
          console.log(
            `[bg-removal] Model loaded, device: ${msg.payload.device}`,
          );
          w.postMessage({
            type: 'remove',
            payload: { imageDataUrl },
          } satisfies WorkerRequest);
          break;

        case 'result':
          w.removeEventListener('message', handler);
          // Dispose model after use to free memory
          w.postMessage({ type: 'dispose' } satisfies WorkerRequest);
          resolve(msg.payload.dataUrl);
          break;

        case 'error':
          w.removeEventListener('message', handler);
          if (modelLoaded) {
            w.postMessage({ type: 'dispose' } satisfies WorkerRequest);
          }
          reject(new Error(msg.payload));
          break;

        case 'disposed':
          // Acknowledgment only, no action needed
          break;
      }
    };

    w.addEventListener('message', handler);
    w.postMessage({ type: 'load' } satisfies WorkerRequest);
  });
}

export function disposeWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
