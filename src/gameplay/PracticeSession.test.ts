import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { PracticeSession } from './PracticeSession';
import { Instrument } from '../instruments/Instrument';
import { NeedleGrasp } from '../suture/NeedleGrasp';
import { SutureModel } from '../suture/SutureModel';
import type { ToolCommand } from '../input/types';
it('runs placement, needle pass, forceps handoff, extraction and reset',()=>{
  const needle=new SutureModel(); const left=new Instrument('left',0); const right=new Instrument('right',0);
  const scene=new THREE.Scene(); scene.add(needle.root,left.root,right.root);
  const grasp=new NeedleGrasp(needle);
  let command:ToolCommand={translation:[0,0,0],rotation:[0,0,0],jaw:0};
  let leftCommand:ToolCommand={translation:[0,0,0],rotation:[0,0,0],jaw:0};
  const session=new PracticeSession({sample:(id)=>id==='right'?command:leftCommand,dispose:()=>{}},[left,right],grasp);
  expect(session.canBeginPass).toBe(true);
  expect(session.placement.complete).toBe(false);
  expect(session.beginPass()).toBe(true);
  expect(session.pass.phase).toBe('idle');expect(session.canBeginPass).toBe(false);
  expect(session.positionForceps()).toBe(true);left.openness=0.1;session.update(0.01);
  leftCommand={...leftCommand,translation:[0,1,0]};session.update(0.05);session.update(0.05);leftCommand={...leftCommand,translation:[0,0,0]};
  expect(session.eversion.ready).toBe(true);expect(session.beginPass()).toBe(true);
  expect(grasp.holder).toBe(right);
  expect(session.beginPass()).toBe(false);
  const before=right.root.position.clone();
  command={...command,rotation:[0,0,1]};
  for(let i=0;i<100 && session.pass.phase==='passing';i++)session.update(0.05);
  expect(session.pass.phase).toBe('complete'); expect(grasp.holder).toBe(right);
  expect(right.root.position.distanceTo(before)).toBeGreaterThan(0.1);
  expect(needle.getTipPose().position.y).toBeGreaterThan(session.pass.exit.y);
  expect(needle.getTipPose().position.x).toBeLessThan(0);
  // Continuing to hold U after emergence must not move the needle away.
  const atExit=needle.getTipPose().position;
  for(let i=0;i<10;i++)session.update(0.05);
  expect(needle.getTipPose().position.distanceTo(atExit)).toBeLessThan(1e-7);
  command={translation:[0,0,0],rotation:[0,0,0],jaw:0};
  expect(session.eversion.held).toBe(true);expect(grasp.receiver).toBeNull();
  expect(session.canPositionForceps).toBe(false);left.openness=0.7;session.update(0.01);
  expect(session.canPositionForceps).toBe(true);
  expect(session.positionForceps()).toBe(true);
  session.update(0.01); left.openness=0.1; session.update(0.01);
  expect(grasp.receiver).toBe(left); expect(grasp.holder).toBe(right);
  right.openness=0.7; session.update(0.01); expect(grasp.holder).toBe(left); expect(session.pull.phase).toBe('pulling');
  leftCommand={...leftCommand,rotation:[0,0,1]};
  session.update(0.05); const moved=session.pull.angle;
  left.openness=0.7; session.update(0.05); expect(session.pull.angle).toBe(moved);
  leftCommand={...leftCommand,rotation:[0,0,0]};
  left.openness=0.1; session.update(0.01); expect(grasp.holder).toBe(left);
  leftCommand={...leftCommand,rotation:[0,0,1]};
  for(let i=0;i<60 && session.pull.phase==='pulling';i++)session.update(0.05);
  expect(session.pull.phase).toBe('complete'); expect(session.pull.threadProgress).toBe(1);
  needle.root.updateWorldMatrix(true,false);
  for(const point of needle.points)expect(point.clone().applyMatrix4(needle.root.matrixWorld).y).toBeGreaterThan(0.43);
  expect(session.canBeginKnot).toBe(true); expect(session.knotAction()).toBe(true);expect(session.canPositionForceps).toBe(false); expect(session.wound.closure).toBe(0);
  expect(grasp.holder).toBeNull(); expect(session.canBeginPass).toBe(false);
  const longSeed=vi.spyOn(session.knotSlack.long,'reset'),shortSeed=vi.spyOn(session.knotSlack.short,'reset');
  command={translation:[0,0,0],rotation:[0,0,0],jaw:0};
  for(const direction of [1,-1]) {
    leftCommand={translation:[0,0,0],rotation:[0,0,direction],jaw:0};
    for(let i=0;i<50;i++)session.update(0.05);
    expect(session.knot.phase).toBe('tail');
    expect(session.knotSlack.enabled).toBe(true);
    {
      expect(session.knotSlack.material.overreach).toBe(false);
      expect(session.knotSlack.short.length+session.knotSlack.long.length+session.knotSlack.material.loop+session.knotSlack.material.retained).toBeCloseTo(session.knotSlack.material.total,12);
    }
    if(direction===1)expect(session.knotSlack.short.points[0].distanceTo(session.wound.deformPoint(session.pass.entry))).toBeLessThan(1e-8);
    if(direction===-1)expect(session.wound.closure).toBeGreaterThan(0.8);
    expect(session.knotAction()).toBe(true);
    command={...command,jaw:-1};
    for(let i=0;i<15;i++)session.update(0.05);
    expect(session.knot.phase).toBe('seating');
    leftCommand={translation:[-direction,0,0],rotation:[0,0,0],jaw:0};
    command={translation:[direction,0,0],rotation:[0,0,0],jaw:0};
    for(let i=0;i<40;i++)session.update(0.05);
    if(direction===1) {expect(session.knot.phase).toBe('between'); expect(session.wound.closure).toBeGreaterThan(0.75); expect(session.knotAction()).toBe(true);}
  }
  expect(longSeed).toHaveBeenCalledTimes(1);expect(shortSeed).toHaveBeenCalledTimes(1);
  expect(session.knotSlack.enabled).toBe(true);expect(session.knotSlack.material.retained).toBeGreaterThan(0);
  expect(session.knot.phase).toBe('complete'); expect(session.knot.throws).toBe(2); expect(session.wound.closure).toBeGreaterThan(0.95);
  const shortEnd=session.knotSlack.short.points.at(-1)!.clone(),longEnd=session.knotSlack.long.points.at(-1)!.clone();
  command={translation:[0,0,0],rotation:[0,0,0],jaw:0};leftCommand={...command};
  for(let i=0;i<90;i++)session.update(1/60);
  expect(session.releaseCheck.state).toBe('waiting');
  const shortLength=session.knotSlack.short.length,longLength=session.knotSlack.long.length;
  left.openness=0.7;session.update(1/60);
  expect(session.releaseCheck.leftReleased).toBe(true);expect(session.releaseCheck.rightReleased).toBe(false);
  for(let i=0;i<60;i++)session.update(1/60);
  expect(session.knotSlack.long.points.at(-1)!.distanceTo(longEnd)).toBeGreaterThan(0.1);
  expect(session.knotSlack.short.points.at(-1)!.distanceTo(shortEnd)).toBeLessThan(1e-8);
  right.openness=0.7;
  for(let i=0;i<190;i++)session.update(1/60);
  expect(session.releaseCheck.state).toBe('passed');
  expect(session.knotSlack.short.points.at(-1)!.distanceTo(shortEnd)).toBeGreaterThan(0.1);
  expect(session.knotSlack.short.length).toBe(shortLength);expect(session.knotSlack.long.length).toBe(longLength);
  expect(session.wound.closure).toBeGreaterThan(0.95);
  const releasedTail=session.knotSlack.short.points.at(-1)!.clone();
  expect(session.canKnotAction).toBe(true);expect(session.knotAction()).toBe(true);
  right.root.updateWorldMatrix(true,false);
  expect(right.root.localToWorld(new THREE.Vector3(0,0,0.05)).distanceTo(releasedTail)).toBeLessThan(1e-8);
  right.openness=0.1;session.update(1/60);expect(session.loadTest.stage).toBe('pulling');
  command={...command,translation:[-1,0,0]};
  for(let i=0;i<1200 && session.loadTest.load<0.3;i++)session.update(1/60);
  expect(session.loadTest.load).toBeGreaterThanOrEqual(0.3);command={...command,translation:[0,0,0]};
  for(let i=0;i<100;i++)session.update(1/60);
  expect(session.loadTest.stage).toBe('passed');expect(session.loadTest.slip).toBe(0);
  expect(session.knotSlack.short.length+session.knotSlack.long.length+session.knotSlack.material.loop+session.knotSlack.material.retained).toBeCloseTo(session.knotSlack.material.total,12);
  expect(session.releaseCheck.state).toBe('passed');
  session.reset();expect(session.loadTest.active).toBe(false); expect(session.releaseCheck.state).toBe('waiting');expect(session.releaseCheck.anyReleased).toBe(false);expect(session.knotSlack.enabled).toBe(false); expect(session.wound.closure).toBe(0); expect(session.knot.phase).toBe('idle'); expect(session.pull.phase).toBe('waiting'); expect(session.pass.phase).toBe('idle'); expect(grasp.holder).toBeNull();
});
it('transfers thread and reopens the wound under excessive guided pull without creating material',()=>{
  const left=new Instrument('left',0),right=new Instrument('right',0);
  let command:ToolCommand={translation:[0,0,0],rotation:[0,0,0],jaw:0};
  const session=new PracticeSession({sample:id=>id==='right'?command:{translation:[0,0,0],rotation:[0,0,0],jaw:0},dispose:()=>{}},[left,right]);
  session.wound.setDermalBites(new THREE.Vector3(0.27,0.31,0),new THREE.Vector3(-0.27,0.31,0));
  session.knot.phase='complete';session.knot.throws=2;session.knot.seating=1;session.knot.wrap=1;
  left.openness=right.openness=0.1;for(let i=0;i<100;i++)session.update(1/60);
  left.openness=right.openness=0.7;for(let i=0;i<190;i++)session.update(1/60);
  expect(session.releaseCheck.state).toBe('passed');expect(session.knotAction()).toBe(true);
  right.openness=0.1;session.update(1/60);command={...command,translation:[-1,0,0]};
  for(let i=0;i<1800 && session.loadTest.stage!=='failed';i++)session.update(1/60);
  expect(session.loadTest.stage).toBe('failed');expect(session.loadTest.slip).toBeGreaterThan(0.025);
  command={...command,translation:[0,0,0]};for(let i=0;i<60;i++)session.update(1/60);
  expect(session.wound.closure).toBeLessThan(0.9);
  const m=session.knotSlack.material;expect(m.short+m.long+m.loop+m.retained).toBeCloseTo(m.total,12);
});

