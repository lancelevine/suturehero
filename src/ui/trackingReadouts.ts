import * as THREE from 'three';

/** Tracking-page readouts and overlay drawing helpers (moved out of src/tracking.ts, 2026-11-27). */

/** After this long without a fresh pose (ms) the readout says "Last seen". */
export const LAST_SEEN_AFTER_MS = 130;

export interface ReadoutTarget {
  lastSeen: number;
  pose: { id: number; position: THREE.Vector3; quaternion: THREE.Quaternion; reprojectionError: number };
}

/** One instrument's pose line: ID, position (mm), roll/pitch/yaw and reprojection error. */
export function poseReadoutText(target: ReadoutTarget | undefined, now: number, holdMs: number): string {
  if (!target) return 'Not visible';
  const age = now - target.lastSeen;
  if (age > holdMs) return 'Not visible';
  const pose = target.pose;
  const position = pose.position;
  const euler = new THREE.Euler().setFromQuaternion(pose.quaternion, 'XYZ');
  const degrees = (radians: number) => ((radians * 180) / Math.PI).toFixed(0);
  return `${age > LAST_SEEN_AFTER_MS ? 'Last seen · ' : ''}ID ${pose.id} · X ${position.x.toFixed(1)}, Y ${position.y.toFixed(1)}, Z ${position.z.toFixed(1)} mm · RPY ${degrees(euler.x)}°/${degrees(euler.y)}°/${degrees(euler.z)}° · error ${pose.reprojectionError.toFixed(1)} px (uncalibrated)`;
}

/** Start a closed path through a marker's four corners (the caller strokes or fills it). */
export function traceQuad(context: Pick<CanvasRenderingContext2D, 'beginPath' | 'moveTo' | 'lineTo' | 'closePath'>, corners: readonly { x: number; y: number }[]) {
  context.beginPath();
  context.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i++) context.lineTo(corners[i].x, corners[i].y);
  context.closePath();
}
