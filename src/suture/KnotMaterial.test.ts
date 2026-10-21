import {expect,it} from 'vitest';
import {KnotMaterial} from './KnotMaterial';
it('draws material into a growing wrap and returns it while tightening without creating length',()=>{
  const m=new KnotMaterial();m.update(0,0.55,0.45);const initial=m.long;
  m.update(0.88,0.55,0.45);expect(m.short+m.long).toBeCloseTo(m.total-0.88);expect(m.long).toBeLessThan(initial);
  const wrapped=m.long;m.update(0.38,1.22,1.32);
  expect(m.long).toBeGreaterThan(wrapped);expect(m.short).toBeGreaterThanOrEqual(1.22);
  expect(m.long).toBeGreaterThanOrEqual(1.32);expect(m.overreach).toBe(false);
  expect(m.short+m.long+m.loop).toBeCloseTo(m.total,12);
  m.update(0.38,4,4);expect(m.overreach).toBe(true);
  expect(m.short+m.long+m.loop).toBeCloseTo(m.total,12);
});
it('preserves seated material through the opposing wrap and retains a fixed allocation at rest',()=>{
  const m=new KnotMaterial();const context={dt:1/60,seating:0,seatedThrows:1,retainedLength:0.377};
  for(let i=0;i<120;i++)m.update(0.88,0.55,0.45,context);
  expect(m.retained).toBe(0.377);expect(m.overreach).toBe(false);
  expect(m.short+m.long+m.loop+m.retained).toBeCloseTo(m.total,12);
  const held=m.short;for(let i=0;i<120;i++)m.update(0.88,0.55,0.45,context);
  expect(m.short).toBe(held);expect(m.friction.state).toBe('holding');
  m.reset();expect(m.retained).toBe(0);expect(m.friction.state).toBe('free');
});
