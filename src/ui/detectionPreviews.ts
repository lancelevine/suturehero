import { adaptiveThresholdInPlace, otsuThresholdInPlace } from './frameDiagnostics';

/**
 * Optional decode previews on the tracking page (moved out of tracking.ts, 2026-11-26):
 * the Otsu threshold of the whole frame, and a centre crop beside its adaptive threshold.
 * Both are diagnostics; turning one on makes tracking read full frames as ImageData.
 */
/** Largest side of the centre crop preview (px). */
const CROP_SIDE_PX = 440;

export interface DetectionPreviews {
  /** Whether a preview needs the decoded frame as ImageData. */
  readonly needsFrames: boolean;
  /** Draw the enabled previews from a decoded frame. */
  render(frame: ImageData): void;
}

const frameCanvas = (frame: ImageData) => {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  canvas.getContext('2d')!.putImageData(frame, 0, 0);
  return canvas;
};

export function mountDetectionPreviews(root: ParentNode = document): DetectionPreviews {
  const thresholdToggle = root.querySelector<HTMLInputElement>('#show-threshold')!;
  const thresholdPreview = root.querySelector<HTMLCanvasElement>('#threshold-preview')!;
  const thresholdContext = thresholdPreview.getContext('2d')!;
  const cropToggle = root.querySelector<HTMLInputElement>('#show-crop')!;
  const cropViews = root.querySelector<HTMLElement>('#crop-views')!;
  const cropOriginal = root.querySelector<HTMLCanvasElement>('#crop-original')!;
  const cropAdaptive = root.querySelector<HTMLCanvasElement>('#crop-adaptive')!;
  cropToggle.addEventListener('change', () => { cropViews.style.display = cropToggle.checked ? 'grid' : 'none'; });
  thresholdToggle.addEventListener('change', () => { thresholdPreview.style.display = thresholdToggle.checked ? 'block' : 'none'; });

  const renderCrop = (frame: ImageData) => {
    const side = Math.min(CROP_SIDE_PX, frame.width, frame.height);
    const sx = Math.floor((frame.width - side) / 2);
    const sy = Math.floor((frame.height - side) / 2);
    const original = cropOriginal.getContext('2d')!;
    const adaptive = cropAdaptive.getContext('2d')!;
    cropOriginal.width = side;
    cropOriginal.height = side;
    cropAdaptive.width = side;
    cropAdaptive.height = side;
    original.drawImage(frameCanvas(frame), sx, sy, side, side, 0, 0, side, side);
    const data = original.getImageData(0, 0, side, side);
    adaptiveThresholdInPlace(data);
    adaptive.putImageData(data, 0, 0);
  };
  const renderThreshold = (frame: ImageData) => {
    const w = Math.max(1, Math.round(frame.width / 2));
    const h = Math.max(1, Math.round(frame.height / 2));
    thresholdPreview.width = w;
    thresholdPreview.height = h;
    thresholdContext.drawImage(frameCanvas(frame), 0, 0, w, h);
    const output = thresholdContext.getImageData(0, 0, w, h);
    otsuThresholdInPlace(output);
    thresholdContext.putImageData(output, 0, 0);
  };
  return {
    get needsFrames() { return thresholdToggle.checked || cropToggle.checked; },
    render(frame) {
      if (thresholdToggle.checked) renderThreshold(frame);
      if (cropToggle.checked) renderCrop(frame);
    },
  };
}
