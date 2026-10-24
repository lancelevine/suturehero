import {planBites} from './BitePlan';
import {tractEntry,tractExit,TRACT_CENTER_Y,TRACT_START,TRACT_SWEEP} from './sutureTract';
import { DERMAL_MIDPOINT } from './anatomy';
import { NEEDLE_ARC, NEEDLE_RADIUS, NEEDLE_EXPOSURE } from '../suture/needleGeometry';
import * as THREE from 'three';
/** Assisted circular path only; no tissue forces, deformation, or thread solver. */
export class NeedlePass {
  readonly radius=NEEDLE_RADIUS;
  purchaseY=DERMAL_MIDPOINT;
  readonly entry=tractEntry();
  readonly exit=tractExit();
  readonly center=new THREE.Vector3(0,TRACT_CENTER_Y,0);
  phase: 'idle'|'passing'|'complete'|'interrupted'='idle';
  angle=0;
  startAngle=TRACT_START;
  private sweep=TRACT_SWEEP;
  customBites=false;
  get halfWidth(){return (this.entry.x-this.exit.x)/2;}
  get totalAngle(){return this.sweep+NEEDLE_EXPOSURE;}
  setBites(right:number,left:number){
    if(this.phase!=='idle')return null;
    const plan=planBites(right,left);if(!plan)return null;
    this.center.copy(plan.center);this.entry.set(plan.right,.43,0);this.exit.set(-plan.left,.43,0);
    this.startAngle=plan.start;this.sweep=plan.sweep;this.customBites=true;return plan;
  }
  resetBites(){this.entry.copy(tractEntry());this.exit.copy(tractExit());this.center.set(0,TRACT_CENTER_Y,0);this.startAngle=TRACT_START;this.sweep=TRACT_SWEEP;this.customBites=false;}
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
  update(drive: number, held: boolean, dt: number,limit=this.totalAngle) {
    if(this.phase!=='passing') return;
    if(!held) { this.phase='interrupted'; return; }
    this.angle=THREE.MathUtils.clamp(this.angle+THREE.MathUtils.clamp(drive,-1,1)*Math.max(0,Math.min(dt,0.05))*0.8,0,Math.min(this.totalAngle,limit));
    if(this.angle>=this.totalAngle) this.phase='complete';
  }
  get purchaseSites():[THREE.Vector3|null,THREE.Vector3|null]{
    const y=this.center.y-this.purchaseY;if(y<=0||y>=this.radius)return [null,null];
    const x=Math.sqrt(this.radius*this.radius-y*y);return [new THREE.Vector3(this.center.x+x,this.purchaseY,0),new THREE.Vector3(this.center.x-x,this.purchaseY,0)];
  }
  /** Material purchase on each side, separate from the visible surface portals. */
  get dermalBites():[THREE.Vector3|null,THREE.Vector3|null] {
    const depth=(this.center.y-this.purchaseY)/this.radius;
    if(depth<=0 || depth>=1)return [null,null];
    const entryAngle=Math.asin(depth),exitAngle=Math.PI-entryAngle;
    const at=(angle:number)=>new THREE.Vector3(this.center.x+this.radius*Math.cos(angle),this.purchaseY,this.center.z);
    return [this.angle>=entryAngle-this.startAngle?at(entryAngle):null,this.angle>=exitAngle-this.startAngle?at(exitAngle):null];
  }
  get firstSideAngle(){return Math.acos(THREE.MathUtils.clamp((.05-this.center.x)/this.radius,-1,1))-this.startAngle;}
  get progress() { return this.angle/this.totalAngle; }
  get pose() {
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,-1),this.angle+this.startAngle).multiply(this.startOrientation);
    return new THREE.Matrix4().compose(this.center,q,new THREE.Vector3(1,1,1));
  }
  reset() { this.phase='idle'; this.angle=0; }
}
