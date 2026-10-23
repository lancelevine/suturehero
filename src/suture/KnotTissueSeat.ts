import * as THREE from 'three';
import type {FreeThrow} from './FreeThrow';
import type {ThreadStrand} from './ThreadStrand';
type SeatKnot=Pick<FreeThrow,'active'|'phase'|'first'|'last'|'shortMaterialCoordinate'>;

/** Local support across the stitch portals, including the narrow open seam.
 * Away from this stitch, keep the environment's own surface geometry. */
export function stitchSupport(point:THREE.Vector3,entry:THREE.Vector3,exit:THREE.Vector3,surfaceAt:(p:THREE.Vector3)=>number){
  const a=new THREE.Vector3(entry.x,0,entry.z),b=new THREE.Vector3(exit.x,0,exit.z),p=new THREE.Vector3(point.x,0,point.z);
  const line=new THREE.Line3(a,b),t=line.closestPointToPointParameter(p,true),distance=line.at(t,new THREE.Vector3()).distanceTo(p);
  const surface=surfaceAt(point);
  return distance<=.14?Math.max(surface,THREE.MathUtils.lerp(entry.y,exit.y,t)):surface;
}

/** Geometric tissue bearing and approximate retained load, independent of
 * instrument input. A compact knot in the air carries no closure load. */
export class KnotTissueSeat {
  load=0;
  contact=false;
  clearance=Infinity;
  private tracked?:SeatKnot;
  update(knot:SeatKnot|undefined,long:ThreadStrand,short:ThreadStrand,entry:THREE.Vector3,exit:THREE.Vector3,surfaceAt:(p:THREE.Vector3)=>number){
    if(knot!==this.tracked){this.reset();this.tracked=knot;}
    if(!knot?.active||knot.phase!=='seated'){this.load=0;this.contact=false;this.clearance=Infinity;return;}
    const center=new THREE.Vector3();let bottom=Infinity,penetration=0;
    for(let i=knot.first;i<=knot.last;i++){
      const p=long.points[i],clearance=p.y-stitchSupport(p,entry,exit,surfaceAt);
      center.add(p);bottom=Math.min(bottom,clearance);penetration=Math.min(penetration,clearance);
    }
    center.divideScalar(knot.last-knot.first+1);
    const a=new THREE.Vector3(entry.x,0,entry.z),b=new THREE.Vector3(exit.x,0,exit.z),p=new THREE.Vector3(center.x,0,center.z);
    const near=new THREE.Line3(a,b).closestPointToPoint(p,true,new THREE.Vector3()).distanceTo(p)<=(this.contact?.16:.14);
    let radius=0;for(let i=knot.first;i<=knot.last;i++)radius=Math.max(radius,long.points[i].distanceTo(center));
    this.clearance=bottom;
    // Use a slightly wider exit band once bearing is established. Solver
    // jitter at an entry threshold must not toggle closure on every substep;
    // a genuine lift, lateral departure or penetration still releases load.
    this.contact=near&&radius<(this.contact?.095:.085)&&penetration>=(this.contact?-.018:-.012)&&bottom<=(this.contact?.028:.015);
    if(!this.contact){this.load=0;return;}
    const longSlack=Math.max(0,long.materialLengthBetween(0,knot.first)-exit.distanceTo(long.points[knot.first]));
    const shortSlack=Math.max(0,short.materialLengthBetween(0,knot.shortMaterialCoordinate)-entry.distanceTo(short.pointAt(knot.shortMaterialCoordinate)));
    const slack=Math.max(longSlack/long.restLength,shortSlack/short.restLength);
    const bearing=1-THREE.MathUtils.smoothstep(slack,2,4);
    // Retained material holds achieved approximation after the hands release.
    // Lose that load if the first throw leaves tissue or is reset, rather than
    // ratcheting closure from the number of throws made in the air.
    this.load=Math.max(this.load,bearing);
  }
  reset(){this.load=0;this.contact=false;this.clearance=Infinity;this.tracked=undefined;}
}
