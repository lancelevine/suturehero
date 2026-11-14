import { Vector3 } from 'three';
import { TISSUE_LAYERS } from '../tissue/anatomy';
import { practiceUnitsPerMm, workspaceCoordinates, type StereoWorkspace } from './stereoWorkspace';

/**
 * Table height as the tissue surface (2026-11-14). With calibrated stereo
 * tips, the user touches the table at TABLE_POINTS spots; the shared stereo
 * space is then shifted vertically so the table sits at the virtual skin
 * surface. Instruments resting on the table rest on the skin, and nothing is
 * pinned at the scene floor.
 *
 * The points are saved in camera-1 mm for one stereo calibration (the camera
 * frame changes with a new calibration); the shift is recomputed from them
 * with the current workspace axes.
 */

export const TABLE_HEIGHT_STORAGE_KEY = 'suturehero.tableHeight.v1';
/** Touches needed to set the table height. */
export const TABLE_POINTS = 3;
/** Points further apart than this in height (mm) suggest a missed touch or a tilted workspace "up". */
export const MAX_TABLE_SPREAD_MM = 20;
/** The virtual skin surface (top of the epidermis), scene units. */
export const SKIN_SURFACE_Y = TISSUE_LAYERS.epidermis.top;

/** Height of a camera-1 mm point along the workspace's up (or camera "up" without a workspace), mm. */
export function upMm(point: Vector3, workspace: StereoWorkspace | null): number {
  return workspace ? workspaceCoordinates(workspace, point).y : -point.y;
}

/**
 * Vertical shift (scene units) that puts the mean table height at the skin
 * surface, or 0 without enough points.
 */
export function tableOffsetUnits(points: readonly Vector3[], workspace: StereoWorkspace | null): number {
  if (points.length < TABLE_POINTS) return 0;
  const mean = points.reduce((sum, p) => sum + upMm(p, workspace), 0) / points.length;
  return SKIN_SURFACE_Y - mean * practiceUnitsPerMm(workspace);
}

/** Spread of the touched heights (mm). */
export function tableSpreadMm(points: readonly Vector3[], workspace: StereoWorkspace | null): number {
  const heights = points.map((p) => upMm(p, workspace));
  return heights.length ? Math.max(...heights) - Math.min(...heights) : 0;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/** Saved table points for the current stereo calibration, plus touches being recorded. */
export class TableHeight {
  private calibrationKey: string | null = null;
  private pending: Vector3[] = [];
  /** Parsed saved points, cleared whenever they may change (read every frame by tracking). */
  private cached: Vector3[] | null = null;

  constructor(private readonly storage: StorageLike | null) {}

  /** Set by tracking whenever the stereo calibration changes (null: none loaded). */
  setCalibrationKey(key: string | null) {
    if (key !== this.calibrationKey) {
      this.pending = [];
      this.cached = null;
    }
    this.calibrationKey = key;
  }

  /** Saved points for the current calibration (empty if none). */
  points(): Vector3[] {
    this.cached ??= this.readPoints();
    return this.cached;
  }

  private readPoints(): Vector3[] {
    if (!this.calibrationKey) return [];
    try {
      const saved = JSON.parse(this.storage?.getItem(TABLE_HEIGHT_STORAGE_KEY) ?? 'null');
      if (!saved || saved.calibrationKey !== this.calibrationKey || !Array.isArray(saved.points)) return [];
      return saved.points.filter((p: unknown) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite)).map((p: number[]) => new Vector3(...p));
    } catch {
      return [];
    }
  }

  /** Records one touch (camera-1 mm); saves after TABLE_POINTS. Returns how many are recorded so far. */
  addTouch(tipMm: Vector3): number {
    this.pending.push(tipMm.clone());
    if (this.pending.length < TABLE_POINTS) return this.pending.length;
    const points = this.pending;
    this.pending = [];
    this.cached = points.map((p) => p.clone());
    try {
      this.storage?.setItem(TABLE_HEIGHT_STORAGE_KEY, JSON.stringify({ calibrationKey: this.calibrationKey, points: points.map((p) => p.toArray()) }));
    } catch {
      // Blocked storage: the table height lasts until reload (cached above).
    }
    return TABLE_POINTS;
  }

  /** Touches recorded towards the next save. */
  pendingTouches(): number {
    return this.pending.length;
  }

  clear() {
    this.pending = [];
    this.cached = [];
    try {
      this.storage?.removeItem?.(TABLE_HEIGHT_STORAGE_KEY);
    } catch {
      // Blocked storage.
    }
  }
}

const browserStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const tableHeight = new TableHeight(browserStorage());
