type Reading={opening:number;at:number;quality:number};
/** Camera-specific calibrations share an opening scale; stale views never vote. */
export class JawViewFusion {
 private readings=new Map<number,Reading>();private active?:number;
 update(camera:number,opening:number,at:number,quality:number,now:number){
  this.readings.set(camera,{opening,at,quality});
  const fresh=[...this.readings].filter(([,r])=>now-r.at<250&&now>=r.at);
  if(!fresh.length)return null;
  const recent=fresh.filter(([,r])=>now-r.at<150),pool=recent.length?recent:fresh;
  pool.sort((a,b)=>b[1].quality-a[1].quality);
  const best=pool[0],current=pool.find(([c])=>c===this.active);
  const selected=current&&current[1].quality>=best[1].quality*.7?current:best;this.active=selected[0];
  const agreeing=fresh.filter(([,r])=>now-r.at<150&&Math.abs(r.opening-selected[1].opening)<.2);
  if(agreeing.length>1){
   const total=agreeing.reduce((s,[,r])=>s+Math.sqrt(Math.max(1,r.quality)),0);
   return {opening:agreeing.reduce((s,[,r])=>s+r.opening*Math.sqrt(Math.max(1,r.quality)),0)/total,cameras:agreeing.map(([c])=>c)};
  }
  return {opening:selected[1].opening,cameras:[selected[0]]};
 }
}
