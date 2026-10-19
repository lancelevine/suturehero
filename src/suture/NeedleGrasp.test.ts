import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Instrument } from '../instruments/Instrument';
import { SutureModel } from './SutureModel';
import { NeedleGrasp } from './NeedleGrasp';
function setup() {
  const needle=new SutureModel(); const left=new Instrument('left',0); const right=new Instrument('right',0);
  const scene=new THREE.Scene(); scene.add(needle.root,left.root,right.root);
  left.root.quaternion.identity();
  left.root.position.copy(needle.root.position).add(new THREE.Vector3(0.3,0,-0.05));
  const grasp=new NeedleGrasp(needle); return {needle,left,right,grasp};
}
describe('needle grasp constraint',()=>{
  it('requires closing within reach and follows the holder without a pickup jump',()=>{
    const {needle,left,right,grasp}=setup(); const before=needle.root.position.clone();
    grasp.update([left,right]); expect(grasp.candidate).toBe(left); expect(grasp.holder).toBeNull();
    left.openness=0.1; grasp.update([left,right]); expect(grasp.holder).toBe(left);
    expect(needle.root.position.distanceTo(before)).toBeLessThan(1e-8);
    left.root.position.x+=1; grasp.update([left,right]); expect(needle.root.position.x).toBeCloseTo(before.x+1);
    needle.root.updateWorldMatrix(true,false);
    const relative=left.root.matrixWorld.clone().invert().multiply(needle.root.matrixWorld);
    left.root.rotateY(0.7); grasp.update([left,right]); needle.root.updateWorldMatrix(true,false);
    const next=left.root.matrixWorld.clone().invert().multiply(needle.root.matrixWorld);
    next.elements.forEach((value,i)=>expect(value).toBeCloseTo(relative.elements[i]));
  });
  it('releases in place, permits handoff, and resets ownership',()=>{
    const {needle,left,right,grasp}=setup(); grasp.update([left,right]); left.openness=0.1; grasp.update([left,right]);
    left.openness=0.7; grasp.update([left,right]); expect(grasp.holder).toBeNull();
    const released=needle.root.position.clone(); left.root.position.x-=2; grasp.update([left,right]);
    expect(needle.root.position.distanceTo(released)).toBeLessThan(1e-8);
    right.root.quaternion.identity(); right.root.position.copy(released).add(new THREE.Vector3(0.3,0,-0.05));
    grasp.update([left,right]); right.openness=0.1; grasp.update([left,right]); expect(grasp.holder).toBe(right);
    grasp.reset(); expect(grasp.holder).toBeNull(); expect(needle.root.position.x).toBe(-0.3);
  });
  it('rejects distant closures and prevents two simultaneous holders',()=>{
    const {left,right,grasp}=setup(); right.root.position.set(3,3,3);
    grasp.update([left,right]); right.openness=0; grasp.update([left,right]); expect(grasp.holder).toBeNull();
    right.root.position.copy(left.root.position); right.root.quaternion.copy(left.root.quaternion); right.openness=0.65;
    grasp.update([left,right]); left.openness=right.openness=0; grasp.update([left,right]); expect(grasp.holder).toBe(left);
  });
});
