import {expect,it} from 'vitest';
import * as THREE from 'three';
import {TailPassage} from './TailPassage';
const matrix=new THREE.Matrix4();
const wrap=()=>Array.from({length:48},(_,i)=>{const a=i/47*Math.PI*1.9;return new THREE.Vector3(Math.cos(a)*0.12,Math.sin(a)*0.12,1);});
it('observes the held short tip crossing a live opening, then resets',()=>{
  const model=new TailPassage(),points=wrap();
  model.update(points,new THREE.Vector3(0,0,0.9),matrix,false);
  expect(model.state).toContain('Grasp');
  model.update(points,new THREE.Vector3(0,0,0.9),matrix,true);
  model.update(points,new THREE.Vector3(0,0,1.1),matrix,true);
  expect(model.state).toContain('passed through');
  model.reset();expect(model.state).toContain('Form a wrap');
});
it('rejects unheld tips, crossings outside the material opening, and rigid assembly movement',()=>{
  for(const held of [false,true]){
    const model=new TailPassage(),points=wrap(),x=held?0.4:0;
    model.update(points,new THREE.Vector3(x,0,0.9),matrix,held);
    model.update(points,new THREE.Vector3(x,0,1.1),matrix,held);
    expect(model.state).not.toContain('passed through');
  }
  const model=new TailPassage(),points=wrap(),tip=new THREE.Vector3(0,0,0.9);
  model.update(points,tip,matrix,true);
  const pose=new THREE.Matrix4().makeRotationY(1.8).setPosition(2,3,4);
  model.update(points.map(p=>p.clone().applyMatrix4(pose)),tip.clone().applyMatrix4(pose),pose,true);
  expect(model.state).not.toContain('passed through');
});
it('does not infer an opening from a straight strand or collapsed material',()=>{
  const model=new TailPassage();model.update([new THREE.Vector3(0.1,0,1),new THREE.Vector3(0.1,0,2)],new THREE.Vector3(),matrix,true);
  expect(model.state).toContain('Form a wrap');
});
