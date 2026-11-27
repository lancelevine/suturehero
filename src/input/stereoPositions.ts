import { Quaternion, Vector3 } from 'three';
import { StereoPoseFilter } from './StereoPoseFilter';

/** An instrument's filtered stereo pose in practice units, and the frame pair it came from. */
export interface StereoPosition {
  position: Vector3;
  quaternion: Quaternion;
  lastSeen: number;
  lastSample: number;
}

/**
 * Each instrument's latest two-camera pose, smoothed by its own StereoPoseFilter, at most once
 * per frame pair (moved out of src/tracking.ts, 2026-11-27).
 */
export class StereoPositions<Name> {
  private readonly positions = new Map<Name, StereoPosition>();
  private readonly filters = new Map<Name, StereoPoseFilter>();

  get(name: Name) {
    return this.positions.get(name);
  }

  /** Forget the poses (the filters keep their history). */
  clear() {
    this.positions.clear();
  }

  /** Forget the poses and the filters' history. */
  reset() {
    this.positions.clear();
    this.filters.clear();
  }

  /** Feed a measured pose (practice units) from the frame pair at `sampleAt`; a repeat of the same pair is ignored. */
  accept(name: Name, measured: Vector3, quaternion: Quaternion, sampleAt: number) {
    const previous = this.positions.get(name);
    if (previous?.lastSample === sampleAt) return;
    let filter = this.filters.get(name);
    if (!filter) {
      filter = new StereoPoseFilter();
      this.filters.set(name, filter);
    }
    filter.update(measured, quaternion, sampleAt);
    if (previous) {
      previous.position.copy(filter.position);
      previous.quaternion.copy(filter.quaternion);
      previous.lastSeen = sampleAt;
      previous.lastSample = sampleAt;
    } else {
      this.positions.set(name, { position: filter.position.clone(), quaternion: filter.quaternion.clone(), lastSeen: sampleAt, lastSample: sampleAt });
    }
  }
}
