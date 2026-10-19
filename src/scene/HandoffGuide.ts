import * as THREE from 'three';
/** Visible extent of the forgiving, assisted tip capture region. */
export class HandoffGuide {
  readonly root=new THREE.Mesh(new THREE.SphereGeometry(0.24,16,12),new THREE.MeshBasicMaterial({color:0x70d5ee,wireframe:true,transparent:true,opacity:0.18,depthTest:false}));
  constructor() { this.root.renderOrder=4; }
  update(tip: THREE.Vector3, visible: boolean, ready: boolean) {
    this.root.visible=visible; this.root.position.copy(tip); this.root.material.color.setHex(ready?0x67d6a2:0x70d5ee);
  }
}
