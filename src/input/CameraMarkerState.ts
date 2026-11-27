import type { MarkerObservation } from './arucoTracking';
import { mergeNewMarkers } from './flowScale';

/** A marker stays live this long after flow or a decode last confirmed it (ms). */
export const MARKER_LIVE_MS = 140;
/** The camera status line's decode / flow rates are refreshed this often (ms). */
const STATS_INTERVAL_MS = 1000;

/**
 * One camera's tracked markers (camera 2; moved out of src/tracking.ts, 2026-11-27): the latest
 * flow/decode results, when each marker was last confirmed and decoded, and the frame counts for
 * the status line. Times are performance.now() in ms.
 */
export class CameraMarkerState {
  observations: MarkerObservation[] = [];
  /** When the observations were last updated (0 = never). */
  at = 0;
  /** When flow last found markers. */
  latestFlowAt = 0;
  private readonly confirmed = new Map<number, number>();
  private readonly decoded = new Map<number, number>();
  private decodedFrames = 0;
  private flowFrames = 0;
  private statsAt: number;

  constructor(now: number) {
    this.statsAt = now;
  }

  /** Markers confirmed within MARKER_LIVE_MS. */
  live(now: number) {
    return this.observations.filter((marker) => now - (this.confirmed.get(marker.id) ?? -Infinity) <= MARKER_LIVE_MS);
  }

  /** Time since this marker ID was last decoded (Infinity if never). */
  decodedAge(id: number, now: number) {
    return now - (this.decoded.get(id) ?? -Infinity);
  }

  /** A flow result: found markers replace the observations; none clears them. */
  applyFlow(found: MarkerObservation[], now: number) {
    this.flowFrames++;
    this.at = now;
    if (!found.length) {
      this.observations = [];
      this.confirmed.clear();
      return;
    }
    for (const marker of found) this.confirmed.set(marker.id, now);
    this.observations = found;
    this.latestFlowAt = now;
  }

  /** Count a finished decode request (also when it found nothing). */
  countDecode() {
    this.decodedFrames++;
  }

  /** Decoded markers: newly seen ones are added to the live set. */
  applyDecode(found: MarkerObservation[], now: number) {
    if (!found.length) return;
    for (const marker of found) this.decoded.set(marker.id, now);
    const { merged, added } = mergeNewMarkers(this.live(now), found);
    for (const marker of added) this.confirmed.set(marker.id, now);
    this.observations = merged;
    this.at = now;
  }

  /** Decode/flow counts and the seconds they cover, once per STATS_INTERVAL_MS (then restarted); else null. */
  takeRates(now: number) {
    if (now - this.statsAt < STATS_INTERVAL_MS) return null;
    const rates = { decodes: this.decodedFrames, flows: this.flowFrames, seconds: (now - this.statsAt) / 1000 };
    this.statsAt = now;
    this.decodedFrames = 0;
    this.flowFrames = 0;
    return rates;
  }

  /** Camera stopped. */
  reset(now: number) {
    this.observations = [];
    this.at = 0;
    this.latestFlowAt = 0;
    this.confirmed.clear();
    this.decoded.clear();
    this.decodedFrames = 0;
    this.flowFrames = 0;
    this.statsAt = now;
  }
}
