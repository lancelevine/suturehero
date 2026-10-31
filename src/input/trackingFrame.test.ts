import {expect,it} from 'vitest';
import * as THREE from 'three';
import {trackedInstrumentRotation} from './trackingFrame';
it('starts with handles up and tips down for neutral tracking',()=>{
 const q=trackedInstrumentRotation(),handle=new THREE.Vector3(0,0,1).applyQuaternion(q),tip=new THREE.Vector3(0,0,-1).applyQuaternion(q);
 expect(handle.distanceTo(new THREE.Vector3(0,1,0))).toBeLessThan(1e-10);
 expect(tip.distanceTo(new THREE.Vector3(0,-1,0))).toBeLessThan(1e-10);
});
it('preserves continuous shaft roll and leaves the tracked input unchanged',()=>{
 const tracker=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),1.2),before=tracker.clone(),mapped=trackedInstrumentRotation(tracker);
 expect(new THREE.Vector3(0,0,1).applyQuaternion(mapped).distanceTo(new THREE.Vector3(0,1,0))).toBeLessThan(1e-10);
 const jaw=new THREE.Vector3(1,0,0).applyQuaternion(mapped);
 expect(jaw.distanceTo(new THREE.Vector3(1,0,0).applyQuaternion(tracker))).toBeLessThan(1e-10);
 expect(tracker.equals(before)).toBe(true);
});
