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

/** Without camera frame callbacks, flow runs at most this often (ms). */
export const TIMED_FLOW_INTERVAL_MS = 33;
/** Marker decode interval (ms): faster while recovering or with focused (ROI) decoding. */
export const DECODE_INTERVAL_MS = { fast: 65, normal: 110 } as const;

export interface CaptureDueInput {
  now: number;
  lastFlowAt: number;
  lastDecodeAt: number;
  flowBusy: boolean;
  decodeBusy: boolean;
  /** Frame-callback clock for this camera: whether it exists and has an unprocessed frame. */
  clock: { fresh: boolean } | null | undefined;
  /** Flow interval when frame callbacks are available (ms), after back-off. */
  flowIntervalMs: number;
  /** Decode at the fast interval (recovering, or focused decoding on). */
  fastDecode: boolean;
}

/**
 * Which work is due for a camera this tick. `skippedDuplicate`: flow was due
 * but the camera has not delivered a new frame since the last one.
 */
export function captureDue(input: CaptureDueInput) {
  const flowDue = !input.flowBusy && input.now - input.lastFlowAt >= (input.clock ? input.flowIntervalMs : TIMED_FLOW_INTERVAL_MS);
  const doFlow = flowDue && (!input.clock || input.clock.fresh);
  const decodeIntervalMs = input.fastDecode ? DECODE_INTERVAL_MS.fast : DECODE_INTERVAL_MS.normal;
  const doDecode = !input.decodeBusy && input.now - input.lastDecodeAt >= decodeIntervalMs;
  return { doFlow, doDecode, skippedDuplicate: flowDue && !doFlow };
}
