/**
 * Camera device helpers shared by the tracking page: which mode to request
 * from a webcam, listing devices, remembering the chosen device, and the
 * slider scales used by the manual exposure/gain/focus controls.
 *
 * Kept free of tracking state so it can be unit tested and changed safely
 * (for example when switching to different camera hardware).
 */

/**
 * The video mode requested from each camera. These are `ideal` values: the
 * browser picks the closest mode the camera supports.
 *
 * To change camera hardware (e.g. OV9281 global-shutter cameras at
 * 1280×800 / 120 fps), change these values and re-test tracking speed.
 */
export const CAMERA_REQUEST = {
  width: 1920,
  height: 1080,
  frameRate: 30,
} as const;

export function cameraConstraints(deviceId?: string): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: { ideal: CAMERA_REQUEST.width },
      height: { ideal: CAMERA_REQUEST.height },
      frameRate: { ideal: CAMERA_REQUEST.frameRate },
    },
  };
}

export async function openCamera(deviceId?: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(cameraConstraints(deviceId));
}

export async function availableCameras(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'videoinput');
}

// Storage keys predate the `suturehero.<name>.v<n>` convention; renaming them
// would forget users' chosen cameras, so they are kept as-is.
export const CAMERA_STORAGE_PRIMARY = 'suturehero-camera-primary';
export const CAMERA_STORAGE_SECONDARY = 'suturehero-camera-secondary';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): KeyValueStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** The remembered device ID for a camera slot, or '' if none or unavailable. */
export function savedCamera(key: string, storage = defaultStorage()): string {
  try {
    return storage?.getItem(key) || '';
  } catch {
    return '';
  }
}

/** Remember (or with '' forget) the device chosen for a camera slot. */
export function rememberCamera(key: string, value: string, storage = defaultStorage()): void {
  try {
    if (value) storage?.setItem(key, value);
    else storage?.removeItem(key);
  } catch {
    // Storage may be disabled; the choice then lasts only for this page.
  }
}

export interface CameraOption {
  value: string;
  label: string;
}

/**
 * Options for a camera <select>: a placeholder ('' value) followed by each
 * device, plus which value to select. The previous choice is kept only if
 * that device is still connected.
 */
export function cameraOptions(
  devices: ReadonlyArray<Pick<MediaDeviceInfo, 'deviceId' | 'label'>>,
  current: string,
  placeholder: string,
): { options: CameraOption[]; selected: string } {
  const options: CameraOption[] = [{ value: '', label: placeholder }];
  devices.forEach((device, index) => {
    options.push({ value: device.deviceId, label: device.label || `Camera ${index + 1}` });
  });
  const selected = devices.some((device) => device.deviceId === current) ? current : '';
  return { options, selected };
}

/** Replace a <select>'s options with the connected cameras. */
export function fillCameraSelect(
  select: HTMLSelectElement,
  devices: ReadonlyArray<Pick<MediaDeviceInfo, 'deviceId' | 'label'>>,
  current: string,
  placeholder: string,
): void {
  const { options, selected } = cameraOptions(devices, current, placeholder);
  select.replaceChildren(
    ...options.map(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      return option;
    }),
  );
  select.value = selected;
}

export interface CameraRange {
  min: number;
  max: number;
  step?: number;
}

/** Sliders run over 0…SLIDER_STEPS and are mapped onto the camera's range. */
export const SLIDER_STEPS = 1000;

/**
 * Maps a 0–1 slider fraction to a camera control value and back. Exposure
 * time uses a logarithmic scale (when its minimum is positive) so the useful
 * short exposures are spread across the whole slider; other controls are
 * linear. `quantize` clamps to the range and snaps to the camera's step.
 */
export function cameraControlScale(key: string, range: CameraRange) {
  const { min, max } = range;
  const logarithmic = key === 'exposureTime' && min > 0;
  const toValue = (fraction: number) =>
    logarithmic ? min * Math.pow(max / min, fraction) : min + (max - min) * fraction;
  const toFraction = (value: number) =>
    logarithmic
      ? Math.log(Math.max(min, value) / min) / Math.log(max / min)
      : (value - min) / (max - min);
  const quantize = (value: number) => {
    const step = range.step && range.step > 0 ? range.step : 0;
    const snapped = step ? min + Math.round((value - min) / step) * step : value;
    return Math.min(max, Math.max(min, snapped));
  };
  return { logarithmic, toValue, toFraction, quantize };
}

/** A usable numeric camera capability: finite with max above min. */
export function isUsableRange(range: CameraRange | undefined): range is CameraRange {
  return !!range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.max > range.min;
}
