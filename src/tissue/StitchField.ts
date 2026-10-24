import * as THREE from 'three';
import {stitchLift} from './StitchTissueResponse';
import {TISSUE_LAYERS} from './anatomy';
export interface TissueSite {readonly siteZ:number;readonly closure:number;readonly initialGap:number;readonly eversion:number;readonly pucker:number;readonly tractBottom?:number;readonly compression?:number;readonly mismatch?:number}
/** Passive local approximation. Overlapping stitches share closure rather than adding displacement. */
export function retainedShift(x:number,z:number,site:TissueSite,y:number=TISSUE_LAYERS.epidermis.top){
 const support=Math.max(0,1-Math.max(0,Math.abs(x)-site.initialGap/2)/1.4);
 return (site.initialGap-.012)/2*site.closure*Math.exp(-(((z-site.siteZ)/.6)**2))*support*depthSupport(y,site.tractBottom);
}
export function retainedLift(x:number,y:number,z:number,site:TissueSite){return stitchLift(x,y,z-site.siteZ,site.eversion,site.pucker,site.compression??0)+edgeMismatchLift(x,y,z-site.siteZ,site.mismatch??0);}
export function retainedSurfaceLift(x:number,z:number,sites:readonly TissueSite[]){
 return fieldLift(x,TISSUE_LAYERS.epidermis.top,z,sites);
}

/** Illustrative edge-height mismatch from unequal dermal purchase, not tissue mechanics. */
export function edgeMismatchLift(x:number,y:number,z:number,mismatch:number){
 if(mismatch===0)return 0;
 const depth=THREE.MathUtils.smoothstep(y,TISSUE_LAYERS.dermis.bottom,TISSUE_LAYERS.epidermis.top);
 return Math.max(0,-Math.sign(x)*mismatch)*depth*Math.exp(-((z/.45)**2))*Math.exp(-((Math.abs(x)/.3)**2));
}

/** Bounded shared deformation between adjacent stitches; no new dynamic strands. */
export function fieldShift(x:number,z:number,sites:readonly TissueSite[],y:number=TISSUE_LAYERS.epidermis.top){
 let shift=0;
 for(const site of sites)shift=Math.max(shift,retainedShift(x,z,site,y));
 for(let i=1;i<sites.length;i++){
  const a=sites[i-1],b=sites[i],span=b.siteZ-a.siteZ;
  if(span<=0||z<=a.siteZ||z>=b.siteZ)continue;
  const t=(z-a.siteZ)/span,weight=bridgeWeight(span,t);
  // A loose/open stitch cannot borrow full closure from its neighbor.
  const closure=Math.min(a.closure*depthSupport(y,a.tractBottom),b.closure*depthSupport(y,b.tractBottom))*weight;
  const gap=THREE.MathUtils.lerp(a.initialGap,b.initialGap,t);
  const support=Math.max(0,1-Math.max(0,Math.abs(x)-gap/2)/1.4);
  shift=Math.max(shift,Math.max(0,gap-.012)/2*closure*support);
 }
 return shift;
}
export function fieldLift(x:number,y:number,z:number,sites:readonly TissueSite[]){
 let lift=0;
 for(const site of sites)lift=Math.max(lift,retainedLift(x,y,z,site));
 for(let i=1;i<sites.length;i++){
  const a=sites[i-1],b=sites[i],span=b.siteZ-a.siteZ;
  if(span<=0||z<=a.siteZ||z>=b.siteZ)continue;
  const t=(z-a.siteZ)/span;
  // Blend the supported ridge, including each stitch's compression and mismatch.
  const ridge=THREE.MathUtils.lerp(retainedLift(x,y,a.siteZ,a),retainedLift(x,y,b.siteZ,b),t);
  lift=Math.max(lift,ridge*bridgeWeight(span,t)*Math.sin(Math.PI*t)**2*Math.min(a.closure,b.closure));
 }
 return lift;
}
function bridgeWeight(span:number,t:number){return 1-(1-Math.exp(-((span/1.15)**4)))*Math.sin(Math.PI*t)**2;}

/** Lower dermal support fades below a shallow tract; fat follows passively. */
export const DEEP_DERMIS_Y=TISSUE_LAYERS.dermis.bottom+(TISSUE_LAYERS.dermis.top-TISSUE_LAYERS.dermis.bottom)*.25;
export function depthSupport(y:number,tractBottom?:number){
 if(tractBottom===undefined)return 1;
 const level=Math.max(y,DEEP_DERMIS_Y),bottom=TISSUE_LAYERS.dermis.bottom;
 return .55+.45*THREE.MathUtils.smoothstep(level,bottom,Math.max(bottom+.001,tractBottom));
}
