import * as THREE from 'three';
/** Small top-view markers on the visible epidermal edges during second-edge support. */
export class EpidermalAlignmentGuide {
 readonly root=new THREE.Group();
 private material=new THREE.MeshBasicMaterial({color:0xf5be64,side:THREE.DoubleSide,depthTest:false});
 private markers=[-1,1].map(()=>{const m=new THREE.Mesh(new THREE.RingGeometry(.018,.026,24),this.material);m.rotation.x=-Math.PI/2;m.renderOrder=12;this.root.add(m);return m;});
 update(left:THREE.Vector3,right:THREE.Vector3,aligned:boolean){
  for(const [i,point] of [left,right].entries()){this.markers[i].position.copy(point);this.markers[i].position.y+=.012;}
  this.material.color.setHex(aligned?0x65d8a1:0xf5be64);
 }
}
