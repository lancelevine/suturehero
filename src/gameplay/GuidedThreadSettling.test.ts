import {expect,it} from 'vitest';
import {Instrument} from '../instruments/Instrument';
import {SutureModel} from '../suture/SutureModel';
import {NeedleGrasp} from '../suture/NeedleGrasp';
import {PracticeSession} from './PracticeSession';
import {REST_COMMAND} from '../input/InstrumentControls';
import type {ToolCommand} from '../input/types';

it.each(['skin','microsurgery'] as const)('settles the tail and exposed thread through guided emergence and extraction in %s',environment=>{
 const needle=new SutureModel(),tools=[new Instrument('left',0),new Instrument('right',0)];
 let right:ToolCommand=REST_COMMAND,left:ToolCommand=REST_COMMAND;
 const session=new PracticeSession({sample:id=>id==='right'?right:left,dispose:()=>{}},tools,new NeedleGrasp(needle));
 session.setEnvironment(environment);
 session.beginPass();session.positionForceps();tools[0].openness=.1;session.update(.01);
 left={...REST_COMMAND,translation:[0,1,0]};session.update(.05);session.update(.05);left=REST_COMMAND;
 expect(session.beginPass()).toBe(true);right={...REST_COMMAND,rotation:[0,0,1]};
 for(let i=0;i<200&&session.pass.phase==='passing';i++)session.update(.05);
 expect(session.pass.phase).toBe('complete');
 const material=needle.strand.length;
 const settle=()=>{
  let maximum=0;
  for(let i=0;i<480;i++){
   const before=needle.strand.points.map(p=>p.clone());session.update([1/60,1/30,.05][i%3]);
   if(i>=360)maximum=Math.max(maximum,...needle.strand.points.map((p,j)=>p.distanceTo(before[j])));
  }
  return maximum;
 };
 // Continuing to hold the pass key at its endpoint must not excite the tail.
 expect(settle()).toBeLessThan(.003);
 tools[0].openness=.7;right=REST_COMMAND;session.update(.01);
 expect(session.positionForceps()).toBe(true);session.update(.01);
 tools[0].openness=.1;session.update(.01);tools[1].openness=.7;session.update(.01);
 expect(session.pull.phase).toBe('pulling');left={...REST_COMMAND,rotation:[0,0,1]};
 let moving=0;
 for(let i=0;i<240&&session.pull.phase==='pulling';i++){
  const before=needle.strand.points.map(p=>p.clone());session.update(1/60);
  moving=Math.max(moving,...needle.strand.points.map((p,j)=>p.distanceTo(before[j])));
 }
 expect(session.pull.phase).toBe('complete');left=REST_COMMAND;
 expect(moving).toBeLessThan(.06);expect(settle()).toBeLessThan(.005);
 expect(needle.strand.length).toBe(material);
 expect(Math.abs(needle.strand.measuredLength/material-1)).toBeLessThan(.03);
},30000);
