import * as THREE from 'three';
import type {MarkerObservation} from './arucoTracking';

/** Approximate monocular planar pose; camera intrinsics must be calibrated for metric accuracy. */
export interface MarkerPose {id:number;position:THREE.Vector3;quaternion:THREE.Quaternion;reprojectionError:number}
function solve(a:number[][],b:number[]):number[]|null{
 const n=b.length,rows=a.map((r,i)=>[...r,b[i]]);
 for(let i=0;i<n;i++){let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(rows[j][i])>Math.abs(rows[pivot][i]))pivot=j;
  if(Math.abs(rows[pivot][i])<1e-10)return null;
  [rows[i],rows[pivot]]=[rows[pivot],rows[i]];
  const s=rows[i][i];for(let k=i;k<=n;k++)rows[i][k]/=s;
  for(let j=0;j<n;j++)if(j!==i){const f=rows[j][i];for(let k=i;k<=n;k++)rows[j][k]-=f*rows[i][k];}
 }
 return rows.map(r=>r[n]);
}
export function estimateMarkerPose(marker:MarkerObservation,width:number,height:number,markerSizeMm=12,focalPx?:number):MarkerPose|null{
 if(marker.corners.length!==4||width<=0||height<=0)return null;
 // 70 degree horizontal field of view is a provisional default, not camera calibration.
 const fx=focalPx??width/(2*Math.tan(70*Math.PI/360/2)),fy=fx,cx=width/2,cy=height/2;
 const s=markerSizeMm/2,world=[[-s,-s],[s,-s],[s,s],[-s,s]];
 const A:number[][]=[],B:number[]=[];
 for(let i=0;i<4;i++){
  const [X,Y]=world[i],u=(marker.corners[i].x-cx)/fx,v=(marker.corners[i].y-cy)/fy;
  A.push([X,Y,1,0,0,0,-u*X,-u*Y]);B.push(u);
  A.push([0,0,0,X,Y,1,-v*X,-v*Y]);B.push(v);
 }
 const h=solve(A,B);if(!h)return null;
 let r1=new THREE.Vector3(h[0],h[3],h[6]),r2=new THREE.Vector3(h[1],h[4],h[7]),t=new THREE.Vector3(h[2],h[5],1);
 const norm=(r1.length()+r2.length())/2;if(norm<1e-9)return null;
 const sign=t.z<0?-1:1;r1.multiplyScalar(sign/norm);r2.multiplyScalar(sign/norm);t.multiplyScalar(sign/norm);
 r1.normalize();r2.addScaledVector(r1,-r2.dot(r1)).normalize();
 const r3=new THREE.Vector3().crossVectors(r1,r2).normalize();
 const rot=new THREE.Matrix4().makeBasis(r1,r2,r3);
 const q=new THREE.Quaternion().setFromRotationMatrix(rot);
 let error=0;
 for(let i=0;i<4;i++){const p=new THREE.Vector3(world[i][0],world[i][1],0).applyQuaternion(q).add(t);
  if(p.z<=0)return null;
  const u=fx*p.x/p.z+cx,v=fy*p.y/p.z+cy;
  error+=Math.hypot(u-marker.corners[i].x,v-marker.corners[i].y);
 }
 return {id:marker.id,position:t,quaternion:q,reprojectionError:error/4};
}
