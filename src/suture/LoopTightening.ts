import * as THREE from 'three';
/** Assisted sliding-loop constraint; no friction, force or knot-security model. */
export function tighteningPose(driverWorld:THREE.Matrix4,seating:number) {
  const progress=THREE.MathUtils.clamp(seating,0,1);
  const slip=THREE.MathUtils.smoothstep(progress,0,0.3);
  const settle=THREE.MathUtils.smoothstep(progress,0.3,1);
  const driverRotation=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
  driverWorld.decompose(position,driverRotation,scale);
  const jaw=new THREE.Vector3(0,0,0.05).applyMatrix4(driverWorld);
  const center=new THREE.Vector3(0,0,THREE.MathUtils.lerp(0.55,0.05,slip)).applyMatrix4(driverWorld)
    .lerp(new THREE.Vector3(0,0.47,0),settle);
  const tailAxis=jaw.clone().sub(new THREE.Vector3(0,0.47,0)).normalize();
  if(tailAxis.lengthSq()<0.1)tailAxis.set(0,0,1);
  const tailRotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),tailAxis);
  const rotation=driverRotation.clone().slerp(tailRotation,slip)
    .slerp(new THREE.Quaternion(),THREE.MathUtils.smoothstep(progress,0.7,1));
  return {center,rotation,radius:THREE.MathUtils.lerp(0.14,0.06,settle),pitch:0.12*(1-slip),
    stage:progress<0.3?'Sliding loop off driver':progress<0.7?'Tightening loop around tail':'Seating tightened loop'};
}
