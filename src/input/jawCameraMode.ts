/** Single-camera movement and jaws both use the primary camera. */
export const jawCameraParticipates=(mode:string,camera:number)=>camera===0||mode==='stereo'&&camera===1;
