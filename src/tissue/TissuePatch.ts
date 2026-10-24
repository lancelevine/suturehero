import {fieldShift,fieldLift,type TissueSite} from './StitchField';
import {TRACT_HALF_WIDTH} from './sutureTract';
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
  private lastSites:readonly TissueSite[]|undefined;
  private lastSiteZ=NaN;
  private lastEversion=-1;
  private lastResponse=-1;
  constructor() {
  const group=this.root;
  const skinMaps=skinSurface();
  const dermis=tissueSurface('dermis'),fat=tissueSurface('fat');
  // Keep the established surface height and needle entry coordinates. Every
  // layer is split completely; no solid base or wound strip bridges the gap.
  const layers=[
    {name:'epidermis',...TISSUE_LAYERS.epidermis,material:new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.86,map:skinMaps.color,bumpMap:skinMaps.height,bumpScale:0.035,roughnessMap:skinMaps.roughness})},
    {name:'dermis',...TISSUE_LAYERS.dermis,material:new THREE.MeshStandardMaterial({map:dermis.color,bumpMap:dermis.height,bumpScale:0.009,roughness:0.85})},
    {name:'subcutaneous-fat',...TISSUE_LAYERS.fat,material:new THREE.MeshStandardMaterial({map:fat.color,bumpMap:fat.height,bumpScale:0.018,roughness:0.8})},
  ];
  for(const side of [-1,1])for(const layer of layers) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(2.62,layer.top-layer.bottom,3.35,24,2,32),layer.material);
    mesh.name=`${layer.name}-${side<0?'left':'right'}`;
    mesh.position.set(side*1.36,(layer.top+layer.bottom)/2,0);group.add(mesh);
    this.surfaces.push({mesh,original:Float32Array.from(mesh.geometry.getAttribute('position').array)});
  }
  for(const x of [-TRACT_HALF_WIDTH,TRACT_HALF_WIDTH]) {
    const target=new THREE.Mesh(new THREE.RingGeometry(0.075,0.095,32),new THREE.MeshBasicMaterial({color:0xf7e3b3,side:THREE.DoubleSide}));
    target.rotation.x=-Math.PI/2; target.position.set(x,0.417,0); group.add(target);
    this.markers.push({mesh:target,original:target.position.clone()});
  }
  group.traverse(object=>{if(object instanceof THREE.Mesh) { object.receiveShadow=true; object.castShadow=true; }});
  }
  setTargets(entry:THREE.Vector3,exit:THREE.Vector3){
    for(let i=0;i<2;i++){const x=(i===0?exit:entry).x;if(this.markers[i].original.x!==x){this.markers[i].original.x=x;this.lastClosure=NaN;}}
  }
  update(model: WoundApproximation,eversion?:EdgeEversion,sites:readonly TissueSite[]=EMPTY_SITES,siteZ=0,field?:readonly TissueSite[]) {
    this.root.position.z=-siteZ;
    if(this.lastSites===sites && this.lastSiteZ===siteZ && (model.response?.revision??0)===this.lastResponse && model.closure===this.lastClosure && (eversion?.revision??0)===this.lastEversion)return;
    this.lastSites=sites;this.lastSiteZ=siteZ;
    this.lastResponse=model.response?.revision??0;
    this.lastEversion=eversion?.revision??0;
    this.lastClosure=model.closure;
    const response=model.response;
    const shared=field??[...sites,{siteZ,closure:model.closure,initialGap:model.initialGap,tractBottom:model.tractBottom,eversion:response?.eversion??0,pucker:response?.pucker??0,compression:response?.compression??0,mismatch:model.edgeMismatch}].sort((a,b)=>a.siteZ-b.siteZ);
    const point=new THREE.Vector3();
    for(const {mesh,original} of this.surfaces) {
      const position=mesh.geometry.getAttribute('position');
      for(let i=0;i<position.count;i++) {
        point.set(original[i*3]+mesh.position.x,original[i*3+1]+mesh.position.y,original[i*3+2]+mesh.position.z);
        const x=point.x,y=point.y,z=point.z;
        point.x=Math.sign(x)*Math.max(.006,Math.abs(x)-fieldShift(x,z,shared,y));
        point.y=y+fieldLift(x,y,z,shared);
        point.z-=siteZ;eversion?.deformPoint(point,point);point.z=z;
        point.sub(mesh.position);position.setXYZ(i,point.x,point.y,point.z);
      }
      position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
    }
    for(const {mesh,original} of this.markers){
      const z=original.z+siteZ;
      mesh.position.set(original.x-Math.sign(original.x)*fieldShift(original.x,z,shared),original.y+fieldLift(original.x,original.y,z,shared),original.z);
      eversion?.deformPoint(mesh.position,mesh.position);mesh.position.z+=siteZ;
    }
  }
}
export function createTissuePatch() {return new TissuePatch().root;}

const EMPTY_SITES:readonly TissueSite[]=Object.freeze([]);