it('pauses needle advancement when the skin grip opens and supports repositioning to resume',()=>{
  const left=new Instrument('left',0),right=new Instrument('right',0),needle=new SutureModel();
  const command:ToolCommand={translation:[0,0,0],rotation:[0,0,1],jaw:0};
  const session=new PracticeSession({sample:id=>id==='right'?command:{translation:[0,0,0],rotation:[0,0,0],jaw:0},dispose:()=>{}},[left,right],new NeedleGrasp(needle));
  session.beginPass();expect(session.beginPass()).toBe(false);session.positionForceps();left.openness=0.1;session.update(0.01);
  left.root.position.y+=0.15;session.update(0.01);expect(session.beginPass()).toBe(true);
  session.update(0.05);const angle=session.pass.angle;expect(angle).toBeGreaterThan(0);
  left.openness=0.7;session.update(0.05);expect(session.pass.angle).toBe(angle);expect(session.canPositionForceps).toBe(true);
  session.positionForceps();left.openness=0.1;session.update(0.01);left.root.position.y+=0.15;session.update(0.01);
  session.update(0.05);expect(session.pass.angle).toBeGreaterThan(angle);
  session.reset();expect(session.eversion.active).toBe(false);expect(session.canBeginPass).toBe(true);
});
it('supports skin eversion before starting, and in the free lab without taking a thread grasp',()=>{
 const left=new Instrument('left',0),right=new Instrument('right',0);
 const session=new PracticeSession({sample:()=>({translation:[0,0,0],rotation:[0,0,0],jaw:0}),dispose:()=>{}},[left,right],new NeedleGrasp(new SutureModel()));
 for(const free of [false,true]){
  if(free){session.beginFreeTying();left.openness=0.7;session.update(0.01);}
  expect(session.positionForceps()).toBe(true);left.openness=0.1;session.update(0.01);
  expect(session.eversion.held).toBe(true);expect(session.preparingEdge).toBe(false);expect(session.pass.phase).toBe('idle');
  left.root.position.y+=0.15;session.update(0.01);expect(session.eversion.ready).toBe(true);expect(session.freeKnot.grips.has('left')).toBe(false);
  left.openness=0.7;session.update(0.01);expect(session.eversion.held).toBe(false);session.reset();
 }
});
