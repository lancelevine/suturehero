import * as THREE from 'three';
import type {TissueSite} from '../tissue/StitchField';
export interface CompletedStitch {
 readonly number:number;readonly site:TissueSite;readonly review:readonly string[];
 readonly strands:readonly (readonly THREE.Vector3[])[];
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
  return gaps.length<2?`Stitch spacing: ${gaps[0].toFixed(2)} practice units`:`${Math.abs(gaps[0]-gaps[1])/Math.max(...gaps)<.2?'Even':'Uneven'} spacing · ${gaps.map(g=>g.toFixed(2)).join(' / ')} practice units`;
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
 record(complete:boolean,site:Omit<TissueSite,'siteZ'>,review:readonly string[],strands:readonly (readonly THREE.Vector3[])[]){
  if(!this.active||this.finished||!complete||this.records.length!==this.index)return false;
  if(!strands.length||strands.some(s=>s.length<2||s.some(p=>!p.toArray().every(Number.isFinite))))return false;
  const saved=Object.freeze({number:this.index+1,site:Object.freeze({...site,siteZ:this.siteZ}),review:Object.freeze([...review]),
   strands:Object.freeze(strands.map(s=>Object.freeze(s.map(p=>Object.freeze(p.clone().add(new THREE.Vector3(0,0,this.siteZ)))))))});
  this.records=Object.freeze([...this.records,saved]);this.sites=Object.freeze(this.records.map(r=>r.site));this.revision++;return true;
 }
 advance(){if(!this.active||this.finished||this.records.length!==this.index+1)return false;this.index++;this.revision++;return true;}
 reset(){this.stations=Object.freeze([-.75,0,.75]);this.singleSite=0;this.active=false;this.index=0;this.records=[];this.sites=[];this.revision++;}
}
