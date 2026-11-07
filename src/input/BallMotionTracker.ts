import {predictBall,type BallBlob,type BallMarker} from './ballPairTracking';
export class BallMotionTracker {
 private last:{ball:BallBlob;marker:BallMarker|null;at:number}|undefined;
 private velocity={x:0,y:0};private lostAt:number|undefined;
 private identity=false;private lastGlobal=-Infinity;private frameAt=-Infinity;private localAt=-Infinity;
 detection:BallBlob|null=null;
 shouldSearch(at:number){const interval=this.last&&at-this.last.at<650?70:220;if(at-this.localAt<interval)return false;this.localAt=at;return true;}
 current(at:number){return at-this.frameAt<220?this.detection:null;}
 beginFrame(at:number){if(this.frameAt!==at){this.frameAt=at;this.detection=null;}}
 plan(now:number,anchor:{x:number;y:number},marker:BallMarker|null,anchorMarker:BallMarker|null,fallbackRadius:number){
  const last=this.last,age=last?Math.max(0,now-last.at):Infinity,lost=Math.max(this.lostAt===undefined?0:Math.max(0,now-this.lostAt),last?Math.max(0,age-220):0);
  const base=last?.ball??anchor,from=last?.marker??anchorMarker;
  const mapped=marker&&from?predictBall(base,from,marker):base;
  const dt=last?Math.min(.35,age/1000):0;
  const center={x:mapped.x+this.velocity.x*dt,y:mapped.y+this.velocity.y*dt};
  const measured=last?Math.sqrt(last.ball.count/Math.PI)*(marker&&from?marker.side/from.side:1):fallbackRadius;
  const radius=last&&marker?measured*.7+fallbackRadius*.3:measured;
  return {center,ballRadius:radius,searchRadius:Math.max(12,radius*3)*Math.min(8,1+lost/220),
   lostMs:lost,silhouette:this.identity&&age<650,fullFrame:lost>1200&&now-this.lastGlobal>1000,stage:!last?'Searching':lost>0?'Predicted / searching':'Tracking'};
 }
 observe(ball:BallBlob,marker:BallMarker|null,at:number,identified=false){
  const previous=this.last;
  if(previous&&at>previous.at&&at-previous.at<500){
   const old=marker&&previous.marker?predictBall(previous.ball,previous.marker,marker):previous.ball,dt=(at-previous.at)/1000;
   const vx=(ball.x-old.x)/dt,vy=(ball.y-old.y)/dt;
   this.velocity.x=this.velocity.x*.4+vx*.6;this.velocity.y=this.velocity.y*.4+vy*.6;
  }else this.velocity={x:0,y:0};
  this.identity||=identified;this.last={ball:{...ball},marker:marker?{...marker}:null,at};this.detection=ball;this.lostAt=undefined;
 }
 miss(at:number){this.detection=null;this.lostAt??=at;}
 startGlobal(at:number){this.lastGlobal=at;}
 hint(ball:BallBlob,marker:BallMarker|null,at:number){this.observe(ball,marker,at,true);this.detection=null;this.lostAt=at;}
}
export function validJawBall(ball:BallBlob,marker:BallMarker|null,markerSizeMm:number,expectedRadius:number){
 const radius=Math.sqrt(ball.count/Math.PI);if(!Number.isFinite(radius)||radius<1.5||!Number.isFinite(ball.x)||!Number.isFinite(ball.y))return false;
 if(radius<expectedRadius*.5||radius>expectedRadius*1.9)return false;
 if(marker){const physical=marker.side*10/markerSizeMm/2;if(radius<physical*.5||radius>physical*1.9)return false;
  if(Math.hypot(ball.x-marker.x,ball.y-marker.y)>marker.side*(55/markerSizeMm+4))return false;
 }
 return true;
}
