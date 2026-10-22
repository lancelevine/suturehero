import {tissueTractPoints} from '../tissue/sutureTract';
import * as THREE from 'three';
import type { NeedlePass } from '../tissue/NeedlePass';
export class PassGuide {
  readonly root=new THREE.Group();
  private material=new THREE.MeshBasicMaterial({color:0x88c8ee,depthTest:false,transparent:true,opacity:0.65});
  constructor(pass: NeedlePass) {
    const exit=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.01,8,32),this.material);
    exit.rotation.x=Math.PI/2; exit.position.copy(pass.exit); this.root.add(exit);
    const points=tissueTractPoints(pass.entry,pass.exit,65);
    const path=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0x88c8ee,depthTest:false,dashSize:0.035,gapSize:0.025,transparent:true,opacity:0.65}));
    path.computeLineDistances(); path.renderOrder=3; this.root.add(path); exit.renderOrder=3;
  }
  update(pass: NeedlePass) { this.root.visible=pass.phase!=='idle'; this.material.color.setHex(pass.phase==='complete'?0x67d6a2:0x88c8ee); }
}
