import * as THREE from 'three';
import { NEEDLE_ARC, NEEDLE_EXPOSURE } from './needleGeometry';
/** Continues the same circular needle path after forceps takeover. */
export class PullThrough {
  phase: 'waiting'|'pulling'|'complete'='waiting';
  angle=0;
  readonly totalAngle=NEEDLE_ARC-NEEDLE_EXPOSURE+0.06; // Small clearance beyond eye emergence.
  private start=new THREE.Matrix4();
  private center=new THREE.Vector3();
  begin(needleWorld: THREE.Matrix4) {
    if(this.phase!=='waiting') return;
    this.start.copy(needleWorld); this.center.setFromMatrixPosition(needleWorld); this.phase='pulling';
  }
  update(drive: number, heldByForceps: boolean, dt: number) {
    if(this.phase!=='pulling' || !heldByForceps) return;
    this.angle=THREE.MathUtils.clamp(this.angle+THREE.MathUtils.clamp(drive,-1,1)*Math.max(0,Math.min(dt,0.05))*0.8,0,this.totalAngle);
    if(this.angle>=this.totalAngle) this.phase='complete';
  }
  get progress() { return this.angle/this.totalAngle; }
  get threadProgress() { return Math.min(1,(this.angle+NEEDLE_EXPOSURE)/NEEDLE_ARC); }
  get pose() {
    return new THREE.Matrix4().makeTranslation(this.center.x,this.center.y,this.center.z)
      .multiply(new THREE.Matrix4().makeRotationZ(-this.angle))
      .multiply(new THREE.Matrix4().makeTranslation(-this.center.x,-this.center.y,-this.center.z))
      .multiply(this.start);
  }
  reset() { this.phase='waiting'; this.angle=0; }
}
