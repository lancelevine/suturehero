export type JawDistance='near'|'far';
export type JawEndpoint='closed'|'open';
type Sample={separation:number;scale:number};
type Station=Partial<Record<JawEndpoint,Sample>>;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** Scale is the sum of apparent ball radii, independent of the visible ArUco face. */
export class JawCalibration {
 private points:Record<JawDistance,Station>={near:{},far:{}};
 private pending?:{distance:JawDistance;endpoint:JawEndpoint;started:number;lastStamp?:number;samples:(Sample&{at:number})[]};
 private closedLatch=true;
 value=0;message='Capture closed and open at Near, then repeat at Far. Keep the same typical instrument angle.';
 get capturing(){return !!this.pending;}
 has(distance:JawDistance,endpoint:JawEndpoint){return !!this.points[distance][endpoint];}
 private complete(s:Station):s is Record<JawEndpoint,Sample>{return !!s.closed&&!!s.open;}
 get limits(){
  const all=Object.values(this.points).filter(s=>this.complete(s)).flatMap(s=>[s.closed!.separation,s.open!.separation]);
  return {closed:all.length?Math.min(...all):null,open:all.length?Math.max(...all):null};
 }
 reset(){this.points={near:{},far:{}};this.pending=undefined;this.value=0;this.closedLatch=true;this.message='Jaw measurements reset. Capture Near closed and open, then Far.';}
 cancel(message:string){this.pending=undefined;this.message=message;}
 start(distance:JawDistance,endpoint:JawEndpoint,now:number){this.pending={distance,endpoint,started:now,samples:[]};this.message=`Hold ${endpoint} and still at ${distance.toUpperCase()} distance while samples are collected.`;}
 poll(now:number){if(this.pending&&now-this.pending.started>2500)this.cancel('Capture timed out. Keep both balls visible and hold still, then retry. Previous measurements kept.');}
 observe(separation:number,scale:number,now:number,stamp=now){
  this.poll(now);const p=this.pending;
  if(!p||!Number.isFinite(separation)||!Number.isFinite(scale)||scale<=0||separation<=0||p.lastStamp===stamp)return;
  p.lastStamp=stamp;p.samples.push({separation,scale,at:now});
  this.message=`Capturing ${p.distance} ${p.endpoint}: ${p.samples.length}/8 frames. Hold still.`;
  if(p.samples.length<8||now-p.samples[0].at<450)return;
  const sorted=[...p.samples].sort((a,b)=>a.separation-b.separation),samples=sorted.slice(1,-1);
  const mean=(key:keyof Sample)=>samples.reduce((sum,s)=>sum+s[key],0)/samples.length;
  const separationMean=mean('separation'),scaleMean=mean('scale');
  const spread=(key:keyof Sample,value:number)=>Math.sqrt(samples.reduce((sum,s)=>sum+(s[key]-value)**2,0)/samples.length)/value;
  if(spread('separation',separationMean)>.04||spread('scale',scaleMean)>.05){this.cancel('Capture varied too much. Hold the jaws and distance steady, then retry. Previous measurements kept.');return;}
  const candidate={near:{...this.points.near},far:{...this.points.far}};
  candidate[p.distance][p.endpoint]={separation:separationMean,scale:scaleMean};
  const station=candidate[p.distance];
  if(this.complete(station)&&Math.abs(station.open.separation-station.closed.separation)<.08){this.cancel('Open and closed readings are too similar. Open the jaws farther and retry. Previous measurements kept.');return;}
  if(this.complete(candidate.near)&&this.complete(candidate.far)){
   const near=candidate.near,far=candidate.far;
   if(near.closed.scale<far.closed.scale*1.12||near.open.scale<far.open.scale*1.12){this.cancel('Near and Far are too close or reversed. Capture Far farther from the camera. Previous measurements kept.');return;}
   if((near.open.separation-near.closed.separation)*(far.open.separation-far.closed.separation)<=0){this.cancel('Near and Far disagree about jaw direction. Keep the same instrument angle and retry. Previous measurements kept.');return;}
  }
  this.points=candidate;this.pending=undefined;
  this.message=`${p.distance==='near'?'Near':'Far'} ${p.endpoint} recorded (${p.samples.length} frames averaged). `+(this.complete(candidate.near)&&this.complete(candidate.far)?'Near/Far compensation ready.':this.complete(candidate[p.distance])?'One-distance calibration ready; capture the other distance for compensation.':'Capture the other jaw position at this same distance.');
 }
 endpoints(scale:number){
  const {near,far}=this.points;
  if(!this.complete(near))return this.complete(far)?{closed:far.closed.separation,open:far.open.separation}:null;
  if(!this.complete(far))return {closed:near.closed.separation,open:near.open.separation};
  const interpolate=(endpoint:JawEndpoint)=>{
   const a=near[endpoint],b=far[endpoint],t=clamp((scale-b.scale)/(a.scale-b.scale));return b.separation+(a.separation-b.separation)*t;
  };
  return {closed:interpolate('closed'),open:interpolate('open')};
 }
 update(separation:number,scale:number){
  const ends=this.endpoints(scale);if(!ends||Math.abs(ends.open-ends.closed)<.02)return null;
  const raw=(separation-ends.closed)/(ends.open-ends.closed);
  if(raw<=.04)this.closedLatch=true;else if(raw>=.06)this.closedLatch=false;
  const next=this.closedLatch?0:clamp((raw-.04)/.96);
  // Fully closed must actually reach zero, rather than asymptotically hovering open.
  this.value=next===0?0:this.value*.35+next*.65;return this.value;
 }
}
