/**
 * iPhone camera mode helpers (2026-11-15), for SutureHero opened in Safari on
 * the iPhone. Safari's "Back Dual Wide / Dual / Triple Camera" devices are
 * virtual multi-lens cameras that switch lenses by themselves (for example to
 * the ultra-wide for close-up macro), so the image jumps in scale and
 * distortion: marker tracking and calibration break. The single "Back Camera"
 * (the 1× wide lens) keeps one lens. Approximate guidance; not tested on a
 * real iPhone by the agent.
 */

/** Device labels of iOS multi-lens or non-main rear cameras. */
const SWITCHING_OR_OTHER_LENS = /dual|triple|ultra ?wide|telephoto/i;
/** The single main rear camera on iOS ("Back Camera"; "Rückkamera", "Caméra arrière" … in other languages). */
const MAIN_BACK_CAMERA = /^(back camera|rear camera)$/i;

export interface CameraLike {
  deviceId: string;
  label: string;
}

/** Whether this looks like an iPhone browser. */
export function isIphone(userAgent: string): boolean {
  return /iPhone/.test(userAgent);
}

/** Whether a camera label is a lens-switching (or ultra-wide/telephoto) rear camera. */
export function isSwitchingLens(label: string): boolean {
  return SWITCHING_OR_OTHER_LENS.test(label);
}

/**
 * The camera to use in iPhone mode: the chosen one unless it switches lenses,
 * in which case the single main rear camera (if listed). Null keeps the choice.
 */
export function preferredIphoneCamera(currentLabel: string, cameras: readonly CameraLike[]): CameraLike | null {
  if (currentLabel && !isSwitchingLens(currentLabel)) return null;
  return cameras.find((camera) => MAIN_BACK_CAMERA.test(camera.label.trim())) ?? null;
}

/** A note when the phone is held upright: the tracking views and calibration expect a landscape image. */
export function orientationNote(width: number, height: number): string | null {
  return width > 0 && height > width ? 'Turn the iPhone sideways (landscape): the camera image is portrait.' : null;
}
