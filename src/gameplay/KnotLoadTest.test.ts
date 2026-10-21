import {expect,it} from 'vitest';
import {KnotLoadTest} from './KnotLoadTest';
it('requires regrasp and sustained gentle stretch rather than elapsed time or slack motion',()=>{
  const t=new KnotLoadTest();t.begin();t.sample(0.9,1);
  for(let i=0;i<100;i++)t.update(0.05,false,false,1);
  expect(t.stage).toBe('grasp');expect(t.travel).toBe(0);
  t.update(0.05,true,false,0);for(let i=0;i<100;i++)t.update(0.05,true,false,0);
  expect(t.held).toBe(0);t.sample(1.04,1);expect(t.load).toBeCloseTo(0.32);
  for(let i=0;i<31;i++)t.update(0.05,true,false,0);
  expect(t.stage).toBe('passed');expect(t.slipRate).toBe(0);
  t.reset();expect(t.active).toBe(false);expect(t.load).toBe(0);
});
it('resets the hold when load leaves the gentle range and fails for release or excess slip',()=>{
  const t=new KnotLoadTest();t.begin();t.update(0.05,true,false,0);t.sample(1.04,1);t.update(0.05,true,false,0);
  t.sample(1.2,1);expect(t.slipRate).toBeGreaterThan(0);t.update(0.05,true,false,0);expect(t.held).toBe(0);
  t.slip=0.03;t.update(0.05,true,false,0);expect(t.stage).toBe('failed');expect(t.closureTarget).toBeLessThan(0.9);
  t.reset();t.begin();t.update(0.05,true,false,0);t.update(0.05,false,true,0);expect(t.stage).toBe('failed');
});
