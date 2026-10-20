import { NEEDLE_ARC, NEEDLE_RADIUS } from './needleGeometry';
import * as THREE from 'three';
/** Kinematic needle with assisted thread routing, not a physics solver. */
export class SutureModel {
  readonly root = new THREE.Group();
  readonly points = Array.from({length:65},(_,i)=>{
    const a=i/64*NEEDLE_ARC;
    return new THREE.Vector3(Math.cos(a)*NEEDLE_RADIUS,0,Math.sin(a)*NEEDLE_RADIUS);
  });
  private thread: THREE.Mesh;
  private material = new THREE.MeshStandardMaterial({color:0xe0e9ed,metalness:0.95,roughness:0.2});
  constructor() {
    this.root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(this.points),64,0.018,8,false),this.material));
    const threadPoints=[this.points[0],new THREE.Vector3(0.65,0,0.2),new THREE.Vector3(0.8,0,0.65),new THREE.Vector3(1.25,0,0.5),new THREE.Vector3(1.6,0,0.8)];
    this.thread=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(threadPoints),50,0.009,6,false),new THREE.MeshStandardMaterial({color:0x294c89}));
    this.root.add(this.thread);
    const tipMarker=new THREE.Mesh(new THREE.SphereGeometry(0.035,12,8),new THREE.MeshBasicMaterial({color:0x70d5ee}));
    tipMarker.position.copy(this.points[this.points.length-1]); this.root.add(tipMarker);
    this.reset();
  }
  getTipPose() {
    this.root.updateWorldMatrix(true,false);
    const end=this.points.length-1;
    return {
      position:this.points[end].clone().applyMatrix4(this.root.matrixWorld),
      tangent:new THREE.Vector3(-Math.sin(NEEDLE_ARC),0,Math.cos(NEEDLE_ARC)).transformDirection(this.root.matrixWorld),
    };
  }
  updateThread(entry: THREE.Vector3, exit: THREE.Vector3, progress: number) {
    this.root.updateWorldMatrix(true,false);
    const inverse=this.root.matrixWorld.clone().invert();
    const tail=entry.clone().add(new THREE.Vector3(0.9*(1-progress)+0.15,0.02,0.5*(1-progress)));
    const points=[tail,entry.clone().add(new THREE.Vector3(0.1,0.025,0)),entry.clone(),new THREE.Vector3(0,0.15,0),exit.clone(),exit.clone().add(new THREE.Vector3(0,0.15,0)),this.points[0].clone().applyMatrix4(this.root.matrixWorld)].map(p=>p.applyMatrix4(inverse));
    const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,0.009,6,false);
    this.thread.geometry.dispose(); this.thread.geometry=geometry;
  }
  reset() { this.root.position.set(-0.3,0.65,0); this.root.quaternion.identity();
    if(this.thread) {
      const pts=[this.points[0],new THREE.Vector3(0.65,0,0.2),new THREE.Vector3(0.8,0,0.65),new THREE.Vector3(1.25,0,0.5),new THREE.Vector3(1.6,0,0.8)];
      this.thread.geometry.dispose(); this.thread.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),50,0.009,6,false);
    }
  }
  highlight(ready: boolean) { this.material.emissive.setHex(ready?0x278b65:0); }
}
