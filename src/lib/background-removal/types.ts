export interface ProgressInfo {
  status: 'initiate' | 'download' | 'progress' | 'done';
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export type WorkerRequest =
  | { type: 'load' }
  | { type: 'remove'; payload: { imageDataUrl: string } }
  | { type: 'dispose' };

export type WorkerResponse =
  | { type: 'progress'; payload: ProgressInfo }
  | { type: 'loaded'; payload: { device: string } }
  | { type: 'result'; payload: { dataUrl: string } }
  | { type: 'error'; payload: string }
  | { type: 'disposed' };
