interface RemovalOverlayProps {
  imageId: string | null;
  isProcessing: boolean;
  progress: number;
  status: string;
  error: string | null;
  onRetry: () => void;
  imageRect?: { x: number; y: number; width: number; height: number };
}

export default function RemovalOverlay({
  imageId,
  isProcessing,
  progress,
  status,
  error,
  onRetry,
  imageRect,
}: RemovalOverlayProps) {
  if (!imageId) return null;

  const isDownloading =
    isProcessing && (status === "download" || status === "progress" || status === "initiate");
  const isInferring = isProcessing && (status === "done" || status === "loaded");

  return (
    <>
      {/* Progress toast during model download */}
      {isDownloading && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg shadow-xl px-4 py-3 min-w-[280px]">
            <p className="text-[13px] text-zinc-200 mb-2">
              Downloading AI model... {Math.round(progress)}%
            </p>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-100 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error toast with retry */}
      {error && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-zinc-900 border border-red-700/60 rounded-lg shadow-xl px-4 py-3 min-w-[280px]">
            <p className="text-[13px] text-red-400 mb-2">{error}</p>
            <button
              onClick={onRetry}
              className="px-3 py-1 text-[13px] rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Spinner overlay on the image during inference */}
      {isInferring && imageRect && (
        <div
          className="absolute z-40 flex items-center justify-center bg-black/50 rounded-lg"
          style={{
            left: imageRect.x,
            top: imageRect.y,
            width: imageRect.width,
            height: imageRect.height,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] text-zinc-200">Removing background...</span>
          </div>
        </div>
      )}
    </>
  );
}
