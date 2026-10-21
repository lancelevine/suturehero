import * as THREE from 'three';
import { StrandMesh } from './StrandMesh';
import type { FreeKnotPractice } from '../gameplay/FreeKnotPractice';
export class FreeKnotView {
  readonly root=new THREE.Group();
  private long=new StrandMesh(64);
  private short=new StrandMesh(40);
  private tip=new THREE.Mesh(new THREE.SphereGeometry(0.026,12,8),new THREE.MeshStandardMaterial({color:0xffcc55,roughness:0.5}));
  constructor(model:FreeKnotPractice) {
    const path=new THREE.CatmullRomCurve3([model.entry.clone(),new THREE.Vector3(0,0.15,0),model.exit.clone()]);
    this.root.add(this.tip,this.long,this.short,new THREE.Mesh(new THREE.TubeGeometry(path,32,0.009,6),new THREE.MeshStandardMaterial({color:0x315b9c,roughness:0.75})));
  }
  update(model:FreeKnotPractice) {
    this.root.visible=model.active;if(!model.active)return;
    this.tip.position.copy(model.short.points.at(-1)!);
    this.tip.material.color.setHex(model.gripLabel('right')==='short tail'?0x65df9b:0xffcc55);
    this.root.updateWorldMatrix(true,false);this.long.update(model.long.points,this.root.matrixWorld);this.short.update(model.short.points,this.root.matrixWorld);
  }
}
