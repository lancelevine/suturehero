import { Quaternion, Vector3 } from 'three';
import { RestLock } from './RestLock';
import { StereoFallback, type MonoView } from './StereoFallback';
import { TrackedPoseFilter } from './TrackedPoseFilter';
import { getOrCreate } from '../util/getOrCreate';

/** Stereo practice position → the fallback controller's frame (mm, y and z flipped). */
const STEREO_FALLBACK_SCALE = new Vector3(200, -200, -200);

/**
 * Per-instrument state the tracking page's render loop keeps between frames (moved out of
 * src/tracking.ts, 2026-11-27): the stereo/single-camera fallback controller, the stereo rest lock
 * and the rendered-pose filter. `reset()` clears the filters and fallbacks as resetTrackerPose did;
 * rest locks are kept, as before.
 */
export class RenderedPoseState<Name> {
  private readonly fallbacks = new Map<Name, StereoFallback>();
  private readonly restLocks = new Map<Name, RestLock>();
  private readonly filters = new Map<Name, TrackedPoseFilter>();

  /** Fuse this frame's stereo pose (practice units, if any) with the single-camera views. */
  fuse(name: Name, now: number, stereo: { position: Vector3; quaternion: Quaternion; lastSeen: number } | undefined, views: MonoView[]) {
    const pose = stereo ? { position: stereo.position.clone().multiply(STEREO_FALLBACK_SCALE), quaternion: stereo.quaternion, at: stereo.lastSeen } : undefined;
    return getOrCreate(this.fallbacks, name, () => new StereoFallback()).update(pose, views, now);
  }

  /** Hold a still stereo instrument steady against small-marker pose wobble. */
  steady(name: Name, position: Vector3, quaternion: Quaternion) {
    return getOrCreate(this.restLocks, name, () => new RestLock()).update(position, quaternion);
  }

  /** This instrument's rendered-pose filter, updated with this frame's pose. */
  filter(name: Name, position: Vector3, quaternion: Quaternion, now: number) {
    const filter = getOrCreate(this.filters, name, () => new TrackedPoseFilter());
    filter.update(position, quaternion, now);
    return filter;
  }

  reset() {
    this.filters.clear();
    this.fallbacks.clear();
  }
}
