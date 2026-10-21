import { expect,it } from 'vitest';
import * as THREE from 'three';
import { KnotView } from './KnotView';
import { GuidedKnot } from '../suture/GuidedKnot';
import { KnotSlack } from '../suture/KnotSlack';
import { knotLoop,knotTailContact } from '../suture/knotGeometry';
import { Instrument } from '../instruments/Instrument';
it('joins rendered tissue and knot paths to both simulated free spans at the seated throw',()=>{
  const knot=new GuidedKnot();knot.phase='between';knot.throws=1;knot.seating=1;knot.wrap=1;
  const left=new Instrument('left',0),right=new Instrument('right',0);
  left.root.position.copy(knot.leftPosition);right.root.position.copy(knot.rightPosition);
  left.root.updateMatrixWorld(true);right.root.updateMatrixWorld(true);
  const entry=new THREE.Vector3(0.27,0.43,0),exit=new THREE.Vector3(-0.27,0.43,0);
  const contact=knotTailContact(knot,entry),loop=knotLoop(knot,right.root.matrixWorld);
  const simulation=new KnotSlack();simulation.update(1/60,{enabled:true,shortStart:contact,shortEnd:right.root.localToWorld(new THREE.Vector3(0,0,0.05)),longStart:loop.end,longEnd:left.root.localToWorld(new THREE.Vector3(0,0,0.05))});
  const view=new KnotView();view.update(knot,[left,right],entry,exit,new THREE.Vector3(1,0.5,1),simulation);
  const path=(view.root.children[0] as THREE.Mesh<THREE.TubeGeometry>).geometry.parameters.path;
  expect(path.getPoint(0).distanceTo(simulation.short.points[0])).toBeLessThan(1e-8);
  expect(path.getPoint(1).distanceTo(simulation.long.points[0])).toBeLessThan(1e-8);
  expect(simulation.short.points[0].distanceTo(simulation.long.points[0])).toBeLessThan(1e-8);
  // The decorative seated crossing must also touch this shared contact.
  const seated=view.root.children[4].children[0] as THREE.Mesh<THREE.TubeGeometry>;
  expect(seated.geometry.parameters.path.getPoint(0).distanceTo(contact)).toBeLessThan(1e-8);
});
it('retains the short-side seated contact while starting the opposing throw',()=>{
  const knot=new GuidedKnot();knot.phase='between';knot.throws=1;
  const entry=new THREE.Vector3(0.27,0.43,0),before=knotTailContact(knot,entry);
  knot.nextThrow();expect(knotTailContact(knot,entry).distanceTo(before)).toBe(0);
  knot.reset();expect(knotTailContact(knot,entry).equals(entry)).toBe(true);
});
it('refreshes the wrap when the driver moves to the tail without changing knot phase or progress',()=>{
  const knot=new GuidedKnot();knot.phase='tail';knot.wrap=1;
  const left=new Instrument('left',0),right=new Instrument('right',0),view=new KnotView(),simulation=new KnotSlack();
  right.root.quaternion.identity();right.root.position.copy(knot.rightPosition);
  const entry=new THREE.Vector3(0.3,0.43,0),exit=new THREE.Vector3(-0.3,0.43,0),eye=new THREE.Vector3(3,0.1,1);
  view.update(knot,[left,right],entry,exit,eye,simulation);
  const thread=view.root.children[0] as THREE.Mesh<THREE.TubeGeometry>,before=thread.geometry;
  knot.positionTail();right.root.position.copy(knot.rightPosition);right.root.rotateY(0.4);
  view.update(knot,[left,right],entry,exit,eye,simulation);
  expect(thread.geometry).not.toBe(before);
  const expected=knotLoop(knot,right.root.matrixWorld).points[10];
  const path=thread.geometry.parameters.path as THREE.CatmullRomCurve3;
  expect(path.points.some(p=>p.distanceTo(expected)<1e-8)).toBe(true);
});
it('keeps the first seated mesh and geometry while the opposing throw forms and completes',()=>{
  const knot=new GuidedKnot();knot.phase='between';knot.throws=1;knot.seating=1;knot.wrap=1;
  const tools=[new Instrument('left',0),new Instrument('right',0)],view=new KnotView(),simulation=new KnotSlack();
  const update=()=>view.update(knot,tools,new THREE.Vector3(0.27,0.43,0),new THREE.Vector3(-0.27,0.43,0),new THREE.Vector3(3,0.1,1),simulation);
  update();const seated=view.root.children[4],first=seated.children[0] as THREE.Mesh;
  const geometry=first.geometry;knot.nextThrow();knot.wrap=0.5;update();
  expect(seated.children[0]).toBe(first);expect(first.geometry).toBe(geometry);
  knot.throws=2;knot.phase='complete';knot.seating=1;update();
  expect(seated.children).toHaveLength(2);expect(seated.children[0]).toBe(first);expect(first.geometry).toBe(geometry);
  knot.reset();knot.begin();update();expect(seated.children).toHaveLength(0);
});
