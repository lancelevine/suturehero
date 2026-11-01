import * as THREE from 'three';
import type {MarkerObservation} from './arucoTracking';
import {estimateMarkerPose} from './markerPose';

// The legacy prism has 12 mm faces; both hexagonal rings have 19 mm faces.
// Local Y is the instrument shaft axis, with marker tops aligned along +Y.
const PRISM_SIDE_MM=12;
const RING_SIDE_MM=19;
// 19 mm printed face, 16 mm outer marker square.
const RING_MARKER_MM=16;
export type TrackerType='prism'|'ring6'|'ring8';
export const trackerGeometry=(type:TrackerType)=>({faceCount:type==='ring8'?8:type==='ring6'?6:3,sideStepRadians:type==='prism'?2*Math.PI/3:Math.PI/3,markerSizeMm:type==='prism'?PRISM_SIDE_MM:RING_MARKER_MM});
const ringRadius=RING_SIDE_MM/(2*Math.tan(Math.PI/6));
const prismRadius=PRISM_SIDE_MM/(2*Math.tan(Math.PI/3));
export function faceGeometry(index:number,type:TrackerType='prism'){
 const ring=type==='ring8'||type==='ring6';
 // IDs 0–5 wrap around the ring. IDs 6 and 7 are opposite each
 // other circumferentially (0° and 180°), both on the tip-facing end.
 const angle=ring?(index<6?index*trackerGeometry(type).sideStepRadians:(index===6?0:Math.PI)):index*trackerGeometry(type).sideStepRadians;
 const radius=ring?ringRadius:prismRadius;
 const yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle);
 const q=yaw.clone();
 // Both inclined faces lean toward the tip (+Y in the mount frame).
 if(ring&&index>=6)q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/6));
 const center=new THREE.Vector3(0,ring&&index>=6?RING_SIDE_MM:0,radius).applyQuaternion(yaw);
 return {rotation:q,center};
}
export const localCorners=(index:number,type:TrackerType='prism')=>{
 const {rotation,center}=faceGeometry(index,type),s=trackerGeometry(type).markerSizeMm/2;
 return [[-s,-s],[s,-s],[s,s],[-s,s]].map(([x,y])=>new THREE.Vector3(x,y,0).applyQuaternion(rotation).add(center));
};
export interface PrismPose {quaternion:THREE.Quaternion;translation:THREE.Vector3;error:number;faces:number}
function linearSolve(A:number[][],b:number[]):number[]|null{
 const n=b.length,rows=A.map((r,i)=>[...r,b[i]]);
 for(let i=0;i<n;i++){
  let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(rows[j][i])>Math.abs(rows[pivot][i]))pivot=j;
  if(Math.abs(rows[pivot][i])<1e-12)return null;
  [rows[i],rows[pivot]]=[rows[pivot],rows[i]];
  const d=rows[i][i];for(let k=i;k<=n;k++)rows[i][k]/=d;
  for(let j=0;j<n;j++)if(j!==i){const m=rows[j][i];for(let k=i;k<=n;k++)rows[j][k]-=m*rows[i][k];}
 }
 return rows.map(r=>r[n]);
}
export function solvePrismPose(
 markers:MarkerObservation[],firstId:number,width:number,height:number,
 previous?:PrismPose, predicted?:PrismPose, trackerType:TrackerType='prism'
):PrismPose|null{
 if(!markers.length||!width||!height)return null;
 const fx=width/(2*Math.tan(70*Math.PI/360/2)),cx=width/2,cy=height/2;
 const points=markers.flatMap(marker=>{
  const index=marker.id-firstId;
  if(index<0||index>=trackerGeometry(trackerType).faceCount||marker.corners.length!==4)return [];
  return localCorners(index,trackerType).map((p,i)=>({p,uv:marker.corners[i]}));
 });
 if(points.length<4)return null;
 const residual=(q:THREE.Quaternion,t:THREE.Vector3)=>{
  const out:number[]=[];
  for(const {p,uv} of points){
   const v=p.clone().applyQuaternion(q).add(t);
   if(v.z<=1)return null;
   out.push((fx*v.x/v.z+cx-uv.x),(fx*v.y/v.z+cy-uv.y));
  }
  return out;
 };
 const apply=(q:THREE.Quaternion,t:THREE.Vector3,d:number[])=>{
  const dq=new THREE.Quaternion().setFromEuler(new THREE.Euler(d[0],d[1],d[2],'XYZ'));
  return {q:q.clone().premultiply(dq).normalize(),t:t.clone().add(new THREE.Vector3(d[3],d[4],d[5]))};
 };
 const seeds:Array<{q:THREE.Quaternion;t:THREE.Vector3}>=[];
 if(predicted)seeds.push({q:predicted.quaternion.clone(),t:predicted.translation.clone()});
 if(previous)seeds.push({q:previous.quaternion.clone(),t:previous.translation.clone()});
 for(const marker of markers){
  const index=marker.id-firstId;if(index<0||index>=trackerGeometry(trackerType).faceCount)continue;
  const pose=estimateMarkerPose(marker,width,height,trackerGeometry(trackerType).markerSizeMm);
  if(!pose)continue;
  const geometry=faceGeometry(index,trackerType);
  const q=pose.quaternion.clone().multiply(geometry.rotation.clone().invert()).normalize();
  const t=pose.position.clone().sub(geometry.center.clone().applyQuaternion(q));
  seeds.push({q,t});
 }
 let best:PrismPose|null=null,bestScore=Infinity;
 for(const seed of seeds){
  let q=seed.q,t=seed.t,lambda=.01;
  for(let iteration=0;iteration<10;iteration++){
   const r=residual(q,t);if(!r)break;
   const J:number[][]=Array.from({length:r.length},()=>Array(6).fill(0));
   for(let k=0;k<6;k++){
    const step=k<3?1e-4:.03,d=Array(6).fill(0);d[k]=step;
    const moved=apply(q,t,d),rr=residual(moved.q,moved.t);
    if(!rr)continue;
    for(let j=0;j<r.length;j++)J[j][k]=(rr[j]-r[j])/step;
   }
   const A=Array.from({length:6},()=>Array(6).fill(0)),b=Array(6).fill(0);
   for(let j=0;j<r.length;j++)for(let k=0;k<6;k++){
    b[k]-=J[j][k]*r[j];
    for(let l=0;l<6;l++)A[k][l]+=J[j][k]*J[j][l];
   }
   for(let k=0;k<6;k++)A[k][k]+=lambda;
   const delta=linearSolve(A,b);if(!delta)break;
   const next=apply(q,t,delta),nr=residual(next.q,next.t);
   if(nr&&nr.reduce((sum,x)=>sum+x*x,0)<r.reduce((sum,x)=>sum+x*x,0)){
    q=next.q;t=next.t;lambda=Math.max(.0001,lambda*.5);
   }else lambda=Math.min(100,lambda*5);
  }
  const r=residual(q,t);if(!r)continue;
  const error=Math.sqrt(r.reduce((sum,x)=>sum+x*x,0)/points.length);
  // Prefer the motion-predicted hypothesis only when image evidence remains competitive.
  const reference=predicted??previous;
  const continuity=reference?q.angleTo(reference.quaternion):0;
  const score=error+(reference?continuity*2.5:0);
  if(score<bestScore){bestScore=score;best={quaternion:q,translation:t,error,faces:markers.length};}
 }
 return best&&best.error<18?best:null;
}
