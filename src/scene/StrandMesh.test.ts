import { expect, it } from 'vitest';
import * as THREE from 'three';
import { StrandMesh } from './StrandMesh';
it('keeps strand geometry in world space when its needle parent moves and reuses buffers',()=>{
  const root=new THREE.Group();root.position.set(1,2,3);root.rotation.set(0.4,0.6,0.2);
  const points=[new THREE.Vector3(0,1,0),new THREE.Vector3(1,0.5,0.3),new THREE.Vector3(2,0.4,0.5)];
  const mesh=new StrandMesh(points.length);root.add(mesh);const geometry=mesh.geometry;
  for(let step=0;step<2;step++) {
    root.updateMatrixWorld(true);mesh.update(points,root.matrixWorld);root.updateMatrixWorld(true);
    const positions=mesh.geometry.getAttribute('position');
    points.forEach((point,i)=>{
      const center=new THREE.Vector3();
      for(let side=0;side<6;side++)center.add(new THREE.Vector3().fromBufferAttribute(positions,i*6+side).applyMatrix4(mesh.matrixWorld));
      center.divideScalar(6);expect(center.distanceTo(point)).toBeLessThan(1e-6);
    });
    expect(mesh.geometry).toBe(geometry);root.position.x+=2;root.rotateY(0.8);
  }
});
