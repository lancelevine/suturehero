import {PRACTICE_SETUP} from '../setup/PracticeSetup';
import {tissueTractPoints} from '../tissue/sutureTract';
import * as THREE from 'three';
import { StrandMesh } from './StrandMesh';
import type { FreeKnotPractice } from '../gameplay/FreeKnotPractice';
export class FreeKnotView {
  readonly root=new THREE.Group();
  private long=new StrandMesh(64);
  private short=new StrandMesh(40);
  private buried!:THREE.Mesh<THREE.TubeGeometry,THREE.MeshStandardMaterial>;
  private route='';
  private tip=new THREE.Mesh(new THREE.SphereGeometry(0.026,12,8),new THREE.MeshStandardMaterial({color:0xffcc55,roughness:0.5}));
  constructor(model:FreeKnotPractice) {
    const path=new THREE.CatmullRomCurve3(tissueTractPoints(model.entry,model.exit));
    this.buried=new THREE.Mesh(new THREE.TubeGeometry(path,32,0.009,6),new THREE.MeshStandardMaterial({color:PRACTICE_SETUP.suture.color,roughness:.75}));this.root.add(this.tip,this.long,this.short,this.buried);
  }
  update(model:FreeKnotPractice) {
    this.root.visible=model.active;if(!model.active)return;
    if(this.long.geometry.getAttribute('position').count!==model.long.count*6){
      this.root.remove(this.long);this.long.geometry.dispose();this.long.material.dispose();this.long=new StrandMesh(model.long.count);this.root.add(this.long);
    }
    if(this.short.geometry.getAttribute('position').count!==model.short.count*6){
      this.root.remove(this.short);this.short.geometry.dispose();this.short.material.dispose();this.short=new StrandMesh(model.short.count);this.root.add(this.short);
    }
    const route=[...model.entry.toArray(),...model.exit.toArray()].join(':');
    if(route!==this.route){this.route=route;this.buried.geometry.dispose();this.buried.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tissueTractPoints(model.entry,model.exit)),32,.009,6);}
    this.tip.position.copy(model.short.points.at(-1)!);
    this.tip.material.color.setHex(model.gripLabel('right')==='short tail'?0x65df9b:0xffcc55);
    this.root.updateWorldMatrix(true,false);this.long.update(model.long.points,this.root.matrixWorld);this.short.update(model.short.points,this.root.matrixWorld);
  }
}
