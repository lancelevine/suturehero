import {tractEntry,TRACT_START} from '../tissue/sutureTract';
import * as THREE from 'three';
/** Geometric exercise criteria in sandbox units; not a clinical assessment. */
export class NeedlePlacement {
  readonly target = tractEntry();
  readonly direction = new THREE.Vector3(-Math.sin(TRACT_START),-Math.cos(TRACT_START),0);
  distance = Infinity;
  angle = 180;
  progress = 0;
  complete = false;
  update(tip: THREE.Vector3, tangent: THREE.Vector3, heldByDriver: boolean, dt: number) {
    this.distance=tip.distanceTo(this.target);
    this.angle=THREE.MathUtils.radToDeg(tangent.angleTo(this.direction));
    if(this.complete) return;
    const aligned=heldByDriver && this.distance<=0.12 && this.angle<=20;
    this.progress=aligned?Math.min(1,this.progress+Math.max(0,Math.min(dt,0.05))):0;
    this.complete=this.progress>=1;
  }
  reset() { this.distance=Infinity; this.angle=180; this.progress=0; this.complete=false; }
}
