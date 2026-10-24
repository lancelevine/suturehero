import * as THREE from 'three';
/** Frozen copies of the completed render geometry. No live solver or tool references. */
export class CompletedStitchesView {
 readonly root=new THREE.Group();
 private count=0;
 retain(sources:readonly THREE.Object3D[],siteZ:number){
  const stitch=new THREE.Group();stitch.name=`completed-stitch-${++this.count}`;
  for(const source of sources){
   source.updateWorldMatrix(true,true);
   source.traverseVisible(object=>{
    if(!(object instanceof THREE.Mesh)||object.name==='short-tip-marker'||!object.geometry.getAttribute('position')?.count)return;
    const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);geometry.translate(0,0,siteZ);
    const material=Array.isArray(object.material)?object.material.map(m=>m.clone()):object.material.clone();
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=object.castShadow;mesh.receiveShadow=object.receiveShadow;stitch.add(mesh);
   });
  }
  this.root.add(stitch);
 }
 update(completed:number,siteZ:number){if(completed<this.count)this.clear();this.root.position.z=-siteZ;}
 clear(){
  this.root.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();for(const m of Array.isArray(object.material)?object.material:[object.material])m.dispose();}});
  this.root.clear();this.count=0;
 }
}
