import { TISSUE_LAYERS } from './anatomy';
import type { EdgeEversion } from './EdgeEversion';
import { tissueSurface } from '../visuals/tissueSurfaces';
import { skinSurface } from '../visuals/skinSurface';
import * as THREE from 'three';
import type { WoundApproximation } from './WoundApproximation';
/** Three fully split anatomical layers follow the independent approximation model. */
export class TissuePatch {
  readonly root=new THREE.Group();
  private surfaces: {mesh: THREE.Mesh<THREE.BoxGeometry>;original: Float32Array}[]=[];
  private markers: {mesh: THREE.Mesh;original: THREE.Vector3}[]=[];
  private lastClosure=NaN;
  private lastEversion=-1;
  constructor() {
  const group=this.root;
  const skinMaps=skinSurface();
  const dermis=tissueSurface('dermis'),fat=tissueSurface('fat');
  // Keep the established surface height and needle entry coordinates. Every
  // layer is split completely; no solid base or wound strip bridges the gap.
  const layers=[
    {name:'epidermis',...TISSUE_LAYERS.epidermis,material:new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.9,map:skinMaps.color,bumpMap:skinMaps.height,bumpScale:0.025,roughnessMap:skinMaps.roughness})},
    {name:'dermis',...TISSUE_LAYERS.dermis,material:new THREE.MeshStandardMaterial({map:dermis.color,bumpMap:dermis.height,bumpScale:0.009,roughness:0.85})},
    {name:'subcutaneous-fat',...TISSUE_LAYERS.fat,material:new THREE.MeshStandardMaterial({map:fat.color,bumpMap:fat.height,bumpScale:0.018,roughness:0.8})},
  ];
  for(const side of [-1,1])for(const layer of layers) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(2.62,layer.top-layer.bottom,3.35,24,2,32),layer.material);
    mesh.name=`${layer.name}-${side<0?'left':'right'}`;
    mesh.position.set(side*1.36,(layer.top+layer.bottom)/2,0);group.add(mesh);
    this.surfaces.push({mesh,original:Float32Array.from(mesh.geometry.getAttribute('position').array)});
  }
  for(const x of [-0.3,0.3]) {
    const target=new THREE.Mesh(new THREE.RingGeometry(0.075,0.095,32),new THREE.MeshBasicMaterial({color:0xf7e3b3,side:THREE.DoubleSide}));
    target.rotation.x=-Math.PI/2; target.position.set(x,0.417,0); group.add(target);
    this.markers.push({mesh:target,original:target.position.clone()});
  }
  group.traverse(object=>{if(object instanceof THREE.Mesh) { object.receiveShadow=true; object.castShadow=true; }});
  }
  update(model: WoundApproximation,eversion?:EdgeEversion) {
    if(model.closure===this.lastClosure && (eversion?.revision??0)===this.lastEversion)return;
    this.lastEversion=eversion?.revision??0;
    this.lastClosure=model.closure;
    const point=new THREE.Vector3();
    for(const {mesh,original} of this.surfaces) {
      const position=mesh.geometry.getAttribute('position');
      for(let i=0;i<position.count;i++) {
        point.set(original[i*3]+mesh.position.x,original[i*3+1]+mesh.position.y,original[i*3+2]+mesh.position.z);
        model.deformPoint(point,point);eversion?.deformPoint(point,point);point.sub(mesh.position); position.setXYZ(i,point.x,point.y,point.z);
      }
      position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
    }
    for(const {mesh,original} of this.markers){model.deformPoint(original,mesh.position);eversion?.deformPoint(mesh.position,mesh.position);}
  }
}
export function createTissuePatch() {return new TissuePatch().root;}
