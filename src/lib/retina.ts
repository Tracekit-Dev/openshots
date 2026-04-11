import { useAppStore } from "../stores/app.store";

/**
 * If Retina downscale is enabled and the display has a devicePixelRatio > 1,
 * returns a new HTMLImageElement scaled down to 1x resolution.
 * Otherwise returns the original image unchanged.
 */
export function maybeDownscaleRetina(
  img: HTMLImageElement,
): Promise<HTMLImageElement> {
  const { retinaDownscale } = useAppStore.getState();
  const dpr = window.devicePixelRatio || 1;

  if (!retinaDownscale || dpr <= 1) {
    return Promise.resolve(img);
  }

  const newW = Math.round(img.naturalWidth / dpr);
  const newH = Math.round(img.naturalHeight / dpr);

  const offscreen = document.createElement("canvas");
  offscreen.width = newW;
  offscreen.height = newH;
  const ctx = offscreen.getContext("2d");
  if (!ctx) {
    return Promise.resolve(img);
  }

  ctx.drawImage(img, 0, 0, newW, newH);

  return new Promise((resolve) => {
    offscreen.toBlob((blob) => {
      if (!blob) {
        resolve(img);
        return;
      }
      const url = URL.createObjectURL(blob);
      const downscaled = new window.Image();
      downscaled.onload = () => resolve(downscaled);
      downscaled.onerror = () => resolve(img);
      downscaled.src = url;
    }, "image/png");
  });
}
