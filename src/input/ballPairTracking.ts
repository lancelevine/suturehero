/** Image-space association for two equal-sized colored jaw balls. Units are camera pixels. */
export interface BallBlob {x:number;y:number;count:number;score:number}
export interface BallMarker {x:number;y:number;side:number}
export interface BallPairReference {separation:number;reach:number}
export interface BallPairLimits {closed:number|null;open:number|null;reference:BallPairReference;trackerToTipMm:number|null}
export const ballRadius=(ball:Pick<BallBlob,'count'>)=>Math.sqrt(ball.count/Math.PI);
export function normalizedBallSeparation(a:BallBlob,b:BallBlob){return Math.hypot(a.x-b.x,a.y-b.y)/(ballRadius(a)+ballRadius(b));}
export function ballPairReference(a:{x:number;y:number},b:{x:number;y:number},marker:BallMarker):BallPairReference{
 return {separation:Math.hypot(a.x-b.x,a.y-b.y)/marker.side,reach:Math.hypot((a.x+b.x)/2-marker.x,(a.y+b.y)/2-marker.y)/marker.side};
}
export function predictBall(point:{x:number;y:number},from:BallMarker,to:BallMarker){
 const scale=to.side/from.side;return {x:to.x+(point.x-from.x)*scale,y:to.y+(point.y-from.y)*scale};
}
export function sampledBallColor(rgb:readonly number[]){return `rgb(${rgb.map(v=>Math.round(Math.max(0,Math.min(255,v)))).join(', ')})`;}
/** Reject unrelated color blobs before either centroid or jaw calibration can be updated. */
export function selectBallPair(as:readonly BallBlob[],bs:readonly BallBlob[],marker:BallMarker,limits:BallPairLimits){
 if(!Number.isFinite(marker.side)||marker.side<=0)return null;
 let best:{a:BallBlob;b:BallBlob;separation:number;score:number}|null=null;
 const calibrated=limits.closed!==null&&limits.open!==null;
 const maxReach=limits.trackerToTipMm===null?Math.max(3,limits.reference.reach*1.6+2):limits.trackerToTipMm/12+3;
 for(const a of as)for(const b of bs){
  const ra=ballRadius(a),rb=ballRadius(b),distance=Math.hypot(a.x-b.x,a.y-b.y);
  if(Math.max(ra,rb)/Math.min(ra,rb)>2.5)continue;
  // A 7 mm ball next to a 12 mm marker must have a plausible apparent size.
  if([ra,rb].some(r=>2*r/marker.side<.15||2*r/marker.side>1.4))continue;
  const separation=distance/(ra+rb);
  const maxDistance=calibrated?(Math.max(limits.closed!,limits.open!)*1.4+.5)*(ra+rb):Math.min(6,Math.max(2.5,limits.reference.separation*3+.6))*marker.side;
  if(separation<.45||distance>maxDistance)continue;
  if([a,b].some(p=>Math.hypot(p.x-marker.x,p.y-marker.y)>maxReach*marker.side+maxDistance/2))continue;
  const reach=Math.hypot((a.x+b.x)/2-marker.x,(a.y+b.y)/2-marker.y)/marker.side;
  if(reach>maxReach)continue;
  const score=a.score+b.score-Math.abs(reach-limits.reference.reach)*.5-Math.abs(Math.log(ra/rb))*2;
  if(!best||score>best.score)best={a,b,separation,score};
 }
 return best;
}
