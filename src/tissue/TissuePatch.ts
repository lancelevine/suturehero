import { skinSurface } from '../visuals/skinSurface';
import * as THREE from 'three';
import type { WoundApproximation } from './WoundApproximation';
/** Subdivided visual skin follows the independent approximation model. */
export class TissuePatch {
  readonly root=new THREE.Group();
  private surfaces: {mesh: THREE.Mesh<THREE.BoxGeometry>;original: Float32Array}[]=[];
  private markers: {mesh: THREE.Mesh;original: THREE.Vector3}[]=[];
  private lastClosure=NaN;
  constructor() {
  const group=this.root;
  const skinMaps=skinSurface();
  const base=new THREE.Mesh(new THREE.BoxGeometry(5.4,0.28,3.4),new THREE.MeshStandardMaterial({color:0x9e5354,roughness:0.85}));
  base.position.y=0.16; group.add(base);
  for(const side of [-1,1]) {
    const skin=new THREE.Mesh(new THREE.BoxGeometry(2.62,0.12,3.35,12,1,32),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.9,map:skinMaps.color,bumpMap:skinMaps.height,bumpScale:0.04,roughnessMap:skinMaps.roughness}));
    skin.position.set(side*1.36,0.35,0); group.add(skin);
    this.surfaces.push({mesh:skin,original:Float32Array.from(skin.geometry.getAttribute('position').array)});
  }
  const wound=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.025,2.3),new THREE.MeshStandardMaterial({color:0x743d42}));
  wound.position.y=0.31; group.add(wound);
  for(const x of [-0.3,0.3]) {
    const target=new THREE.Mesh(new THREE.RingGeometry(0.075,0.095,32),new THREE.MeshBasicMaterial({color:0xf7e3b3,side:THREE.DoubleSide}));
    target.rotation.x=-Math.PI/2; target.position.set(x,0.417,0); group.add(target);
    this.markers.push({mesh:target,original:target.position.clone()});
  }
  group.traverse(object=>{if(object instanceof THREE.Mesh) { object.receiveShadow=true; object.castShadow=true; }});
  }
  update(model: WoundApproximation) {
    if(model.closure===this.lastClosure)return;
    this.lastClosure=model.closure;
    const point=new THREE.Vector3();
    for(const {mesh,original} of this.surfaces) {
      const position=mesh.geometry.getAttribute('position');
      for(let i=0;i<position.count;i++) {
        point.set(original[i*3]+mesh.position.x,original[i*3+1]+mesh.position.y,original[i*3+2]+mesh.position.z);
        model.deformPoint(point,point).sub(mesh.position); position.setXYZ(i,point.x,point.y,point.z);
      }
      position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
    }
    for(const {mesh,original} of this.markers)model.deformPoint(original,mesh.position);
  }
}
export function createTissuePatch() {return new TissuePatch().root;}
