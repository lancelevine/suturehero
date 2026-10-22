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
it('counts a double wrap and its direction without rejecting the twice-wound opening',()=>{
 for(const direction of [-1,1]){
  const model=new TailPassage();
  const points=Array.from({length:80},(_,i)=>{const a=direction*i/79*Math.PI*3.9;return new THREE.Vector3(.12*Math.cos(a),.12*Math.sin(a),1);});
  model.update(points,new THREE.Vector3(0,0,.9),matrix,true);
  model.update(points,new THREE.Vector3(0,0,1.1),matrix,true);
  expect(model.passage?.wraps).toBe(2);expect(model.passage?.direction).toBe(direction);
 }
});
it('excludes material belonging to earlier throws from a new wrap',()=>{
 const model=new TailPassage(),points=wrap();
 model.update(points,new THREE.Vector3(0,0,.9),matrix,true,40);
 model.update(points,new THREE.Vector3(0,0,1.1),matrix,true,40);
 expect(model.passage).toBeUndefined();
});

it('recognizes a held short strand already threaded through a newly formed wrap',()=>{
 const points=wrap();
 for(const held of [false,true])for(const x of [0,.4]){
  const model=new TailPassage(),short=[new THREE.Vector3(x,0,.8),new THREE.Vector3(x,0,1.2)];
  model.update(points,short.at(-1)!,matrix,held,0,1,short);
  expect(model.passage?.via).toBe(held&&x===0?'strand':undefined);
 }
});
it('counts an added second wrap automatically before driver clearance',()=>{
 const observer=new TailPassage();
 const coil=(turns:number)=>Array.from({length:100},(_,i)=>{const a=i/99*Math.PI*2*turns;return new THREE.Vector3(.12*Math.cos(a),.12*Math.sin(a),1);});
 observer.update(coil(.95),new THREE.Vector3(0,0,.9),matrix,true,0,0);
 observer.update(coil(1.95),new THREE.Vector3(0,0,.9),matrix,true,0,0);
 observer.update(coil(1.95),new THREE.Vector3(0,0,1.1),matrix,true,0,0);
 expect(observer.passage?.wraps).toBe(2);
});

it.each([{name:'working jaws',radius:.12,z:.12},{name:'fine jaws',radius:.04,z:.1},{name:'loose wrap',radius:.33,z:1}])('recognizes real passage through a $name opening in either direction and a tilted pose',({radius,z})=>{
 const pose=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.4,-.7,.3)).setPosition(1,1.2,-.4);
 for(const direction of [-1,1]){
  const observer=new TailPassage();
  const points=Array.from({length:48},(_,i)=>{const a=direction*i/47*Math.PI*1.9;return new THREE.Vector3(radius*Math.cos(a),radius*Math.sin(a),z).applyMatrix4(pose);});
  const tip=(depth:number)=>new THREE.Vector3(radius*.25,0,z+depth).applyMatrix4(pose);
  observer.update(points,tip(-.1),pose,true,0,0);
  observer.update(points,tip(.1),pose,true,0,0);
  expect(observer.passage?.wraps).toBe(1);expect(observer.passage?.direction).toBe(direction);
 }
});

it('tracks the same wrap as material feeds off the held working end before passage',()=>{
 const observer=new TailPassage();
 const coil=(first:number,last:number)=>Array.from({length:60},(_,i)=>{
  if(i<first)return new THREE.Vector3(.6,0,.2);
  if(i>last)return new THREE.Vector3(.6,0,1.5);
  const a=(i-first)/(last-first)*Math.PI*1.9;
  return new THREE.Vector3(.12*Math.cos(a),.12*Math.sin(a),1);
 });
 observer.update(coil(20,59),new THREE.Vector3(0,0,.9),matrix,false,0,0);
 expect(observer.hasOpening).toBe(true);
 observer.update(coil(15,54),new THREE.Vector3(0,0,.9),matrix,true,0,0);
 observer.update(coil(15,54),new THREE.Vector3(0,0,1.1),matrix,true,0,0);
 expect(observer.passage?.first).toBe(15);expect(observer.passage?.last).toBe(54);
 // After passage the crossing belongs to those material coordinates.
 observer.update(coil(10,49),new THREE.Vector3(0,0,1.2),matrix,true,0,0);
 expect(observer.passage?.first).toBe(15);expect(observer.passage?.last).toBe(54);
});
it.each([1,2])('accepts a late grasp and an off-center passage through an elliptical %i-turn opening',turns=>{
 const observer=new TailPassage(),pose=new THREE.Matrix4().makeRotationY(.6).setPosition(.5,1,-.2);
 const points=Array.from({length:80},(_,i)=>{
  const a=i/79*Math.PI*2*(turns-.05);
  return new THREE.Vector3(.14*Math.cos(a),.04*Math.sin(a),1+i/79*.08).applyMatrix4(pose);
 });
 const tip=(z:number)=>new THREE.Vector3(.015,0,z).applyMatrix4(pose);
 observer.update(points,tip(.8),pose,false,0,0);
 observer.update(points,tip(.8),pose,true,0,0);
 observer.update(points,tip(1.3),pose,true,0,0);
 expect(observer.passage?.wraps).toBe(turns);
});
