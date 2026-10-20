import { skinSurface } from '../visuals/skinSurface';
import * as THREE from 'three';
/** Visual tissue only. Collision and deformation belong to a future tissue model. */
export function createTissuePatch(): THREE.Group {
  const group=new THREE.Group();
  const skinMaps=skinSurface();
  const base=new THREE.Mesh(new THREE.BoxGeometry(5.4,0.28,3.4),new THREE.MeshStandardMaterial({color:0x9e5354,roughness:0.85}));
  base.position.y=0.16; group.add(base);
  for(const side of [-1,1]) {
    const skin=new THREE.Mesh(new THREE.BoxGeometry(2.62,0.12,3.35),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.9,map:skinMaps.color,bumpMap:skinMaps.height,bumpScale:0.04,roughnessMap:skinMaps.roughness}));
    skin.position.set(side*1.36,0.35,0); group.add(skin);
  }
  const wound=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.025,2.3),new THREE.MeshStandardMaterial({color:0x743d42}));
  wound.position.y=0.31; group.add(wound);
  for(const x of [-0.3,0.3]) {
    const target=new THREE.Mesh(new THREE.RingGeometry(0.075,0.095,32),new THREE.MeshBasicMaterial({color:0xf7e3b3,side:THREE.DoubleSide}));
    target.rotation.x=-Math.PI/2; target.position.set(x,0.417,0); group.add(target);
  }
  group.traverse(object=>{if(object instanceof THREE.Mesh) { object.receiveShadow=true; object.castShadow=true; }});
  return group;
}
