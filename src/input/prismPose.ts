import * as THREE from 'three';
import type {MarkerObservation} from './arucoTracking';
import {estimateMarkerPose} from './markerPose';

// Each face is a 12 mm square tangent to a regular triangular prism.
// Local Y is the prism/shaft axis; all face marker tops point along +Y.
const SIDE=12;
const RADIUS=SIDE/(2*Math.tan(Math.PI/3));
const faceRotation=(index:number)=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),index*2*Math.PI/3);
export const localCorners=(index:number)=>{
 const q=faceRotation(index),s=SIDE/2;
 return [[-s,-s],[s,-s],[s,s],[-s,s]].map(([x,y])=>new THREE.Vector3(x,y,RADIUS).applyQuaternion(q));
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
 previous?:PrismPose, predicted?:PrismPose
):PrismPose|null{
 if(!markers.length||!width||!height)return null;
 const fx=width/(2*Math.tan(70*Math.PI/360/2)),cx=width/2,cy=height/2;
 const points=markers.flatMap(marker=>{
  const index=marker.id-firstId;
  if(index<0||index>2||marker.corners.length!==4)return [];
  return localCorners(index).map((p,i)=>({p,uv:marker.corners[i]}));
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
  const index=marker.id-firstId;if(index<0||index>2)continue;
  const pose=estimateMarkerPose(marker,width,height);
  if(!pose)continue;
  const q=pose.quaternion.clone().multiply(faceRotation(index).invert()).normalize();
  const t=pose.position.clone().sub(new THREE.Vector3(0,0,RADIUS).applyQuaternion(pose.quaternion));
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
