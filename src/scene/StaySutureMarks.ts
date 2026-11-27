import * as THREE from 'three';
import type { MicroTargetProfile } from '../environments/MicroTargets';
import { disposeChildren } from './disposeChildren';

/**
 * Stay suture planning (roadmap, 2026-11-27): stays placed 180° apart (two) or 120° apart (three)
 * around the vessel before the anastomosis. Marks where they go on both cut ends; the first stay
 * is at the top of the vessel (12 o'clock). Scoring the remaining bites needs a full anastomosis.
 */
export type StayPlan = 'none' | '180' | '120';

/** Angles of the stays around the vessel (radians, 0 = top, clockwise seen from +x). */
export function stayAngles(plan: StayPlan): number[] {
  if (plan === '180') return [0, Math.PI];
  if (plan === '120') return [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  return [];
}

const MARK_COLOR = 0x3fd8ff;
const MARK_RADIUS = 0.035;

export class StaySutureMarks {
  readonly root = new THREE.Group();
  private key = '';
  private readonly geometry = new THREE.SphereGeometry(MARK_RADIUS, 12, 8);
  private readonly material = new THREE.MeshBasicMaterial({ color: MARK_COLOR, toneMapped: false });

  constructor() {
    this.root.name = 'stay-sutures';
  }

  update(profile: MicroTargetProfile, plan: StayPlan, visible: boolean) {
    this.root.visible = visible;
    const key = `${profile.id}:${profile.gap}:${plan}`;
    if (key === this.key) return;
    this.key = key;
    disposeChildren(this.root, new Set([this.material]), new Set([this.geometry]));
    // Mid-wall radius on each cut face, just outside the face.
    const radius = (profile.outerRadius + profile.innerRadius) / 2;
    for (const side of [-1, 1]) {
      for (const angle of stayAngles(plan)) {
        const mark = new THREE.Mesh(this.geometry, this.material);
        mark.position.set(side * (profile.gap / 2 - 0.01), profile.centerY + radius * Math.cos(angle), radius * Math.sin(angle));
        mark.name = 'stay-mark';
        this.root.add(mark);
      }
    }
  }
}
