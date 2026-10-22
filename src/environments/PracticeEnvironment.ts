import {MICRO_TARGETS,MICRO_TRAY_Y,MICRO_FLOOR_Y,type MicroTarget} from './MicroTargets';
import type * as THREE from 'three';
import {isDermalBite,DERMAL_MIDPOINT} from '../tissue/anatomy';
import {threadSurfaceAt} from '../suture/TissueThreadGuide';
export type EnvironmentId='skin'|'microsurgery';
export const ARTERY=MICRO_TARGETS.artery;
export interface PracticeEnvironment {
 id:EnvironmentId;title:string;purchaseY:number;microTarget?:MicroTarget;
 surfaceAt:(p:THREE.Vector3)=>number;
 loadBearing:(p:THREE.Vector3|null)=>boolean;
}
export const environments:Record<EnvironmentId,PracticeEnvironment>={
 skin:{id:'skin',title:'Skin suturing',purchaseY:DERMAL_MIDPOINT,surfaceAt:threadSurfaceAt,loadBearing:isDermalBite},
 microsurgery:createMicroEnvironment('artery'),
};
export function createMicroEnvironment(target:MicroTarget):PracticeEnvironment{
 const shape=MICRO_TARGETS[target];
 return {id:'microsurgery',microTarget:target,title:`Microsurgery · ${shape.label}`,purchaseY:shape.purchaseY,
  surfaceAt:p=>{
   if(Math.abs(p.x)>=shape.gap/2&&Math.abs(p.x)<=shape.length+shape.gap/2&&Math.abs(p.z)<shape.outerRadius)
    return shape.centerY+Math.sqrt(shape.outerRadius**2-p.z**2)+.013;
   if(Math.abs(p.x)<=3.5&&Math.abs(p.z)<=2.5)return MICRO_TRAY_Y+.075;
   return MICRO_FLOOR_Y+.025;
  },
  loadBearing:p=>!!p&&Math.abs(p.x)>=shape.gap/2&&Math.abs(p.x)<=shape.length+shape.gap/2&&Math.hypot(p.y-shape.centerY,p.z)>shape.innerRadius&&Math.hypot(p.y-shape.centerY,p.z)<shape.outerRadius,
 };
}
