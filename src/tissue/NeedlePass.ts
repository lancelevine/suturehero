import {tractEntry,tractExit,TRACT_CENTER_Y,TRACT_START,TRACT_SWEEP} from './sutureTract';
import { DERMAL_MIDPOINT } from './anatomy';
import { NEEDLE_ARC, NEEDLE_RADIUS, NEEDLE_EXPOSURE } from '../suture/needleGeometry';
import * as THREE from 'three';
/** Assisted circular path only; no tissue forces, deformation, or thread solver. */
export class NeedlePass {
  readonly radius=NEEDLE_RADIUS;
  readonly entry=tractEntry();
  readonly exit=tractExit();
  readonly center=new THREE.Vector3(0,TRACT_CENTER_Y,0);
  phase: 'idle'|'passing'|'complete'|'interrupted'='idle';
  angle=0;
  readonly totalAngle=TRACT_SWEEP+NEEDLE_EXPOSURE;
  private startOrientation: THREE.Quaternion;
  constructor() {
    const a=NEEDLE_ARC;
    const radial=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
    const tangent=new THREE.Vector3(-Math.sin(a),0,Math.cos(a));
    const source=new THREE.Matrix4().makeBasis(radial,tangent,new THREE.Vector3().crossVectors(radial,tangent));
    const target=new THREE.Matrix4().makeBasis(new THREE.Vector3(1,0,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,-1));
    this.startOrientation=new THREE.Quaternion().setFromRotationMatrix(target.multiply(source.invert()));
  }
  begin() { if(this.phase==='idle' || this.phase==='interrupted') { this.angle=0; this.phase='passing'; } }
  update(drive: number, held: boolean, dt: number) {
    if(this.phase!=='passing') return;
    if(!held) { this.phase='interrupted'; return; }
    this.angle=THREE.MathUtils.clamp(this.angle+THREE.MathUtils.clamp(drive,-1,1)*Math.max(0,Math.min(dt,0.05))*0.8,0,this.totalAngle);
    if(this.angle>=this.totalAngle) this.phase='complete';
  }
  /** Material purchase on each side, separate from the visible surface portals. */
  get dermalBites():[THREE.Vector3|null,THREE.Vector3|null] {
    const depth=(this.center.y-DERMAL_MIDPOINT)/this.radius;
    if(depth<=0 || depth>=1)return [null,null];
    const entryAngle=Math.asin(depth),exitAngle=Math.PI-entryAngle;
    const at=(angle:number)=>new THREE.Vector3(this.center.x+this.radius*Math.cos(angle),DERMAL_MIDPOINT,this.center.z);
    return [this.angle>=entryAngle-TRACT_START?at(entryAngle):null,this.angle>=exitAngle-TRACT_START?at(exitAngle):null];
  }
  get progress() { return this.angle/this.totalAngle; }
  get pose() {
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,-1),this.angle+TRACT_START).multiply(this.startOrientation);
    return new THREE.Matrix4().compose(this.center,q,new THREE.Vector3(1,1,1));
  }
  reset() { this.phase='idle'; this.angle=0; }
}
