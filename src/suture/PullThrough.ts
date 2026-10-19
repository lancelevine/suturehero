import * as THREE from 'three';
/** Assisted upward extraction and thread take-up; no collision or tension solver. */
export class PullThrough {
  phase: 'waiting'|'pulling'|'complete'='waiting';
  distance=0;
  readonly needleClearance=0.45;
  readonly totalDistance=1.4;
  private start=new THREE.Matrix4();
  begin(needleWorld: THREE.Matrix4) { if(this.phase==='waiting') { this.start.copy(needleWorld); this.phase='pulling'; } }
  update(lift: number, heldByForceps: boolean, dt: number) {
    if(this.phase!=='pulling' || !heldByForceps) return;
    this.distance=THREE.MathUtils.clamp(this.distance+THREE.MathUtils.clamp(lift,-1,1)*Math.max(0,Math.min(dt,0.05))*0.7,0,this.totalDistance);
    if(this.distance>=this.totalDistance) this.phase='complete';
  }
  get progress() { return this.distance/this.totalDistance; }
  get threadProgress() { return THREE.MathUtils.clamp((this.distance-this.needleClearance)/(this.totalDistance-this.needleClearance),0,1); }
  get pose() { return new THREE.Matrix4().makeTranslation(0,this.distance,0).multiply(this.start); }
  reset() { this.phase='waiting'; this.distance=0; }
}
