import type {MarkerObservation} from './arucoTracking';
import {Vector3} from 'three';
/** Weak-perspective square projection: principal scales are size and size*cos(tilt).
 * Use the larger singular value directly instead of dividing noisy area by cosine. */
export function tiltCorrectedSize(marker:MarkerObservation,width:number,height=width*9/16,focal=width/(2*Math.tan(70*Math.PI/360/2))){
 const original=marker.corners;if(original.length!==4||width<=0||height<=0||original.some(q=>!Number.isFinite(q.x)||!Number.isFinite(q.y)))return null;
 // Recenter the view ray before measuring foreshortening, so lateral motion
 // does not masquerade as depth. Return to axial camera depth afterward.
 const ray=(p:{x:number;y:number})=>new Vector3((p.x-width/2)/focal,(p.y-height/2)/focal,1);
 const center=original.reduce<Vector3>((v,p)=>v.add(ray(p)),new Vector3()).normalize();
 const xAxis=new Vector3(center.z,0,-center.x).normalize(),yAxis=new Vector3().crossVectors(center,xAxis);
 const p=original.map(p=>{const v=ray(p),z=v.dot(center);return {x:focal*v.dot(xAxis)/z,y:focal*v.dot(yAxis)/z};});
 const crosses=p.map((a,i)=>{const b=p[(i+1)%4],c=p[(i+2)%4];return (b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);});
 if(crosses.some(c=>Math.abs(c)<1e-6)||crosses.some(c=>Math.sign(c)!==Math.sign(crosses[0])))return null;
 const ux=((p[1].x-p[0].x)+(p[2].x-p[3].x))/2,uy=((p[1].y-p[0].y)+(p[2].y-p[3].y))/2;
 const vx=((p[3].x-p[0].x)+(p[2].x-p[1].x))/2,vy=((p[3].y-p[0].y)+(p[2].y-p[1].y))/2;
 const a=ux*ux+uy*uy,b=ux*vx+uy*vy,c=vx*vx+vy*vy;
 const major=(a+c+Math.hypot(a-c,2*b))/2,minor=Math.max(0,(a*c-b*b)/major);
 const sidePx=Math.sqrt(major),cosine=Math.sqrt(minor/major);
 if(!Number.isFinite(sidePx)||sidePx<8||cosine<.4)return null;
 const edges=p.map((q,i)=>Math.hypot(q.x-p[(i+1)%4].x,q.y-p[(i+1)%4].y));
 if(Math.max(edges[0]/edges[2],edges[2]/edges[0],edges[1]/edges[3],edges[3]/edges[1])>1.6)return null;
 const axialSide=sidePx/center.z;
 return {sidePx:axialSide,normalizedSide:axialSide/width,cosine,tiltDegrees:Math.acos(Math.min(1,cosine))*180/Math.PI};
}
export interface SizeDepthAnchor {proxy:number;normalizedSide:number;binding:string;instrument:string}
/** Near/Far interpolate inverse corrected size, not apparent size linearly. */
export class SizeDepthCalibration {
 near:SizeDepthAnchor|null=null;far:SizeDepthAnchor|null=null;
 setNear(sample:SizeDepthAnchor){this.near={...sample};this.far=null;}
 setFar(sample:SizeDepthAnchor){
  if(!Number.isFinite(sample.proxy)||sample.proxy<=0||!Number.isFinite(sample.normalizedSide)||sample.normalizedSide<=0)return false;
  if(!this.near||sample.binding!==this.near.binding||sample.instrument!==this.near.instrument)return false;
  if(sample.proxy<=this.near.proxy*1.05)return false;
  this.far={...sample};return true;
 }
 fraction(proxy:number,binding:string){return this.near&&this.far&&this.near.binding===binding?(proxy-this.near.proxy)/(this.far.proxy-this.near.proxy):null;}
 restore(value:unknown){
  const v=value as {near?:SizeDepthAnchor;far?:SizeDepthAnchor}|null;
  const valid=(a:SizeDepthAnchor|undefined)=>!!a&&Number.isFinite(a.proxy)&&a.proxy>0&&Number.isFinite(a.normalizedSide)&&a.normalizedSide>0&&typeof a.binding==='string'&&typeof a.instrument==='string';
  if(!v||!valid(v.near))return false;
  if(v.far&&!valid(v.far))return false;
  const candidate=new SizeDepthCalibration();candidate.setNear(v.near!);if(v.far&&!candidate.setFar(v.far))return false;
  this.near=candidate.near;this.far=candidate.far;return true;
 }
}
