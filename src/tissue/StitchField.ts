import * as THREE from 'three';
import {stitchLift} from './StitchTissueResponse';
import {TISSUE_LAYERS} from './anatomy';
export interface TissueSite {readonly siteZ:number;readonly closure:number;readonly initialGap:number;readonly eversion:number;readonly pucker:number;readonly mismatch?:number}
/** Passive local approximation. Overlapping stitches share closure rather than adding displacement. */
export function retainedShift(x:number,z:number,site:TissueSite){
 const support=Math.max(0,1-Math.max(0,Math.abs(x)-site.initialGap/2)/1.4);
 return (site.initialGap-.012)/2*site.closure*Math.exp(-(((z-site.siteZ)/.6)**2))*support;
}
export function retainedLift(x:number,y:number,z:number,site:TissueSite){return stitchLift(x,y,z-site.siteZ,site.eversion,site.pucker)+edgeMismatchLift(x,y,z-site.siteZ,site.mismatch??0);}
export function retainedSurfaceLift(x:number,z:number,sites:readonly TissueSite[]){
 let lift=0;for(const site of sites)lift=Math.max(lift,retainedLift(x,TISSUE_LAYERS.epidermis.top,z,site));return lift;
}

/** Illustrative edge-height mismatch from unequal dermal purchase, not tissue mechanics. */
export function edgeMismatchLift(x:number,y:number,z:number,mismatch:number){
 if(mismatch===0)return 0;
 const depth=THREE.MathUtils.smoothstep(y,TISSUE_LAYERS.dermis.bottom,TISSUE_LAYERS.epidermis.top);
 return Math.max(0,-Math.sign(x)*mismatch)*depth*Math.exp(-((z/.45)**2))*Math.exp(-((Math.abs(x)/.3)**2));
}
