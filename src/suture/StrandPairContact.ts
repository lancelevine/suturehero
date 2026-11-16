import * as THREE from 'three';
import type {ThreadStrand} from './ThreadStrand';
import {closestSegments} from './StrandContact';
import {THREAD_CONTACT_DISTANCE} from './threadMaterial';
/** Writes the box (min x,y,z, max x,y,z) around four points, grown by `pad`, at `out[at]`. */
function spanBox(out:Float64Array,at:number,p:THREE.Vector3,q:THREE.Vector3,r:THREE.Vector3,s:THREE.Vector3,pad:number){
  out[at]=Math.min(p.x,q.x,r.x,s.x)-pad;out[at+1]=Math.min(p.y,q.y,r.y,s.y)-pad;out[at+2]=Math.min(p.z,q.z,r.z,s.z)-pad;
  out[at+3]=Math.max(p.x,q.x,r.x,s.x)+pad;out[at+4]=Math.max(p.y,q.y,r.y,s.y)+pad;out[at+5]=Math.max(p.z,q.z,r.z,s.z)+pad;
}
/** Swept segment contact between the two exterior strands; not a knot solver. */
export function resolveStrandPair(a:ThreadStrand,b:ThreadStrand,pinsA:ReadonlyMap<number,THREE.Vector3>,pinsB:ReadonlyMap<number,THREE.Vector3>,startA?:readonly THREE.Vector3[],startB?:readonly THREE.Vector3[]) {
  const swept=!!(startA&&startB);startA??=a.points;startB??=b.points;
  const radius=THREAD_CONTACT_DISTANCE;
  // Swept boxes of b's segments (taken once, as before) and of each a segment, as flat numbers:
  // the same overlap tests as Box3.setFromPoints(...).expandByScalar + intersectsBox, without allocating.
  const boxes=new Float64Array((b.count-1)*6);
  for(let j=0;j<b.count-1;j++)spanBox(boxes,j*6,startB[j],startB[j+1],b.points[j],b.points[j+1],radius);
  const bounds=new Float64Array(6);
  for(let i=0;i<a.count-1;i++) {
    spanBox(bounds,0,startA[i],startA[i+1],a.points[i],a.points[i+1],radius);
    for(let j=0;j<b.count-1;j++) {
      const k=j*6;
      if(boxes[k+3]<bounds[0]||boxes[k]>bounds[3]||boxes[k+4]<bounds[1]||boxes[k+1]>bounds[4]||boxes[k+5]<bounds[2]||boxes[k+2]>bounds[5])continue;
      let hit=closestSegments(a.points[i],a.points[i+1],b.points[j],b.points[j+1]);
      let normal=hit.p.clone().sub(hit.q),distance=normal.length();
      if(swept){
      const old=closestSegments(startA[i],startA[i+1],startB[j],startB[j+1]);
      const oldNormal=old.p.clone().sub(old.q);
      if(oldNormal.length()>=radius && oldNormal.dot(normal)<=0) {
        const motion=Math.max(startA[i].distanceTo(a.points[i]),startA[i+1].distanceTo(a.points[i+1]))+Math.max(startB[j].distanceTo(b.points[j]),startB[j+1].distanceTo(b.points[j+1]));
        const samples=Math.min(32,Math.max(1,Math.ceil(motion/(radius*0.35))));
        for(let n=1;n<=samples;n++) {
          const t=n/samples,sweep=closestSegments(startA[i].clone().lerp(a.points[i],t),startA[i+1].clone().lerp(a.points[i+1],t),startB[j].clone().lerp(b.points[j],t),startB[j+1].clone().lerp(b.points[j+1],t));
          if(sweep.p.distanceTo(sweep.q)<radius) {
            hit={...sweep,p:a.points[i].clone().lerp(a.points[i+1],sweep.s),q:b.points[j].clone().lerp(b.points[j+1],sweep.t)};
            normal=oldNormal.normalize();distance=hit.p.clone().sub(hit.q).dot(normal);break;
          }
        }
      }
      }
      if(distance>=radius)continue;
      if(normal.lengthSq()<1e-12)normal.crossVectors(a.points[i+1].clone().sub(a.points[i]),b.points[j+1].clone().sub(b.points[j]));
      if(normal.lengthSq()<1e-12)normal.set(0,1,0);else normal.normalize();
      const weights=[1-hit.s,hit.s,-(1-hit.t),-hit.t],indices=[i,i+1,j,j+1];
      const fixed=[pinsA.has(i),pinsA.has(i+1),pinsB.has(j),pinsB.has(j+1)];
      const denominator=weights.reduce((sum,w,k)=>sum+(fixed[k]?0:w*w),0);if(denominator<1e-10)continue;
      for(let k=0;k<4;k++)if(!fixed[k]) {
        const strand=k<2?a:b,amount=THREE.MathUtils.clamp((radius-distance)*weights[k]/denominator,-0.04,0.04);
        strand.applyContactCorrection(indices[k],normal.clone().multiplyScalar(amount));
      }
    }
  }
}
