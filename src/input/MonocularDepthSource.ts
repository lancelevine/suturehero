type Source='3D pose'|'marker size';
/** Keep depth continuous when fit quality or visible marker faces change. */
export class MonocularDepthSource {
 private source?:Source;private distance?:number;private lastAt=-Infinity;
 private goodPoses=0;private scales=new Map<string,number>();
 observe(pose:number|null,size:number,face:number,at:number,stationary=false){
  if(at-this.lastAt>700){this.source=undefined;this.distance=undefined;this.goodPoses=0;this.scales.clear();}
  if(at<=this.lastAt)return {distance:this.distance!,source:this.source!};
  this.lastAt=at;
  const good=pose!==null&&Number.isFinite(pose)&&pose>20;
  this.goodPoses=good?this.goodPoses+1:0;
  this.source??=good?'3D pose':'marker size';
  if(this.source==='3D pose'&&!good)this.source='marker size';
  // Do not alternate back on a single lucky fit. Fallback still tracks motion.
  if(this.source==='marker size'&&this.goodPoses>=8)this.source='3D pose';
  const raw=this.source==='3D pose'?pose!:size,key=`${face}:${this.source}`;
  if(!Number.isFinite(raw)||raw<=20)return {distance:this.distance??NaN,source:this.source};
  let scale=this.scales.get(key);
  if(scale===undefined||(stationary&&this.distance!==undefined)){
   scale=this.distance===undefined?1:this.distance/raw;this.scales.set(key,scale);
  }
  this.distance=raw*scale;
  return {distance:this.distance,source:this.source};
 }
}
