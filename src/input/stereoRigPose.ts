import {Matrix4,Quaternion,Vector3} from 'three';
import {undistort,type StereoCalibration} from './stereoGeometry';
import {bodyPoseFromMarker,linearSolve,localCorners,trackerGeometry,type TrackerType} from './prismPose';
import {estimateMarkerPose} from './markerPose';
import type {MarkerObservation} from './arucoTracking';
type Pose={quaternion:Quaternion;translation:Vector3};
type Size={width:number;height:number};
type Point={local:Vector3;x:number;y:number;fx:number;fy:number;camera:0|1;id:number};
export type StereoRigPose=Pose&{errorPx:number;faces:number;corners:number;firstIds:number[];secondIds:number[]};
/** Joint calibrated reprojection fit. Different cameras need not see the same
 * face: localCorners supplies the known rigid relationship between every ID. */
export function solveStereoRigPose(cal:StereoCalibration,first:MarkerObservation[],second:MarkerObservation[],size1:Size,size2:Size,firstId:number,type:TrackerType,previous?:Pose):StereoRigPose|null{
 if(![size1.width,size1.height,size2.width,size2.height].every(v=>Number.isFinite(v)&&v>0))return null;
 const R=cal.stereo.rotation,T=cal.stereo.translationMm;
 const extrinsic=new Quaternion().setFromRotationMatrix(new Matrix4().set(...[...R[0],0,...R[1],0,...R[2],0,0,0,0,1] as [number,number,number,number,number,number,number,number,number,number,number,number,number,number,number,number]));
 const inverse=extrinsic.clone().invert(),translation2=new Vector3(...T as [number,number,number]);
 const points:Point[]=[],seeds:Pose[]=[];
 if(previous)seeds.push({quaternion:previous.quaternion.clone(),translation:previous.translation.clone()});
 for(const [camera,markers,size] of [[0,first,size1],[1,second,size2]] as const){
  const intrinsic=camera?cal.camera2:cal.camera1,k=intrinsic.cameraMatrix,source=intrinsic.imageSize??cal.imageSize;
  const fx=k[0][0]*size.width/source.width,fy=k[1][1]*size.height/source.height,seen=new Set<number>();
  for(const marker of markers){
   const face=marker.id-firstId;
   if(seen.has(marker.id)||face<0||face>=trackerGeometry(type).faceCount||marker.corners.length!==4||marker.corners.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))continue;
   const area=Math.abs(marker.corners.reduce((s,p,i)=>{const n=marker.corners[(i+1)%4];return s+p.x*n.y-n.x*p.y;},0))/2;
   if(area<16)continue;seen.add(marker.id);
   const normalized=marker.corners.map(p=>undistort(p,k,intrinsic.distortionCoefficients,source,size));
   const local=localCorners(face,type);
   normalized.forEach((p,i)=>points.push({local:local[i],x:p[0],y:p[1],fx,fy,camera,id:marker.id}));
   const mono=estimateMarkerPose({id:marker.id,corners:normalized.map(p=>({x:1000+p[0]*1000,y:1000+p[1]*1000}))},2000,2000,trackerGeometry(type).markerSizeMm,1000);
   if(!mono)continue;
   const pose=bodyPoseFromMarker(mono,face,type);
   if(camera){pose.translation.sub(translation2).applyQuaternion(inverse);pose.quaternion.premultiply(inverse);}
   if(!seeds.some(s=>s.quaternion.angleTo(pose.quaternion)<.08&&s.translation.distanceTo(pose.translation)<8))seeds.push(pose);
  }
 }
 if(!points.some(p=>p.camera===0)||!points.some(p=>p.camera===1)||!seeds.length)return null;
 function evaluate(pose:Pose,list:Point[],jacobian=false){
  const e=new Matrix4().makeRotationFromQuaternion(pose.quaternion).elements;
  const A=Array.from({length:6},()=>Array(6).fill(0)),b=Array(6).fill(0),errors:number[]=[];
  let cost=0;
  for(const p of list){
   const l=p.local,vx=e[0]*l.x+e[4]*l.y+e[8]*l.z,vy=e[1]*l.x+e[5]*l.y+e[9]*l.z,vz=e[2]*l.x+e[6]*l.y+e[10]*l.z;
   const wx=vx+pose.translation.x,wy=vy+pose.translation.y,wz=vz+pose.translation.z;
   const x=p.camera?R[0][0]*wx+R[0][1]*wy+R[0][2]*wz+T[0]:wx;
   const y=p.camera?R[1][0]*wx+R[1][1]*wy+R[1][2]*wz+T[1]:wy;
   const z=p.camera?R[2][0]*wx+R[2][1]*wy+R[2][2]*wz+T[2]:wz;
   if(z<30||z>3000||![x,y,z].every(Number.isFinite))return null;
   const residual=[p.fx*(x/z-p.x),p.fy*(y/z-p.y)],error=Math.hypot(...residual),weight=Math.min(1,2.5/Math.max(.001,error));
   errors.push(error);cost+=error<=2.5?error*error:5*error-6.25;
   if(!jacobian)continue;
   for(let row=0;row<2;row++){
    const g=row===0?[p.fx/z,0,-p.fx*x/(z*z)]:[0,p.fy/z,-p.fy*y/(z*z)];
    const world=p.camera?[0,1,2].map(i=>g[0]*R[0][i]+g[1]*R[1][i]+g[2]*R[2][i]):g;
    const [gx,gy,gz]=world,J=[-gy*vz+gz*vy,gx*vz-gz*vx,-gx*vy+gy*vx,gx,gy,gz];
    for(let i=0;i<6;i++){b[i]-=weight*J[i]*residual[row];for(let j=0;j<6;j++)A[i][j]+=weight*J[i]*J[j];}
   }
  }
  return {A,b,cost,errors};
 }
 function optimize(seed:Pose,list:Point[]){
  let pose={quaternion:seed.quaternion.clone(),translation:seed.translation.clone()},lambda=.001;
  for(let iteration=0;iteration<14;iteration++){
   const value=evaluate(pose,list,true);if(!value)return null;
   for(let i=0;i<6;i++)value.A[i][i]+=lambda*(value.A[i][i]+1e-6);
   const delta=linearSolve(value.A,value.b);if(!delta||!delta.every(Number.isFinite))return null;
   const axis=new Vector3(delta[0],delta[1],delta[2]),angle=axis.length(),shift=new Vector3(delta[3],delta[4],delta[5]);
   if(angle<1e-6&&shift.length()<1e-4)break;
   const scale=Math.min(1,.6/Math.max(angle,1e-9),250/Math.max(shift.length(),1e-9));
   const next={quaternion:pose.quaternion.clone(),translation:pose.translation.clone().addScaledVector(shift,scale)};
   if(angle>1e-12)next.quaternion.premultiply(new Quaternion().setFromAxisAngle(axis.multiplyScalar(1/angle),angle*scale)).normalize();
   const candidate=evaluate(next,list);
   if(candidate&&candidate.cost<value.cost){pose=next;lambda=Math.max(1e-7,lambda*.3);if(angle<1e-6&&shift.length()<1e-4)break;}
   else lambda=Math.min(1e6,lambda*10);
  }
  const value=evaluate(pose,list);return value?{pose,...value}:null;
 }
 let best:NonNullable<ReturnType<typeof optimize>>|null=null;
 for(const seed of seeds.slice(0,7)){
  const fit=optimize(seed,points);if(fit&&(!best||fit.cost<best.cost))best=fit;
 }
 if(!best)return null;
 // A bad extra face may be dropped only if another face in that same camera
 // still constrains the body. Never relabel a one-camera fit as stereo.
 const groups=new Map<string,{sum:number;count:number}>();
 points.forEach((p,i)=>{const key=`${p.camera}:${p.id}`,g=groups.get(key)??{sum:0,count:0};g.sum+=best!.errors[i]**2;g.count++;groups.set(key,g);});
 let selected=points;
 const good=new Set([...groups].filter(([,g])=>Math.sqrt(g.sum/g.count)<3.5).map(([key])=>key));
 const filtered=points.filter(p=>good.has(`${p.camera}:${p.id}`));
 if(filtered.length<points.length&&filtered.some(p=>p.camera===0)&&filtered.some(p=>p.camera===1)){
  const fit=optimize(best.pose,filtered);if(fit){best=fit;selected=filtered;}
 }
 const rms=Math.sqrt(best.errors.reduce((s,e)=>s+e*e,0)/selected.length);
 if(rms>3||Math.max(...best.errors)>6)return null;
 for(const camera of [0,1]){
  const values=selected.flatMap((p,i)=>p.camera===camera?[best!.errors[i]]:[]);
  if(values.length<4||Math.sqrt(values.reduce((s,e)=>s+e*e,0)/values.length)>3)return null;
 }
 const firstIds=[...new Set(selected.filter(p=>p.camera===0).map(p=>p.id))],secondIds=[...new Set(selected.filter(p=>p.camera===1).map(p=>p.id))];
 return {...best.pose,errorPx:rms,faces:new Set([...firstIds,...secondIds]).size,corners:selected.length,firstIds,secondIds};
}
