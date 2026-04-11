import {
  AutoModel,
  AutoProcessor,
  RawImage,
  env,
} from '@huggingface/transformers';
import type { WorkerRequest, WorkerResponse, ProgressInfo } from './types';

// Configure environment for worker context
env.allowLocalModels = false;

type ModelInstance = Awaited<ReturnType<typeof AutoModel.from_pretrained>>;
type ProcessorInstance = Awaited<
  ReturnType<typeof AutoProcessor.from_pretrained>
>;

let model: ModelInstance | null = null;
let processor: ProcessorInstance | null = null;

function post(msg: WorkerResponse): void {
  self.postMessage(msg);
}

async function detectDevice(): Promise<'webgpu' | 'wasm'> {
  if ('gpu' in navigator) {
    try {
      const adapter = await (
        navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } }
      ).gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch {
      // WebGPU not available, fall back to WASM
    }
  }
  return 'wasm';
}

async function handleLoad(): Promise<void> {
  try {
    const device = await detectDevice();
    console.log(`[bg-removal] Using device: ${device}`);

    model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
      device,
      dtype: device === 'webgpu' ? 'fp32' : 'q8',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { model_type: 'custom' } as any,
      progress_callback: (progress: unknown) => {
        post({ type: 'progress', payload: progress as ProgressInfo });
      },
    });

    processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
      config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        image_std: [1, 1, 1],
        feature_extractor_type: 'ImageFeatureExtractor',
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      },
    });

    post({ type: 'loaded', payload: { device } });
  } catch (err) {
    post({ type: 'error', payload: (err as Error).message });
  }
}

async function handleRemove(imageDataUrl: string): Promise<void> {
  if (!model || !processor) {
    post({ type: 'error', payload: 'Model not loaded' });
    return;
  }

  try {
    const img = await RawImage.fromURL(imageDataUrl);
    const { pixel_values } = await processor(img);
    const { output } = await (model as ModelInstance & { __call__: unknown })({
      input: pixel_values,
    });

    // Generate alpha mask from model output
    const maskRaw = await RawImage.fromTensor(output[0].mul(255).to('uint8'));
    const maskData = await maskRaw.resize(img.width, img.height);

    // Composite original RGB with mask alpha on OffscreenCanvas
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(img.width, img.height);

    for (let i = 0; i < img.width * img.height; i++) {
      imageData.data[4 * i] = (img.data[3 * i] ?? 0) as number; // R
      imageData.data[4 * i + 1] = (img.data[3 * i + 1] ?? 0) as number; // G
      imageData.data[4 * i + 2] = (img.data[3 * i + 2] ?? 0) as number; // B
      imageData.data[4 * i + 3] = (maskData.data[i] ?? 0) as number; // A from mask
    }
    ctx.putImageData(imageData, 0, 0);

    // Convert to PNG data URL without FileReaderSync (per Pitfall 5)
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    const dataUrl = 'data:image/png;base64,' + btoa(binary);

    post({ type: 'result', payload: { dataUrl } });
  } catch (err) {
    post({ type: 'error', payload: (err as Error).message });
  }
}

async function handleDispose(): Promise<void> {
  // CRITICAL: Dispose to prevent 500MB-2GB memory leak
  if (model) {
    await (model as ModelInstance & { dispose(): Promise<void> }).dispose();
    model = null;
  }
  processor = null;
  post({ type: 'disposed' });
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'load':
      await handleLoad();
      break;
    case 'remove':
      await handleRemove(msg.payload.imageDataUrl);
      break;
    case 'dispose':
      await handleDispose();
      break;
  }
};
