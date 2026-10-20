import * as THREE from 'three';
import type { NeedleGrasp } from '../suture/NeedleGrasp';
export class GraspGuide {
  readonly root=new THREE.Group();
  private held=new THREE.Mesh(new THREE.SphereGeometry(0.025,12,8),new THREE.MeshBasicMaterial({color:0xffcd70,depthTest:false}));
  private preview=new THREE.Mesh(new THREE.SphereGeometry(0.03,12,8),new THREE.MeshBasicMaterial({color:0x6ff0c5,depthTest:false}));
  private selected=new THREE.Mesh(new THREE.TorusGeometry(0.045,0.006,8,24),new THREE.MeshBasicMaterial({color:0xe6b1f6,depthTest:false}));
  constructor() { this.root.add(this.held,this.preview,this.selected); this.root.children.forEach(child=>child.renderOrder=5); }
  update(grasp: NeedleGrasp, selectedPoint: THREE.Vector3, showSelected: boolean) {
    grasp.needle.root.updateWorldMatrix(true,false);
    const place=(mesh: THREE.Object3D, point: THREE.Vector3|null)=>{mesh.visible=!!point; if(point) mesh.position.copy(point).applyMatrix4(grasp.needle.root.matrixWorld);};
    place(this.held,grasp.holder?grasp.heldPoint:null);
    place(this.preview,grasp.receiverPoint??grasp.candidatePoint);
    place(this.selected,showSelected?selectedPoint:null);
  }
}
