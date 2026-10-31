import * as THREE from 'three';
/** Instruments use +Z from tip to handle. In the neutral tracking view the
 * handle must point up (+Y), with the tip pointing down, not the reverse.
 * Apply the same fixed mount orientation in the lab and simulator bridge. */
const mountRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
export function trackedInstrumentRotation(tracker=new THREE.Quaternion()){
 return tracker.clone().multiply(mountRotation).normalize();
}
