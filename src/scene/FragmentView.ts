import * as THREE from 'three';
import {StrandMesh} from './StrandMesh';
import type {ThreadStrand} from '../suture/ThreadStrand';
export class FragmentView {
 readonly root=new THREE.Group();private meshes=new Map<ThreadStrand,StrandMesh>();
 update(strands:readonly ThreadStrand[]){
  for(const [strand,mesh] of this.meshes)if(!strands.includes(strand)){this.root.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();this.meshes.delete(strand);}
  for(const strand of strands){
   let mesh=this.meshes.get(strand);
   if(mesh&&mesh.geometry.getAttribute('position').count!==strand.count*6){this.root.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();mesh=undefined;}
   if(!mesh){mesh=new StrandMesh(strand.count);this.meshes.set(strand,mesh);this.root.add(mesh);}
   this.root.updateWorldMatrix(true,false);mesh.update(strand.points,this.root.matrixWorld);
  }
 }
}
