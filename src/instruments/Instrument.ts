import { ForcepsArms } from './ForcepsArms';
import * as THREE from 'three';
import type { ToolCommand, ToolId } from '../input/types';
export class Instrument {
  readonly root = new THREE.Group();
  readonly tip = new THREE.Object3D();
  private forcepsArms?: ForcepsArms;
  private jaws: THREE.Group[] = [];
  openness = 0.65;
  readonly kind: 'forceps' | 'needle-driver';
  constructor(readonly id: ToolId, color: number) {
    this.kind = id === 'left' ? 'forceps' : 'needle-driver';
    const steel = new THREE.MeshStandardMaterial({color:0xb6c6ce,metalness:0.85,roughness:0.27});
    const accent = new THREE.MeshStandardMaterial({color,metalness:0.4,roughness:0.4});
    // Local +Z runs from the working tip toward the handle; the root is the tip pivot.
    if(this.kind==='needle-driver') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.075,2.8,16),steel);
      shaft.rotation.x=Math.PI/2; shaft.position.z=1.65; this.root.add(shaft);
      for(const side of [-1,1]) {
        const ring=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.045,10,32),steel);
        ring.position.set(side*0.27,0,3.28); this.root.add(ring);
      }
    } else {
      this.forcepsArms=new ForcepsArms(steel);
      this.root.add(this.forcepsArms.root);
    }
    const collar=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.12,0.18),accent);
    collar.position.z=2.75; this.root.add(collar);
    if(this.kind==='needle-driver') for(const side of [-1,1]) {
      const jaw=new THREE.Group(); jaw.position.set(side*0.035,0,0.35);
      const blade=new THREE.Mesh(new THREE.BoxGeometry(0.065,0.065,0.42),steel);
      blade.position.z=-0.21; jaw.add(blade); this.root.add(jaw); this.jaws.push(jaw);
    }
    this.root.add(this.tip); this.reset();
  }
  reset() {
    this.root.position.set(this.id==='left'?-0.85:0.85,0.7,0.1);
    this.root.rotation.set(-0.45,this.id==='left'?-0.55:0.55,0);
    this.openness=0.65; this.updateJaws();
  }
  update(command: ToolCommand, dt: number) {
    const delta = new THREE.Vector3(...command.translation);
    if(delta.lengthSq()>1) delta.normalize();
    this.root.position.addScaledVector(delta,dt*1.5);
    this.root.position.clamp(new THREE.Vector3(-4,0.15,-3),new THREE.Vector3(4,4,4));
    this.root.rotateX(command.rotation[0]*dt); this.root.rotateY(command.rotation[1]*dt); this.root.rotateZ(command.rotation[2]*dt);
    this.openness=THREE.MathUtils.clamp(this.openness+command.jaw*dt,0,1); this.updateJaws();
  }
  private updateJaws() { this.forcepsArms?.update(this.openness); this.jaws.forEach((jaw,i)=>{jaw.rotation.y=(i===0?1:-1)*this.openness*0.35;}); }
}
