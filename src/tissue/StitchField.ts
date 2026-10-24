import {stitchLift} from './StitchTissueResponse';
import {TISSUE_LAYERS} from './anatomy';
export interface TissueSite {readonly siteZ:number;readonly closure:number;readonly initialGap:number;readonly eversion:number;readonly pucker:number}
/** Passive local approximation. Overlapping stitches share closure rather than adding displacement. */
export function retainedShift(x:number,z:number,site:TissueSite){
 const support=Math.max(0,1-Math.max(0,Math.abs(x)-site.initialGap/2)/1.4);
 return (site.initialGap-.012)/2*site.closure*Math.exp(-(((z-site.siteZ)/.6)**2))*support;
}
export function retainedLift(x:number,y:number,z:number,site:TissueSite){return stitchLift(x,y,z-site.siteZ,site.eversion,site.pucker);}
export function retainedSurfaceLift(x:number,z:number,sites:readonly TissueSite[]){
 let lift=0;for(const site of sites)lift=Math.max(lift,retainedLift(x,TISSUE_LAYERS.epidermis.top,z,site));return lift;
}
