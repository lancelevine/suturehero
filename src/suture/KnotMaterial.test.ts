import {expect,it} from 'vitest';
import {KnotMaterial} from './KnotMaterial';
it('draws material into a growing wrap and returns it while tightening without creating length',()=>{
  const m=new KnotMaterial();m.update(0,0.55,0.45);const initial=m.long;
  m.update(0.88,0.55,0.45);expect(m.long).toBeCloseTo(initial-0.88);
  const wrapped=m.long;m.update(0.38,1.22,1.32);
  expect(m.long).toBeGreaterThan(wrapped);expect(m.short).toBeGreaterThanOrEqual(1.22);
  expect(m.long).toBeGreaterThanOrEqual(1.32);expect(m.overreach).toBe(false);
  expect(m.short+m.long+m.loop).toBeCloseTo(m.total,12);
  m.update(0.38,4,4);expect(m.overreach).toBe(true);
  expect(m.short+m.long+m.loop).toBeCloseTo(m.total,12);
});
