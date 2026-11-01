const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
/** Post-estimation mono depth stabilization, in practice units. No decoder gates. */
export class MonocularDepthFilter {
 private value?:number;private lastStamp=-Infinity;private wasLocked=false;private offset=0;
 private samples:number[]=[];private pending?:{target:number;at:number;count:number};
 update(desired:number,stamp:number,locked:boolean,baseline:number,reliable=true){
  if(locked){this.value=baseline;this.wasLocked=true;this.lastStamp=stamp;this.samples=[];this.pending=undefined;return baseline;}
  if(!reliable&&(this.wasLocked||this.value===undefined)){this.value??=baseline;this.wasLocked=true;this.lastStamp=stamp;return this.value;}
  if(this.wasLocked){this.offset=this.value!-desired;this.wasLocked=false;this.samples=[];this.pending=undefined;this.lastStamp=stamp;return this.value!;}
  if(this.value===undefined){this.value=desired;this.lastStamp=stamp;return desired;}
  if(stamp<=this.lastStamp||!Number.isFinite(desired))return this.value;
  if(stamp-this.lastStamp>700){this.samples=[];this.pending=undefined;}
  const dt=clamp((stamp-this.lastStamp)/1000,.008,.15);this.lastStamp=stamp;
  if(!reliable)return this.value;
  this.samples.push(desired+this.offset);if(this.samples.length>3)this.samples.shift();
  const sorted=[...this.samples].sort((a,b)=>a-b),target=sorted[Math.floor(sorted.length/2)],error=target-this.value;
  if(Math.abs(error)<.025){this.pending=undefined;return this.value;}
  if(Math.abs(error)>.25){
   if(!this.pending||Math.abs(target-this.pending.target)>.25){this.pending={target,at:stamp,count:1};return this.value;}
   this.pending.target=target;this.pending.count++;
   if(this.pending.count<3||stamp-this.pending.at<120)return this.value;
  }else this.pending=undefined;
  const step=error*(1-Math.exp(-dt/.2));this.value+=clamp(step,-1.4*dt,1.4*dt);return this.value;
 }
}
