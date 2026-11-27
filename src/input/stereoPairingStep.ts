/** Shown when every instrument is waiting for a consistent stereo pose. */
export const STEREO_WAITING_TEXT = 'Waiting for a consistent rigid stereo pose. Each camera may see different tracker faces; both views must fit the calibrated geometry.';

/** What one stereo step needs from the tracking page. */
export interface StereoPairingDeps<Name, Rigid, Pair extends { at: number } = { at: number }> {
  /** The time-matched camera pair for this frame, or null. */
  pair(now: number): Pair | null;
  lastFailure(): string | null;
  /** This instrument's two-camera rigid pose, or null. */
  rigid(name: Name, now: number): Rigid | null;
  /** Status note and fit error for the camera-moved monitor (src/input/stereoIndicator.ts stereoInstrumentReport). */
  report(name: Name, rigid: Rigid | null, synchronized: Pair | null): { note: string | null; fitErrorPx: number | null };
  feedFitError(now: number, px: number): void;
  /** The pair time this instrument's stereo position last used, if any. */
  lastSample(name: Name): number | undefined;
  accept(name: Name, rigid: Rigid, at: number): void;
}

/**
 * One render-loop stereo step (moved out of src/tracking.ts, 2026-11-27): pair the cameras' latest
 * frames, solve each instrument, accept each new pose once per pair, and build the triangulation
 * status line. Returns that line and the pairing failure (null when paired).
 */
export function stereoPairingStep<Name, Rigid, Pair extends { at: number }>(now: number, names: readonly Name[], deps: StereoPairingDeps<Name, Rigid, Pair>) {
  const synchronized = deps.pair(now);
  const notes: string[] = [];
  const pairingFailure = synchronized ? null : deps.lastFailure() ?? 'unknown';
  if (!synchronized) notes.push('No time-matched camera pair: ' + pairingFailure);
  for (const name of names) {
    const rigid = deps.rigid(name, now);
    const report = deps.report(name, rigid, synchronized);
    if (report.note) notes.push(report.note);
    if (report.fitErrorPx !== null) deps.feedFitError(now, report.fitErrorPx);
    if (!rigid || !synchronized) continue;
    if (deps.lastSample(name) !== synchronized.at) deps.accept(name, rigid, synchronized.at);
  }
  return { status: notes.length ? notes.join(' | ') : STEREO_WAITING_TEXT, pairingFailure };
}
