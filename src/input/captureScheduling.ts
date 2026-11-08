import type { CameraModeId } from './cameraDevices';

/**
 * When camera frames are processed.
 *
 * Display-driven (previous behaviour): each camera's newest frame is picked up
 * by the tracking loop's requestAnimationFrame (about 30 Hz in Lance's
 * profiles), and optical flow runs at most every 20 ms.
 *
 * Frame-driven: each camera's own requestVideoFrameCallback starts its
 * processing as soon as a frame arrives, and optical flow may run every 4 ms,
 * so 120 fps cameras (OV9281) are not limited to the display rate.
 *
 * 'auto' (default) is frame-driven for the OV9281 camera type only.
 */
export type FrameDrivenSetting = 'auto' | 'on' | 'off';
export const FRAME_DRIVEN_STORAGE_KEY = 'suturehero.frameDrivenCapture.v1';
/** Minimum time between optical-flow requests per camera (ms). */
export const FLOW_MIN_INTERVAL_MS = { display: 20, frameDriven: 4 } as const;

export function parseFrameDrivenSetting(value: unknown): FrameDrivenSetting {
  return value === 'on' || value === 'off' ? value : 'auto';
}

export function frameDrivenEnabled(setting: FrameDrivenSetting, mode: CameraModeId, supported: boolean): boolean {
  if (!supported) return false;
  return setting === 'on' || (setting === 'auto' && mode === 'ov9281');
}

const read = () => {
  try {
    return parseFrameDrivenSetting(localStorage.getItem(FRAME_DRIVEN_STORAGE_KEY));
  } catch {
    return 'auto' as const;
  }
};

/** Live setting (read on every frame), changed from Diagnostics → Performance. */
export const captureSettings = { frameDriven: read() as FrameDrivenSetting };

export function setFrameDriven(setting: FrameDrivenSetting) {
  captureSettings.frameDriven = setting;
  try {
    localStorage.setItem(FRAME_DRIVEN_STORAGE_KEY, setting);
  } catch {
    // Storage blocked: applies until reload.
  }
}
