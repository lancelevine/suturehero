import * as THREE from 'three';
import { THREAD_CONTACT_DISTANCE } from './threadMaterial';
/** Closest points on finite segments, including parallel and degenerate cases. */
export interface SegmentHit {s:number;t:number;p:THREE.Vector3;q:THREE.Vector3}
export function closestSegments(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,d:THREE.Vector3,result:SegmentHit={s:0,t:0,p:new THREE.Vector3(),q:new THREE.Vector3()}) {
  const ax=b.x-a.x,ay=b.y-a.y,az=b.z-a.z,cx=d.x-c.x,cy=d.y-c.y,cz=d.z-c.z;
  const rx=a.x-c.x,ry=a.y-c.y,rz=a.z-c.z;
  const aa=ax*ax+ay*ay+az*az,ee=cx*cx+cy*cy+cz*cz,f=cx*rx+cy*ry+cz*rz;
  let s=0,t=0;
  if(aa<1e-12&&ee<1e-12){}
  else if(aa<1e-12)t=THREE.MathUtils.clamp(f/ee,0,1);
  else {
    const cc=ax*rx+ay*ry+az*rz;
    if(ee<1e-12)s=THREE.MathUtils.clamp(-cc/aa,0,1);
    else {
      const bb=ax*cx+ay*cy+az*cz,denom=aa*ee-bb*bb;
      if(denom>1e-12)s=THREE.MathUtils.clamp((bb*f-cc*ee)/denom,0,1);
      t=(bb*s+f)/ee;
      if(t<0){t=0;s=THREE.MathUtils.clamp(-cc/aa,0,1);}
      else if(t>1){t=1;s=THREE.MathUtils.clamp((bb-cc)/aa,0,1);}
    }
  }
  result.s=s;result.t=t;result.p.set(a.x+ax*s,a.y+ay*s,a.z+az*s);result.q.set(c.x+cx*t,c.y+cy*t,c.z+cz*t);
  return result;
}
/** Discrete segment self-contact. Adjacent segments are exempt from self-contact. */
export class StrandContact {
  constructor(private cellSize:number) {}
  private candidates(points:readonly THREE.Vector3[]) {
    const cells=new Map<string,number[]>(),pairs=new Set<number>(),count=points.length-1;
    const pad=THREAD_CONTACT_DISTANCE;
    for(let i=0;i<count;i++) {
      const a=points[i],b=points[i+1];
      const min=[Math.floor((Math.min(a.x,b.x)-pad)/this.cellSize),Math.floor((Math.min(a.y,b.y)-pad)/this.cellSize),Math.floor((Math.min(a.z,b.z)-pad)/this.cellSize)];
      const max=[Math.floor((Math.max(a.x,b.x)+pad)/this.cellSize),Math.floor((Math.max(a.y,b.y)+pad)/this.cellSize),Math.floor((Math.max(a.z,b.z)+pad)/this.cellSize)];
      if((max[0]-min[0]+1)*(max[1]-min[1]+1)*(max[2]-min[2]+1)>128) {
        // Large kinematic jumps must not create an unbounded spatial hash.
        const all:number[]=[];for(let u=0;u<count;u++)for(let v=u+2;v<count;v++)all.push(u*count+v);
        return all;
      }
      for(let x=min[0];x<=max[0];x++)for(let y=min[1];y<=max[1];y++)for(let z=min[2];z<=max[2];z++) {
        const key=`${x}:${y}:${z}`;let bucket=cells.get(key);
        if(!bucket){bucket=[];cells.set(key,bucket);}
        for(const j of bucket)if(i-j>1)pairs.add(j*count+i);
        bucket.push(i);
      }
    }
    return [...pairs].sort((a,b)=>a-b);
  }
  resolve(points:THREE.Vector3[],previous:THREE.Vector3[],pinned:ReadonlySet<number>) {
    const count=points.length-1;let contacts=0;
    for(const pair of this.candidates(points)) {
      const i=Math.floor(pair/count),j=pair%count;
      const result=closestSegments(points[i],points[i+1],points[j],points[j+1]);
      const normal=result.p.clone().sub(result.q),distance=normal.length();
      if(distance>=THREAD_CONTACT_DISTANCE)continue;
      if(distance>1e-8)normal.divideScalar(distance);
      else {
        normal.copy(previous[i]).lerp(previous[i+1],result.s).sub(previous[j].clone().lerp(previous[j+1],result.t));
        if(normal.lengthSq()<1e-12)normal.crossVectors(points[i+1].clone().sub(points[i]),points[j+1].clone().sub(points[j]));
        if(normal.lengthSq()<1e-12)normal.crossVectors(points[i+1].clone().sub(points[i]),new THREE.Vector3(0,1,0));
        if(normal.lengthSq()<1e-12)normal.set(1,0,0);
        normal.normalize();
      }
      const indices=[i,i+1,j,j+1],weights=[1-result.s,result.s,-(1-result.t),-result.t];
      const denominator=weights.reduce((sum,w,n)=>sum+(pinned.has(indices[n])?0:w*w),0);
      if(denominator<1e-12)continue;
      const amount=(THREAD_CONTACT_DISTANCE-distance)/denominator;
      for(let n=0;n<4;n++)if(!pinned.has(indices[n])) {
        // Near a pinned endpoint the effective mass can approach zero.
        // Bound each projection; incompatible fixed contacts remain unsatisfied.
        const correction=normal.clone().multiplyScalar(weights[n]*amount).clampLength(0,THREAD_CONTACT_DISTANCE);
        points[indices[n]].add(correction);
        // Contact projection should not inject a spurious velocity impulse.
        previous[indices[n]].add(correction);
      }
      contacts++;
    }
    return contacts;
  }
}
