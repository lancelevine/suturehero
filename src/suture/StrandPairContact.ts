import * as THREE from 'three';
import type {ThreadStrand} from './ThreadStrand';
import {closestSegments} from './StrandContact';
import {THREAD_CONTACT_DISTANCE} from './threadMaterial';
/** Swept segment contact between the two exterior strands; not a knot solver. */
export function resolveStrandPair(a:ThreadStrand,b:ThreadStrand,pinsA:ReadonlyMap<number,THREE.Vector3>,pinsB:ReadonlyMap<number,THREE.Vector3>,startA:readonly THREE.Vector3[],startB:readonly THREE.Vector3[]) {
  const radius=THREAD_CONTACT_DISTANCE;
  const boxes=b.points.slice(1).map((p,i)=>new THREE.Box3().setFromPoints([startB[i],startB[i+1],b.points[i],p]).expandByScalar(radius));
  const bounds=new THREE.Box3();
  for(let i=0;i<a.count-1;i++) {
    bounds.setFromPoints([startA[i],startA[i+1],a.points[i],a.points[i+1]]).expandByScalar(radius);
    for(let j=0;j<b.count-1;j++) {
      if(!bounds.intersectsBox(boxes[j]))continue;
      let hit=closestSegments(a.points[i],a.points[i+1],b.points[j],b.points[j+1]);
      const old=closestSegments(startA[i],startA[i+1],startB[j],startB[j+1]);
      const oldNormal=old.p.clone().sub(old.q);let normal=hit.p.clone().sub(hit.q),distance=normal.length();
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
