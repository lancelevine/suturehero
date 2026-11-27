import {formatMm} from '../setup/sceneScale';
import * as THREE from 'three';
import {fieldShift,type TissueSite} from '../tissue/StitchField';
import type {StitchMeta} from './sessionRecord';
import {gapScan,OPEN_GAP} from './gapScan';
import {describeStepOffs} from './stepOff';
export interface CompletedStitch {
 readonly number:number;readonly site:TissueSite;readonly review:readonly string[];
 readonly strands:readonly (readonly THREE.Vector3[])[];
 /** Knot and timing for the results export (sessionRecord.ts), when known. */
 readonly meta?:StitchMeta;
}
/** Completed stitches are immutable records; only the current stitch is simulated. */
export class StitchCourse {
 private stations:readonly number[]=Object.freeze([-.75,0,.75]);
 private singleSite=0;
 get positions(){return this.stations;}
 get positionLimits(){if(this.finished)return {min:this.siteZ,max:this.siteZ};return {min:this.active&&this.index>0?this.records.at(-1)!.site.siteZ+.3:-1.1,max:this.active?1.1-(2-this.index)*.3:1.1};}
 selectSite(value:number){
  if(!Number.isFinite(value)||this.finished||this.active&&this.records.length!==this.index)return false;
  const {min,max}=this.positionLimits,z=THREE.MathUtils.clamp(value,min,max);
  if(this.active){const next=[...this.stations];next[this.index]=z;for(let i=this.index+1;i<3;i++)next[i]=Math.max([-.75,0,.75][i],next[i-1]+.3);this.stations=Object.freeze(next);}
  else this.singleSite=z;
  this.revision++;return true;
 }
 get spacingReview(){
  if(this.records.length<2)return 'Save two stitches to review spacing.';
  const gaps=this.records.slice(1).map((r,i)=>r.site.siteZ-this.records[i].site.siteZ);
  return gaps.length<2?`Stitch spacing: ${formatMm(gaps[0])}`:`${Math.abs(gaps[0]-gaps[1])/Math.max(...gaps)<.2?'Even':'Uneven'} spacing · ${gaps.map(g=>formatMm(g)).join(' / ')}`;
 }
 get closureReview(){
  if(this.sites.length<2)return 'Save two stitches to review closure between them.';
  const gaps=this.sites.slice(1).map((b,i)=>{const a=this.sites[i],gap=(a.initialGap+b.initialGap)/2;return gap-2*fieldShift(gap/2,(a.siteZ+b.siteZ)/2,this.sites);});
  const largest=Math.max(...gaps),uneven=largest-Math.min(...gaps)>.012;
  // Gap scan along the whole wound (src/gameplay/gapScan.ts): where the edges are still apart.
  const open=gapScan(this.sites);
  const scan=open.length?`Gap scan: open at ${open.map(span=>`${formatMm(span.from,0)} to ${formatMm(span.to,0)}`).join(', ')}`:'Gap scan: edges touching along the wound';
  return `Between stitches: ${largest>OPEN_GAP?'visible opening':uneven?'uneven closure':'shared approximation'} · Largest midpoint gap ${formatMm(largest,2)} · ${scan} · ${describeStepOffs(this.sites)}`;
 }
 active=false;index=0;revision=0;
 private records:readonly CompletedStitch[]=[];
 private sites:readonly TissueSite[]=[];
 get completed(){return this.records;}
 get tissueSites(){return this.sites;}
 get siteZ(){return this.active?this.positions[this.index]:this.singleSite;}
 get finished(){return this.active&&this.records.length===this.positions.length;}
 get status(){return !this.active?'One-stitch practice':this.finished?'Session complete · 3 / 3 stitches':`Stitch ${this.index+1} / 3 · ${this.records.length} completed`;}
 begin(){this.reset();this.active=true;this.revision++;}
 record(complete:boolean,site:Omit<TissueSite,'siteZ'>,review:readonly string[],strands:readonly (readonly THREE.Vector3[])[],meta?:StitchMeta){
  if(!this.active||this.finished||!complete||this.records.length!==this.index)return false;
  if(!strands.length||strands.some(s=>s.length<2||s.some(p=>!p.toArray().every(Number.isFinite))))return false;
  const saved=Object.freeze({number:this.index+1,site:Object.freeze({...site,siteZ:this.siteZ}),review:Object.freeze([...review]),
   strands:Object.freeze(strands.map(s=>Object.freeze(s.map(p=>Object.freeze(p.clone().add(new THREE.Vector3(0,0,this.siteZ))))))),...(meta?{meta:Object.freeze(meta)}:{})});
  this.records=Object.freeze([...this.records,saved]);this.sites=Object.freeze(this.records.map(r=>r.site));this.revision++;return true;
 }
 advance(){if(!this.active||this.finished||this.records.length!==this.index+1)return false;this.index++;this.revision++;return true;}
 /**
  * Sandbox stitches (2026-11-15): any number, each recorded at its own
  * position along the wound (`site.siteZ`), with strands already in world
  * coordinates (the Sandbox keeps the current site at z = 0). Only outside a
  * guided course; Reset clears them with everything else.
  */
 recordSandbox(site:TissueSite,review:readonly string[],strands:readonly (readonly THREE.Vector3[])[],meta?:StitchMeta){
  if(this.active||!Number.isFinite(site.siteZ))return false;
  if(!strands.length||strands.some(s=>s.length<2||s.some(p=>!p.toArray().every(Number.isFinite))))return false;
  const saved=Object.freeze({number:this.records.length+1,site:Object.freeze({...site}),review:Object.freeze([...review]),
   strands:Object.freeze(strands.map(s=>Object.freeze(s.map(p=>Object.freeze(p.clone()))))),...(meta?{meta:Object.freeze(meta)}:{})});
  this.records=Object.freeze([...this.records,saved]);this.sites=Object.freeze(this.records.map(r=>r.site));this.revision++;return true;
 }
 reset(){this.stations=Object.freeze([-.75,0,.75]);this.singleSite=0;this.active=false;this.index=0;this.records=[];this.sites=[];this.revision++;}
}
