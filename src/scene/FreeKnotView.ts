import * as THREE from 'three';
import { StrandMesh } from './StrandMesh';
import type { FreeKnotPractice } from '../gameplay/FreeKnotPractice';
export class FreeKnotView {
  readonly root=new THREE.Group();
  private long=new StrandMesh(64);
  private short=new StrandMesh(40);
  constructor(model:FreeKnotPractice) {
    const path=new THREE.CatmullRomCurve3([model.entry.clone(),new THREE.Vector3(0,0.15,0),model.exit.clone()]);
    this.root.add(this.long,this.short,new THREE.Mesh(new THREE.TubeGeometry(path,32,0.009,6),new THREE.MeshStandardMaterial({color:0x315b9c,roughness:0.75})));
  }
  update(model:FreeKnotPractice) {
    this.root.visible=model.active;if(!model.active)return;
    this.root.updateWorldMatrix(true,false);this.long.update(model.long.points,this.root.matrixWorld);this.short.update(model.short.points,this.root.matrixWorld);
  }
}
