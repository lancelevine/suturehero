import {alignOppositeEdge} from './test-support/oppositeEdge';
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
  for(let i=0;i<100 && session.pass.phase==='passing';i++){session.update(0.05);alignOppositeEdge(session,[left,right]);}
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
  expect(session.stitchAssessment.complete).toBe(false);expect(session.stitchAssessment.stage).toContain('Trim both');
  expect(session.knotSlack.cut(session.knotSlack.short,8.5)).toBe(true);expect(session.stitchAssessment.complete).toBe(false);
  expect(session.knotSlack.cut(session.knotSlack.long,8.5)).toBe(true);expect(session.stitchAssessment.complete).toBe(true);
  expect(session.stitchAssessment.feedback.join(' ')).toContain('symmetric');
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
it('continues from an extracted stitch into free tying without replacing its tissue purchase',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],needle=new SutureModel(),grasp=new NeedleGrasp(needle);
 const s=new PracticeSession({sample:()=>({translation:[0,0,0],rotation:[0,0,0],jaw:0}),dispose:()=>{}},tools,grasp);
 expect(s.continueFreeTying()).toBe(false);
 s.pass.phase='complete';s.pull.phase='complete';s.wound.setDermalBites(...s.pass.purchaseSites);
 const bites=s.wound.purchaseSites.map(p=>p?.toArray());
 expect(s.continueFreeTying()).toBe(true);expect(s.canBeginKnot).toBe(false);expect(s.continueFreeTying()).toBe(false);expect(s.wound.purchaseSites.map(p=>p?.toArray())).toEqual(bites);
 expect(s.pass.phase).toBe('complete');expect(s.pull.phase).toBe('complete');expect(s.stitchAssessment.stage).toContain('Tie and seat');
 expect(s.stitchAssessment.complete).toBe(false);s.reset();expect(s.freeKnot.active).toBe(false);expect(s.freeReleaseProgress).toBe(0);
 s.beginFreeTying('auto');expect(s.stitchAssessment.stage).toContain('Preplaced stitch');expect(s.stitchAssessment.complete).toBe(false);
});

it('counts a free release hold only while both primary strands are released and the knot stays seated',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)];
 const s=new PracticeSession({sample:()=>({translation:[0,0,0],rotation:[0,0,0],jaw:0}),dispose:()=>{}},tools);
 s.beginFreeTying('auto');s.wound.closure=1;
 vi.spyOn(s.freeKnot,'update').mockImplementation(()=>{});
 const seat=vi.spyOn(s.freeKnot,'lockSeated','get').mockReturnValue(true);
 vi.spyOn(s.freeKnot,'closureLoad','get').mockReturnValue(1);
 const grip=s.freeKnot.grips.get('left')!;
 for(let i=0;i<100;i++)s.update(1/60);expect(s.freeReleaseProgress).toBe(0);
 s.freeKnot.grips.clear();for(let i=0;i<100;i++)s.update(1/60);expect(s.freeReleaseProgress).toBe(1);
 s.freeKnot.grips.set('left',grip);s.update(1/60);expect(s.freeReleaseProgress).toBe(0);
 s.freeKnot.grips.clear();seat.mockReturnValue(false);for(let i=0;i<100;i++)s.update(1/60);expect(s.freeReleaseProgress).toBe(0);
 s.reset();expect(s.freeReleaseProgress).toBe(0);
});
it.each([false,true])('recovers a slipped skin grasp and retains feedback (shallow bite: %s)',shallow=>{
 const left=new Instrument('left',0),right=new Instrument('right',0),needle=new SutureModel();
 const drive:ToolCommand={translation:[0,0,0],rotation:[0,0,1],jaw:0};
 const s=new PracticeSession({sample:id=>id==='right'?drive:{translation:[0,0,0],rotation:[0,0,0],jaw:0},dispose:()=>{}},[left,right],new NeedleGrasp(needle));
 if(shallow)expect(s.setBiteWidths(.65,1.1)).toBe(true);
 s.beginPass();s.positionForceps();left.openness=.1;s.update(.01);left.root.position.y+=.15;s.update(.01);expect(s.beginPass()).toBe(true);s.update(.05);
 const angle=s.pass.angle;left.root.position.y+=.19;
 for(let i=0;i<30;i++)s.update(.05);
 expect(s.eversion.held).toBe(false);expect(s.pass.phase).toBe('passing');expect(s.pass.angle).toBe(angle);
 expect(s.stitchAssessment.feedback).toContain('Skin grasp slips: 1');expect(s.stitchAssessment.feedback).toContain('High skin traction observed');
 expect(s.positionForceps()).toBe(true);left.openness=.1;s.update(.01);left.root.position.y+=.15;s.update(.01);s.update(.05);
 expect(s.pass.angle).toBeGreaterThan(angle);expect(s.stitchAssessment.feedback).toContain('Skin grasp slips: 1');
 s.reset();expect(s.stitchAssessment.feedback.join(' ')).not.toContain('Skin grasp slips');
});
it('pauses at the first side until the opposite edge is grasped, lifted and drawn flush',()=>{
 const needle=new SutureModel(),tools=[new Instrument('left',0),new Instrument('right',0)],scene=new THREE.Scene();scene.add(needle.root,...tools.map(t=>t.root));
 const command:ToolCommand={translation:[0,0,0],rotation:[0,0,1],jaw:0},idle:ToolCommand={translation:[0,0,0],rotation:[0,0,0],jaw:0};
 const s=new PracticeSession({sample:id=>id==='right'?command:idle,dispose:()=>{}},tools,new NeedleGrasp(needle)),tick=(n:number)=>{for(let i=0;i<n;i++)s.update(.05);};
 s.beginPass();s.positionForceps();tools[0].openness=.1;s.update(.01);tools[0].root.position.y+=.15;s.update(.01);expect(s.beginPass()).toBe(true);
 tick(100);expect(s.oppositeEdgeRequired).toBe(true);expect(s.pass.angle).toBeCloseTo(s.pass.firstSideAngle,10);expect(s.pass.phase).toBe('passing');
 const angle=s.pass.angle,driver=tools[1].root.position.clone(),rotation=tools[1].root.quaternion.clone();tick(100);
 expect(s.pass.angle).toBe(angle);expect(tools[1].root.position.distanceTo(driver)).toBeLessThan(1e-10);expect(tools[1].root.quaternion.angleTo(rotation)).toBeLessThan(1e-7);
 expect(s.canPositionForceps).toBe(false);tools[0].openness=.7;tick(14);expect(s.eversion.anchor.x).toBeLessThan(0);
 expect(s.positionForceps()).toBe(true);tools[0].openness=.1;s.update(.01);tools[0].root.position.y+=.15;tick(4);
 expect(s.eversion.ready).toBe(true);expect(s.oppositeEdgeReady).toBe(false);expect(s.pass.angle).toBe(angle);
 tools[0].root.position.x+=.045;tick(3);expect(s.oppositeEdgeReady).toBe(true);expect(s.pass.angle).toBeGreaterThan(angle);
 tools[0].openness=.7;s.update(.01);const paused=s.pass.angle;tick(3);expect(s.pass.angle).toBe(paused);
 alignOppositeEdge(s,tools);tick(100);expect(s.pass.phase).toBe('complete');s.reset();expect(s.oppositeEdgeRequired).toBe(false);
});
