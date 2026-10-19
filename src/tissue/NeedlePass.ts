import * as THREE from 'three';
/** Assisted circular path only; no tissue forces, deformation, or thread solver. */
export class NeedlePass {
  readonly radius=0.3;
  readonly entry=new THREE.Vector3(0.3,0.43,0);
  readonly exit=new THREE.Vector3(-0.3,0.43,0);
  readonly center=new THREE.Vector3(0,0.43,0);
  phase: 'idle'|'passing'|'complete'|'interrupted'='idle';
  angle=0;
  private startOrientation: THREE.Quaternion;
  constructor() {
    const a=Math.PI*1.25;
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
    this.angle=THREE.MathUtils.clamp(this.angle+THREE.MathUtils.clamp(drive,-1,1)*Math.max(0,Math.min(dt,0.05))*0.8,0,Math.PI);
    if(this.angle>=Math.PI) this.phase='complete';
  }
  get progress() { return this.angle/Math.PI; }
  get pose() {
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,-1),this.angle).multiply(this.startOrientation);
    return new THREE.Matrix4().compose(this.center,q,new THREE.Vector3(1,1,1));
  }
  reset() { this.phase='idle'; this.angle=0; }
}
