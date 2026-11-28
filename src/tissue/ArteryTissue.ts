import * as THREE from 'three';
import {microProfile,type MicroTarget} from '../environments/MicroTargets';
import type {WoundApproximation} from './WoundApproximation';
import type {EdgeEversion} from './EdgeEversion';
/** Vessel wall and lumen roughness (wet tissue reads as slightly glossy). */
const VESSEL_WALL_ROUGHNESS=.48;
const VESSEL_LUMEN_ROUGHNESS=.6;
/** Two hollow arterial ends. Outer wall, lumen and cut faces remain separate. */
export class ArteryTissue {
 readonly root=new THREE.Group();
 private surfaces:{mesh:THREE.Mesh;original:Float32Array}[]=[];
 private lastClosure=NaN;private lastEversion=-1;
 target:MicroTarget='artery';
 private builtGap=NaN;
 constructor(){this.build();}
 setTarget(target:MicroTarget){
  // Rebuild for a new target, or when the Acland clamp changed the gap (src/environments/MicroTargets.ts).
  if(target===this.target&&microProfile(target).gap===this.builtGap)return;
  const materials=new Set<THREE.Material>();this.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>materials.add(m));else materials.add(o.material);}});materials.forEach(m=>m.dispose());
  this.root.clear();this.surfaces=[];this.target=target;this.lastClosure=NaN;this.lastEversion=-1;this.build();
 }
 private build(){
  const ARTERY=microProfile(this.target);this.builtGap=ARTERY.gap;
  // Moist adventitia: a softer highlight than dry skin (roughness .72 looked matte and flat).
  const outer=new THREE.MeshStandardMaterial({color:ARTERY.color,roughness:VESSEL_WALL_ROUGHNESS});
  const inner=new THREE.MeshStandardMaterial({color:ARTERY.innerColor,roughness:VESSEL_LUMEN_ROUGHNESS,side:THREE.BackSide});
  const cut=new THREE.MeshStandardMaterial({color:ARTERY.cutColor,roughness:.8,side:THREE.DoubleSide});
  for(const side of [-1,1]){
   const x=side*(ARTERY.gap/2+ARTERY.length/2);
   for(const [radius,material,name] of [[ARTERY.outerRadius,outer,'outer-wall'],[ARTERY.innerRadius,inner,'lumen']] as const){
    const geometry=new THREE.CylinderGeometry(radius,radius,ARTERY.length,48,20,true);
    geometry.rotateZ(Math.PI/2);geometry.translate(x,ARTERY.centerY,0);
    this.add(new THREE.Mesh(geometry,material),`${name}-${side}`);
   }
   if(this.target==='nerve'){
    const fascicleMaterial=new THREE.MeshStandardMaterial({color:0xe2c987,roughness:.82});
    const endMaterial=new THREE.MeshStandardMaterial({color:0xffedc2,roughness:.9,side:THREE.DoubleSide});
    for(let n=0;n<7;n++){
     const a=(n-1)/6*Math.PI*2,r=n===0?0:.145,fy=ARTERY.centerY+Math.cos(a)*r,fz=Math.sin(a)*r;
     const bundle=new THREE.CylinderGeometry(.055,.055,ARTERY.length,16,12,true);bundle.rotateZ(Math.PI/2);bundle.translate(x,fy,fz);
     this.add(new THREE.Mesh(bundle,fascicleMaterial),`fascicle-${side}-${n}`);
     for(const end of [ARTERY.gap/2,ARTERY.gap/2+ARTERY.length]){
      const face=new THREE.CircleGeometry(.053,16);face.rotateY(Math.PI/2);face.translate(side*end,fy,fz);this.add(new THREE.Mesh(face,endMaterial),`fascicle-end-${side}-${n}-${end}`);
     }
    }
   }
   for(const end of [ARTERY.gap/2,ARTERY.gap/2+ARTERY.length]){
    const geometry=new THREE.RingGeometry(ARTERY.innerRadius,ARTERY.outerRadius,48,2);
    geometry.rotateY(Math.PI/2);geometry.translate(side*end,ARTERY.centerY,0);
    this.add(new THREE.Mesh(geometry,cut),`cut-face-${side}-${end}`);
   }
  }
  this.root.name=this.target+'-workspace';
 }
 /** Nerve repair: turn the right end's fascicle bundles about the nerve axis (degrees). */
 setFascicleTwist(degrees:number){
  const radians=THREE.MathUtils.degToRad(degrees);
  for(const child of this.root.children)if(/^fascicle(-end)?-1-/.test(child.name)){child.rotation.x=radians;child.position.set(0,0,0);}
 }
 private add(mesh:THREE.Mesh,name:string){mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);this.surfaces.push({mesh,original:Float32Array.from(mesh.geometry.getAttribute('position').array)});}
 update(wound:WoundApproximation,eversion:EdgeEversion){
  if(wound.closure===this.lastClosure&&eversion.revision===this.lastEversion)return;
  this.lastClosure=wound.closure;this.lastEversion=eversion.revision;
  const point=new THREE.Vector3();
  for(const {mesh,original} of this.surfaces){
   const position=mesh.geometry.getAttribute('position');
   for(let i=0;i<position.count;i++){
    point.fromArray(original,i*3);wound.deformPoint(point,point);eversion.deformPoint(point,point);position.setXYZ(i,point.x,point.y,point.z);
   }
   position.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
  }
 }
}
