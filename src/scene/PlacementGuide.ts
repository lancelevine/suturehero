import * as THREE from 'three';
import type { NeedlePlacement } from '../gameplay/NeedlePlacement';
export class PlacementGuide {
  readonly root = new THREE.Group();
  private material=new THREE.MeshBasicMaterial({color:0xf3bb69,transparent:true,opacity:0.8});
  private ring=new THREE.Mesh(new THREE.TorusGeometry(0.12,0.008,8,48),this.material);
  private projection=new THREE.Mesh(new THREE.RingGeometry(0.035,0.05,24),new THREE.MeshBasicMaterial({color:0x70d5ee,side:THREE.DoubleSide}));
  private line: THREE.Line;
  private arrow:THREE.ArrowHelper;
  constructor(target: THREE.Vector3) {
    this.ring.rotation.x=Math.PI/2; this.ring.position.copy(target);
    const arrow=this.arrow=new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),target.clone().add(new THREE.Vector3(0,0.65,0)),0.5,0xf3bb69,0.09,0.06);
    this.projection.rotation.x=-Math.PI/2;
    this.line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([target,target]),new THREE.LineDashedMaterial({color:0x70d5ee,dashSize:0.04,gapSize:0.03,transparent:true,opacity:0.7}));
    this.root.add(this.ring,arrow,this.projection,this.line);
  }
  update(tip: THREE.Vector3, exercise: NeedlePlacement) {
    this.ring.position.copy(exercise.target);this.arrow.position.copy(exercise.target).y+=.65;
    this.material.color.setHex(exercise.complete?0x67d6a2:exercise.progress>0?0x9be6b9:0xf3bb69);
    this.projection.position.set(tip.x,0.425,tip.z);
    const positions=this.line.geometry.getAttribute('position');
    positions.setXYZ(0,tip.x,tip.y,tip.z); positions.setXYZ(1,tip.x,0.425,tip.z); positions.needsUpdate=true;
    this.line.geometry.computeBoundingSphere(); this.line.computeLineDistances();
  }
}
