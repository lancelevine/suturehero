import {PRACTICE_SETUP} from '../setup/PracticeSetup';
import { THREAD_RADIUS } from '../suture/threadMaterial';
import * as THREE from 'three';
/** Reuses tube buffers instead of allocating and disposing geometry every frame. */
export class StrandMesh extends THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial> {
  private sides=6;
  constructor(count:number) {
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*6*3),3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(count*6*3),3));
    const indices:number[]=[];
    for(let i=0;i<count-1;i++)for(let j=0;j<6;j++) {
      const a=i*6+j,b=i*6+(j+1)%6,c=(i+1)*6+j,d=(i+1)*6+(j+1)%6;
      indices.push(a,b,c,b,d,c);
    }
    geometry.setIndex(indices);
    super(geometry,new THREE.MeshStandardMaterial({color:PRACTICE_SETUP.suture.color,roughness:0.75}));
    this.matrixAutoUpdate=false;this.castShadow=true;
  }
  update(points:readonly THREE.Vector3[],parentWorld:THREE.Matrix4) {
    this.matrix.copy(parentWorld).invert();this.matrixWorldNeedsUpdate=true;
    const position=this.geometry.getAttribute('position'),normal=this.geometry.getAttribute('normal');
    const tangent=new THREE.Vector3(),u=new THREE.Vector3(),v=new THREE.Vector3(),n=new THREE.Vector3();
    for(let i=0;i<points.length;i++) {
      tangent.subVectors(points[Math.min(points.length-1,i+1)],points[Math.max(0,i-1)]).normalize();
      if(tangent.lengthSq()<0.1)tangent.set(0,0,1);
      u.crossVectors(tangent,Math.abs(tangent.y)>0.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize();
      v.crossVectors(tangent,u).normalize();
      for(let j=0;j<this.sides;j++) {
        const a=j/this.sides*Math.PI*2;n.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(v,Math.sin(a));
        const index=i*this.sides+j;
        position.setXYZ(index,points[i].x+n.x*THREAD_RADIUS,points[i].y+n.y*THREAD_RADIUS,points[i].z+n.z*THREAD_RADIUS);
        normal.setXYZ(index,n.x,n.y,n.z);
      }
    }
    position.needsUpdate=true;normal.needsUpdate=true;this.geometry.computeBoundingSphere();
  }
}
