import { expect, it } from 'vitest';
import { GuidedKnot } from './GuidedKnot';
import type { ToolCommand } from '../input/types';
const idle:ToolCommand={translation:[0,0,0],rotation:[0,0,0],jaw:0};
const roll=(sign:number):ToolCommand=>({...idle,rotation:[0,0,sign]});
const move=(sign:number):ToolCommand=>({...idle,translation:[sign,0,0]});
function wrap(k:GuidedKnot,sign:number) {for(let i=0;i<50;i++)k.update(roll(sign),idle,0.1,0.65,0.05);}
function seat(k:GuidedKnot,sign:number) {for(let i=0;i<40;i++)k.update(move(-sign),move(sign),0.1,0.1,0.05);}
it('requires wrap, positioned tail grasp and opposed pull for each alternating throw',()=>{
  const k=new GuidedKnot(); expect(k.positionTail()).toBe(false); k.begin();
  wrap(k,-1); expect(k.wrap).toBe(0); wrap(k,1); expect(k.phase).toBe('tail');
  k.update(idle,idle,0.1,0.1,0.05); expect(k.phase).toBe('tail');
  k.positionTail(); k.update(idle,idle,0.1,0.65,0.05); expect(k.phase).toBe('tail');
  k.update(idle,idle,0.1,0.1,0.05); expect(k.phase).toBe('seating');
  k.update(move(-1),move(-1),0.1,0.1,0.05); expect(k.seating).toBe(0);
  seat(k,1); expect(k.phase).toBe('between'); expect(k.throws).toBe(1);
  expect(k.nextThrow()).toBe(true); expect(k.direction).toBe(-1);
  wrap(k,1); expect(k.wrap).toBe(0); wrap(k,-1); k.positionTail(); k.update(idle,idle,0.1,0.1,0.05);
  seat(k,1); expect(k.seating).toBe(0); seat(k,-1);
  expect(k.phase).toBe('complete'); expect(k.throws).toBe(2); expect(k.nextThrow()).toBe(false);
  k.reset(); expect(k.phase).toBe('idle'); expect(k.throws).toBe(0);
});
it('pauses for an open forceps and requires regrasp after driver release',()=>{
  const k=new GuidedKnot(); k.begin();
  for(let i=0;i<20;i++)k.update(roll(1),idle,0.65,0.65,0.05); expect(k.wrap).toBe(0);
  wrap(k,1); k.positionTail(); k.update(idle,idle,0.1,0.1,0.05); k.update(move(-1),move(1),0.1,0.1,0.05);
  expect(k.seating).toBeGreaterThan(0); k.update(idle,idle,0.1,0.7,0.05);
  expect(k.phase).toBe('tail'); expect(k.seating).toBe(0);
});
