export type Corner={x:number;y:number};
export type BoardMeasurement={width:number;height:number;corners:Corner[];contrast:number;focus:number};
export type BoardDescriptor={cx:number;cy:number;span:number;roll:number;tiltX:number;tiltY:number;cellPx:number;marginPx:number;contrast:number;focus:number};
export type CapturePose={first:BoardDescriptor;second:BoardDescriptor};
const distance=(a:Corner,b:Corner)=>Math.hypot(a.x-b.x,a.y-b.y);
export function describeBoard(m:BoardMeasurement):{quality:BoardDescriptor|null;reasons:string[]}{
 if(m.corners.length!==48||m.corners.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return {quality:null,reasons:['Find all 48 inner corners']};
 const points=m.corners.map(p=>({...p}));if(points[7].x<points[0].x)points.reverse();
 const top=distance(points[0],points[7]),bottom=distance(points[40],points[47]),left=distance(points[0],points[40]),right=distance(points[7],points[47]);
 const cells:number[]=[];
 for(let y=0;y<6;y++)for(let x=0;x<8;x++){if(x<7)cells.push(distance(points[y*8+x],points[y*8+x+1]));if(y<5)cells.push(distance(points[y*8+x],points[(y+1)*8+x]));}
 const cellPx=Math.min(...cells);
 // Extrapolate one outer square beyond each inner corner. Require a full
 // square of board boundary, with a small image margin, in both views.
 const outer=[
  {x:3*points[0].x-points[1].x-points[8].x,y:3*points[0].y-points[1].y-points[8].y},
  {x:3*points[7].x-points[6].x-points[15].x,y:3*points[7].y-points[6].y-points[15].y},
  {x:3*points[47].x-points[46].x-points[39].x,y:3*points[47].y-points[46].y-points[39].y},
  {x:3*points[40].x-points[41].x-points[32].x,y:3*points[40].y-points[41].y-points[32].y}
 ];
 const marginPx=Math.min(...outer.flatMap(p=>[p.x,p.y,m.width-p.x,m.height-p.y]));
 const quality:BoardDescriptor={cx:points.reduce((s,p)=>s+p.x,0)/48/m.width,cy:points.reduce((s,p)=>s+p.y,0)/48/m.height,
  span:(top+bottom)/2/m.width,roll:Math.atan2(points[7].y-points[0].y,points[7].x-points[0].x),
  tiltX:Math.log(Math.max(.001,top)/Math.max(.001,bottom)),tiltY:Math.log(Math.max(.001,left)/Math.max(.001,right)),cellPx,marginPx,contrast:m.contrast,focus:m.focus};
 const reasons:string[]=[];
 if(cellPx<8)reasons.push('Move board closer (squares too small)');
 if(marginPx<5)reasons.push('Keep the whole board inside the image');
 if(!Number.isFinite(m.contrast)||m.contrast<60)reasons.push('Increase board contrast / adjust exposure');
 if(!Number.isFinite(m.focus)||m.focus<.08)reasons.push('Board is blurred; focus and hold still');
 return {quality,reasons};
}
export function boardMotion(a:BoardMeasurement,b:BoardMeasurement){
 if(a.width!==b.width||a.height!==b.height||a.corners.length!==48||b.corners.length!==48)return Infinity;
 return Math.min(...[false,true].map(reverse=>Math.sqrt(a.corners.reduce((s,p,i)=>s+distance(p,b.corners[reverse?47-i:i])**2,0)/48)));
}
const rollDistance=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(2*(a-b)),Math.cos(2*(a-b)))/2);
function poseDistance(a:BoardDescriptor,b:BoardDescriptor){
 return Math.sqrt(((a.cx-b.cx)/.045)**2+((a.cy-b.cy)/.045)**2+(Math.log(a.span/b.span)/.12)**2+(rollDistance(a.roll,b.roll)/.15)**2+((a.tiltX-b.tiltX)/.08)**2+((a.tiltY-b.tiltY)/.08)**2);
}
export function duplicatePose(pose:CapturePose,previous:readonly CapturePose[]){return previous.some(p=>Math.max(poseDistance(pose.first,p.first),poseDistance(pose.second,p.second))<1);}
const range=(values:number[])=>values.length?Math.max(...values)-Math.min(...values):0;
export function captureCoverage(poses:readonly CapturePose[]){
 const missing:string[]=[];
 if(poses.length<20)missing.push(`${20-poses.length} more good pairs`);
 for(const view of ['first','second'] as const){
  const q=poses.map(p=>p[view]),label=view==='first'?'Camera 1':'Camera 2';
  if(range(q.map(p=>p.cx))<.25)missing.push(`${label}: move board left / right`);
  if(range(q.map(p=>p.cy))<.20)missing.push(`${label}: move board up / down`);
  if(!q.length||Math.max(...q.map(p=>p.span))/Math.max(.001,Math.min(...q.map(p=>p.span)))<1.3)missing.push(`${label}: vary distance`);
  if(range(q.map(p=>p.tiltX))<.08)missing.push(`${label}: tilt top / bottom toward camera`);
  if(range(q.map(p=>p.tiltY))<.08)missing.push(`${label}: tilt left / right toward camera`);
 }
 return {complete:missing.length===0,missing};
}
export function pairCaptureDecision(first:BoardMeasurement,second:BoardMeasurement,previous:readonly CapturePose[],stableMs:number,frameSkewMs:number|null){
 const a=describeBoard(first),b=describeBoard(second);
 const reasons=[...a.reasons.map(r=>'Camera 1: '+r),...b.reasons.map(r=>'Camera 2: '+r)];
 // Browser presentation timestamps are not hardware synchronization. When the board
 // has remained stationary, modest skew (or unavailable callbacks) is safe enough
 // for a calibration pair; don't block capture indefinitely on webcam scheduling.
 const skewUsable=frameSkewMs!==null&&Number.isFinite(frameSkewMs)&&frameSkewMs>=0&&frameSkewMs<=50;
 const stationaryFallback=stableMs>=1000&&(frameSkewMs===null||(Number.isFinite(frameSkewMs)&&frameSkewMs>=0&&frameSkewMs<=250));
 if(!skewUsable&&!stationaryFallback)reasons.push('Hold board still for camera timing');
 if(!Number.isFinite(stableMs)||stableMs<550)reasons.push('Hold board still briefly');
 const pose=a.quality&&b.quality?{first:a.quality,second:b.quality}:null;
 if(pose&&duplicatePose(pose,previous))reasons.push('Pose already captured; change position, distance, or tilt');
 return {accepted:reasons.length===0&&!!pose,reasons,pose};
}
