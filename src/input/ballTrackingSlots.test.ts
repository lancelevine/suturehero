import {describe,expect,it} from 'vitest';
import {BALL_INSTRUMENTS,ballTrackingSlot} from './ballTrackingSlots';

describe('ball tracking assignments',()=>{
 it('maps A and B to the distinct slots belonging to each instrument',()=>{
  expect(ballTrackingSlot('forceps',0)).toBe(0);
  expect(ballTrackingSlot('forceps',1)).toBe(1);
  expect(ballTrackingSlot('needleDriver',0)).toBe(2);
  expect(ballTrackingSlot('needleDriver',1)).toBe(3);
  expect(ballTrackingSlot('scissors',0)).toBe(4);
  expect(ballTrackingSlot('scissors',1)).toBe(5);
 });
 it('does not alias slots across instruments',()=>{
  const assigned=BALL_INSTRUMENTS.flatMap(instrument=>[
   ballTrackingSlot(instrument,0),
   ballTrackingSlot(instrument,1)
  ]);
  expect(assigned).toEqual([0,1,2,3,4,5]);
  expect(new Set(assigned).size).toBe(6);
 });
});
