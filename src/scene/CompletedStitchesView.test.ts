import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {CompletedStitchesView} from './CompletedStitchesView';
it('freezes visible geometry independently, translates with the pad and disposes archives on reset',()=>{
 const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial());root.add(mesh);root.position.set(.2,.4,.3);
 const hidden=new THREE.Mesh(new THREE.BoxGeometry(),mesh.material);hidden.visible=false;root.add(hidden);
 const view=new CompletedStitchesView();view.retain([root],-.75);view.update(1,0);
 const saved=view.root.children[0].children[0] as THREE.Mesh;
 expect(view.root.children[0].children).toHaveLength(1);expect(saved.geometry).not.toBe(mesh.geometry);expect(saved.material).not.toBe(mesh.material);
 saved.geometry.computeBoundingBox();expect(saved.geometry.boundingBox!.getCenter(new THREE.Vector3()).z).toBeCloseTo(-.45);
 const before=Array.from(saved.geometry.getAttribute('position').array);mesh.geometry.translate(2,3,4);root.clear();
 expect(Array.from(saved.geometry.getAttribute('position').array)).toEqual(before);
 view.update(1,.75);expect(view.root.position.z).toBe(-.75);
 const dispose=vi.spyOn(saved.geometry,'dispose');view.update(0,0);expect(dispose).toHaveBeenCalledOnce();expect(view.root.children).toHaveLength(0);
});
