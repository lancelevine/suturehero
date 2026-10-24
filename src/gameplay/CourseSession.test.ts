import {expect,it} from 'vitest';
import * as THREE from 'three';
import {PracticeSession} from './PracticeSession';
import {Instrument} from '../instruments/Instrument';
import {NeedleGrasp} from '../suture/NeedleGrasp';
import {SutureModel} from '../suture/SutureModel';
import type {ToolCommand} from '../input/types';
it.each([false,true])('completes three real passes, knots and cuts without replacing saved stitches (custom placement: %s)',custom=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],needle=new SutureModel(),grasp=new NeedleGrasp(needle),scene=new THREE.Scene();scene.add(...tools.map(t=>t.root),needle.root);
 const idle=():ToolCommand=>({translation:[0,0,0],rotation:[0,0,0],jaw:0});let left=idle(),right=idle();
 const s=new PracticeSession({sample:id=>id==='left'?left:right,dispose:()=>{}},tools,grasp),tick=(frames:number,dt=.05)=>{for(let i=0;i<frames;i++)s.update(dt);};
 expect(s.startCourse()).toBe(true);expect(s.startCourse()).toBe(false);s.beginFreeTying('auto');expect(s.course.active).toBe(true);expect(s.freeKnot.active).toBe(false);
 for(let n=0;n<3;n++){
  left=idle();right=idle();
  if(custom&&n>0){expect(s.setBiteWidths(n===1?1.35:.7,n===1?.65:1.3)).toBe(true);expect(s.setStitchPosition(n===1?-.05:.95)).toBe(true);}
  expect(s.canAdvanceStitch).toBe(false);expect(s.advanceStitch()).toBe(false);
  expect(s.beginPass()).toBe(true);expect(s.positionForceps()).toBe(true);tools[0].openness=.1;s.update(.01);
  left.translation=[0,1,0];tick(2);left=idle();expect(s.setBiteWidths(1,1)).toBe(false);expect(s.beginPass()).toBe(true);
  right.rotation=[0,0,1];tick(100);right=idle();expect(s.pass.phase).toBe('complete');
  tools[0].openness=.7;s.update(.01);expect(s.positionForceps()).toBe(true);s.update(.01);tools[0].openness=.1;s.update(.01);tools[1].openness=.7;s.update(.01);
  left.rotation=[0,0,1];tick(70);left=idle();expect(s.pull.phase).toBe('complete');expect(s.knotAction()).toBe(true);
  for(const direction of [1,-1]){
   left={...idle(),rotation:[0,0,direction]};right=idle();tick(50);expect(s.knot.phase).toBe('tail');expect(s.knotAction()).toBe(true);
   right.jaw=-1;tick(15);left={...idle(),translation:[-direction,0,0]};right={...idle(),translation:[direction,0,0]};tick(40);
   if(direction===1){expect(s.knot.phase).toBe('between');expect(s.knotAction()).toBe(true);}
  }
  left=idle();right=idle();tools.forEach(t=>t.openness=.7);tick(240,1/60);expect(s.releaseCheck.state).toBe('passed');
  if(custom&&n>0){expect(s.pass.customBites).toBe(true);expect(s.stitchAssessment.feedback.join(' ')).toContain('unequal widths');expect(Math.abs(s.wound.edgeMismatch)).toBeGreaterThan(.004);}
  expect(s.knotSlack.cut(s.knotSlack.short,8.5)).toBe(true);expect(s.canAdvanceStitch).toBe(false);
  expect(s.knotSlack.cut(s.knotSlack.long,8.5)).toBe(true);expect(s.canAdvanceStitch).toBe(true);
  const previous=s.course.completed.map(r=>r.strands[0].map(p=>p.toArray()));
  const tractBottom=s.pass.center.y-s.pass.radius;
  expect(s.advanceStitch()).toBe(true);expect(s.course.completed).toHaveLength(n+1);
  expect(s.course.completed[n].site.tractBottom).toBeCloseTo(tractBottom,6);
  expect(s.course.completed[n].review.join(' ')).toContain('Deep dermal closure:');
  expect(s.course.completed.slice(0,n).map(r=>r.strands[0].map(p=>p.toArray()))).toEqual(previous);
  if(n<2){expect(s.pass.phase).toBe('idle');expect(s.wound.closure).toBe(0);expect(s.course.tissueSites[n].closure).toBeGreaterThan(.95);}
 }
 expect(s.course.finished).toBe(true);expect(s.canBeginPass).toBe(false);expect(s.canKnotAction).toBe(false);expect(s.advanceStitch()).toBe(false);
 s.reset();expect(s.course.active).toBe(false);expect(s.course.completed).toHaveLength(0);expect(s.freeKnot.padOffsetZ).toBe(0);
 s.setEnvironment('microsurgery');expect(s.startCourse()).toBe(false);
},30000);
