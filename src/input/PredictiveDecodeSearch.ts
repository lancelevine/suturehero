import type {MarkerObservation} from './arucoTracking';
export interface DecodeRegion {left:number;top:number;width:number;height:number;kind:'predicted'|'expanded'|'full';reason:string}
/** Native-pixel searches: flow-guided prediction -> expanded search -> full frame.
 * Periodic global scans discover instruments outside the current search region. */
/** While instruments are tracked, scan the whole frame for new ones this often, ms.
 * Full 1080p scans take ~100 ms and delay the tracked instrument's own decodes. */
export const DISCOVERY_INTERVAL_MS=1000;
export class PredictiveDecodeSearch {
 private hints=new Map<number,{marker:MarkerObservation;at:number;vx:number;vy:number}>();
 private lastFull=-Infinity;private misses=0;private expected=new Set<number>();
 private groups:readonly (readonly number[])[]=[];private dimensions='';
 reset(){this.hints.clear();this.lastFull=-Infinity;this.misses=0;this.expected.clear();}
 private group(id:number){const index=this.groups.findIndex(ids=>ids.includes(id));return index>=0?index:100+id;}
 plan(markers:readonly MarkerObservation[],now:number,width:number,height:number,enabled:boolean,groups:readonly (readonly number[])[]):DecodeRegion{
  const signature=width+'x'+height+JSON.stringify(groups);if(signature!==this.dimensions){this.reset();this.dimensions=signature;}
  this.groups=groups;
  for(const marker of markers){const previous=this.hints.get(marker.id),center=(m:MarkerObservation)=>({x:m.corners.reduce((s,p)=>s+p.x,0)/4,y:m.corners.reduce((s,p)=>s+p.y,0)/4}),a=center(marker),b=previous?center(previous.marker):a,dt=previous?now-previous.at:0;
   this.hints.set(marker.id,{marker:structuredClone(marker),at:now,vx:dt>10?(a.x-b.x)/dt:previous?.vx??0,vy:dt>10?(a.y-b.y)/dt:previous?.vy??0});}
  for(const [id,hint] of this.hints)if(now-hint.at>500)this.hints.delete(id);
  this.expected=new Set([...this.hints.keys()].map(id=>this.group(id)));
  const full=(reason:string):DecodeRegion=>{this.lastFull=now;return {left:0,top:0,width,height,kind:'full',reason};};
  if(!enabled)return full('baseline selected');
  if(!this.hints.size)return full('no recent hints');
  if(this.misses>=2)return full('repeated region misses');
  if(now-this.lastFull>=DISCOVERY_INTERVAL_MS)return full('periodic discovery');
  let minX=width,minY=height,maxX=0,maxY=0;
  for(const hint of this.hints.values()){
   const corners=hint.marker.corners,side=corners.reduce((sum,p,i)=>sum+Math.hypot(p.x-corners[(i+1)%4].x,p.y-corners[(i+1)%4].y),0)/4;
   const lead=Math.min(150,65+now-hint.at),dx=Math.max(-width/3,Math.min(width/3,hint.vx*lead)),dy=Math.max(-height/3,Math.min(height/3,hint.vy*lead));
   const pad=Math.max(80,side*2)*(this.misses?2:1)+Math.min(120,(now-hint.at)*.3);
   for(const p of corners){minX=Math.min(minX,p.x+Math.min(0,dx)-pad);maxX=Math.max(maxX,p.x+Math.max(0,dx)+pad);minY=Math.min(minY,p.y+Math.min(0,dy)-pad);maxY=Math.max(maxY,p.y+Math.max(0,dy)+pad);}
  }
  const left=Math.max(0,Math.floor(minX)),top=Math.max(0,Math.floor(minY)),w=Math.min(width,Math.ceil(maxX))-left,h=Math.min(height,Math.ceil(maxY))-top;
  if(w<=0||h<=0||w*h>width*height*.75)return full('region too large or invalid');
  return {left,top,width:w,height:h,kind:this.misses?'expanded':'predicted',reason:this.misses?'region miss':'flow prediction'};
 }
 result(markers:readonly MarkerObservation[]){const found=new Set(markers.map(m=>this.group(m.id)));this.misses=markers.length&&[...this.expected].every(group=>found.has(group))?0:this.misses+1;}
}
