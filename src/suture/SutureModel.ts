import {PRACTICE_SETUP} from '../setup/PracticeSetup';
import { ThreadStrand } from './ThreadStrand';
import { TissueThreadGuide,threadSurfaceAt } from './TissueThreadGuide';
import { StrandMesh } from '../scene/StrandMesh';
import { NEEDLE_ARC, NEEDLE_RADIUS } from './needleGeometry';
import * as THREE from 'three';
/** Kinematic needle and an independent, length-constrained thread strand. */
export class SutureModel {
  readonly root = new THREE.Group();
  readonly points = Array.from({length:65},(_,i)=>{
    const a=i/64*NEEDLE_ARC;
    return new THREE.Vector3(Math.cos(a)*NEEDLE_RADIUS,0,Math.sin(a)*NEEDLE_RADIUS);
  });
  readonly strand=new ThreadStrand();
  readonly threadGuide=new TissueThreadGuide();
  private thread: StrandMesh;
  private material = new THREE.MeshStandardMaterial({color:0xe0e9ed,metalness:0.95,roughness:0.2});
  constructor() {
    this.root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(this.points),64,0.018*Math.sqrt(NEEDLE_RADIUS/.3),PRACTICE_SETUP.needle.tip==='cutting'?3:8,false),this.material));
    this.thread=new StrandMesh(this.strand.count);
    this.root.add(this.thread);
    const tipMarker=new THREE.Mesh(new THREE.SphereGeometry(0.035,12,8),new THREE.MeshBasicMaterial({color:0x70d5ee}));
    tipMarker.position.copy(this.points[this.points.length-1]); this.root.add(tipMarker);
    this.root.traverse(object=>{if(object instanceof THREE.Mesh) object.castShadow=true;});
    this.reset();
  }
  setThreadVisible(visible: boolean) {this.thread.visible=visible;}
  getPointAt(fraction: number) {
    const a=THREE.MathUtils.clamp(fraction,0,1)*NEEDLE_ARC;
    return new THREE.Vector3(Math.cos(a)*NEEDLE_RADIUS,0,Math.sin(a)*NEEDLE_RADIUS);
  }
  getTipPose() {
    this.root.updateWorldMatrix(true,false);
    const end=this.points.length-1;
    return {
      position:this.points[end].clone().applyMatrix4(this.root.matrixWorld),
      tangent:new THREE.Vector3(-Math.sin(NEEDLE_ARC),0,Math.cos(NEEDLE_ARC)).transformDirection(this.root.matrixWorld),
    };
  }
  advanceThread(dt:number,tipAngle:number|null,center:THREE.Vector3,surfaceAt=threadSurfaceAt) {
    this.root.updateWorldMatrix(true,false);
    const eye=this.points[0].clone().applyMatrix4(this.root.matrixWorld);
    this.strand.advance(dt,this.threadGuide.anchors(this.strand,eye,tipAngle,center),surfaceAt);
    this.thread.update(this.strand.points,this.root.matrixWorld);
  }
  reset() { this.root.position.set(-0.3,Math.max(.74,.44+NEEDLE_RADIUS),0);
    this.root.quaternion.setFromAxisAngle(new THREE.Vector3(-Math.cos(NEEDLE_ARC),0,-Math.sin(NEEDLE_ARC)),Math.PI/2);
    if(this.thread) {
      this.thread.visible=true;this.root.updateWorldMatrix(true,false);
      const eye=this.points[0].clone().applyMatrix4(this.root.matrixWorld);
      this.strand.reset([eye,eye.clone().add(new THREE.Vector3(0.6,-0.1,0.2)),new THREE.Vector3(1.2,0.44,0.65),new THREE.Vector3(1.8,0.44,0.2),new THREE.Vector3(2.3,0.44,1),new THREE.Vector3(2.4,0.44,1.4),new THREE.Vector3(1.8,0.44,1.1)]);
      this.threadGuide.reset();this.thread.update(this.strand.points,this.root.matrixWorld);
    }
  }

  highlight(ready: boolean) { this.material.emissive.setHex(ready?0x278b65:0); }
}
