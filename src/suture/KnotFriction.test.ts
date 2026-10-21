import {expect,it} from 'vitest';
import {KnotFriction} from './KnotFriction';
it('holds small material changes, resists larger slips and increases resistance with a seated throw',()=>{
  const contact=new KnotFriction();
  expect(contact.advance(1,1.004,1/60,1,0)).toBe(1);expect(contact.state).toBe('holding');
  const first=contact.advance(1,1.5,1/60,1,0);
  expect(first).toBeGreaterThan(1);expect(first).toBeLessThan(1.5);expect(contact.state).toBe('sliding');
  expect(contact.advance(1,1.5,1/60,1,1)).toBeLessThan(first);
  expect(contact.advance(1,1.5,0,1,1)).toBe(1);
  expect(contact.advance(1,1.5,1/60,0,0)).toBe(1.5);expect(contact.state).toBe('free');
  contact.reset();expect(contact.state).toBe('free');
});
