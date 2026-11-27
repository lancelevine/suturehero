import * as THREE from 'three';

/**
 * Diagnostic only (moved out of src/tracking.ts, 2026-11-27): each instrument's raw solver,
 * accepted target and rendered mesh orientation, each relative to its own first sample, as
 * XYZ Euler degrees. No tracking behaviour depends on it.
 */
export class RotationStageReadout<Name extends string = string> {
  /** Latest raw solver orientation per instrument. */
  readonly raw = new Map<Name, THREE.Quaternion>();
  /** Latest solver status per instrument (e.g. "accepted"). */
  readonly status = new Map<Name, string>();
  private readonly baselines = new Map<string, THREE.Quaternion>();

  /** Orientation relative to the first one seen for this instrument and stage, as "x / y / z" degrees. */
  stageAngles(name: Name, stage: string, q: THREE.Quaternion): string {
    const key = name + ':' + stage;
    let base = this.baselines.get(key);
    if (!base) {
      base = q.clone();
      this.baselines.set(key, base);
    }
    const relative = base.clone().invert().multiply(q);
    const e = new THREE.Euler().setFromQuaternion(relative, 'XYZ');
    return [e.x, e.y, e.z].map((v) => THREE.MathUtils.radToDeg(v).toFixed(0).padStart(4)).join(' / ');
  }

  /** The readout text for these instruments (skipping any with neither a raw nor an accepted pose). */
  text(meshes: ReadonlyArray<readonly [Name, THREE.Object3D]>, accepted: (name: Name) => THREE.Quaternion | undefined): string {
    const lines = ['Relative XYZ Euler (pitch/yaw axes depend on model frame)'];
    for (const [name, mesh] of meshes) {
      const raw = this.raw.get(name);
      const target = accepted(name);
      if (!raw && !target) continue;
      lines.push(name + ' · ' + (this.status.get(name) ?? 'waiting'));
      lines.push(' raw      ' + (raw ? this.stageAngles(name, 'raw', raw) : '—'));
      lines.push(' accepted ' + (target ? this.stageAngles(name, 'accepted', target) : '—'));
      lines.push(' rendered ' + this.stageAngles(name, 'rendered', mesh.quaternion));
    }
    return lines.join('\n');
  }
}
