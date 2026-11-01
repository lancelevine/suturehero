import {expect,it} from 'vitest';
import {JawCalibration,type JawDistance,type JawEndpoint} from './JawCalibration';
function capture(c:JawCalibration,distance:JawDistance,endpoint:JawEndpoint,separation:number,scale:number,start:number){c.start(distance,endpoint,start);for(let i=0;i<8;i++)c.observe(separation,scale,start+100+i*100,start+100+i*100);}
function calibrated(){const c=new JawCalibration();capture(c,'near','closed',2,20,0);capture(c,'near','open',5,20,1000);capture(c,'far','closed',2.3,10,2000);capture(c,'far','open',5.3,10,3000);return c;}
it('supports one distance immediately and compensates closed/open endpoints across near, middle, far and beyond',()=>{
 const c=new JawCalibration();capture(c,'near','closed',2,20,0);expect(c.endpoints(20)).toBeNull();capture(c,'near','open',5,20,1000);expect(c.endpoints(12)).toEqual({closed:2,open:5});
 capture(c,'far','closed',2.3,10,2000);capture(c,'far','open',5.3,10,3000);
 for(const [scale,closed,open] of [[30,2,5],[20,2,5],[15,2.15,5.15],[10,2.3,5.3],[5,2.3,5.3]]){
  expect(c.endpoints(scale)!.closed).toBeCloseTo(closed);expect(c.endpoints(scale)!.open).toBeCloseTo(open);
  expect(c.update(closed+.02,scale)).toBe(0);
  for(let i=0;i<20;i++)c.update(open,scale);expect(c.value).toBeCloseTo(1,6);
 }
});
it('averages multiple unique frames, trims isolated bad readings and ignores pre-capture history',()=>{
 const c=new JawCalibration();c.observe(99,99,0);c.start('near','closed',10);
 for(let i=0;i<20;i++)c.observe(2,20,20+i,1);expect(c.has('near','closed')).toBe(false);
 for(let i=0;i<7;i++)c.observe(i===3?9:2,20,100+i*100,i+2);
 expect(c.has('near','closed')).toBe(true);capture(c,'near','open',5,20,1000);expect(c.endpoints(20)!.closed).toBeCloseTo(2);
});
it('rejects moving captures, insufficient depth range, reversed labels and inconsistent jaw direction without overwriting good endpoints',()=>{
 const c=calibrated(),original=c.endpoints(15);c.start('near','closed',4000);
 for(let i=0;i<8;i++)c.observe(2+i*.25,20,4100+i*100,4100+i*100);
 expect(c.message).toMatch(/varied too much/);expect(c.endpoints(15)).toEqual(original);
 capture(c,'far','open',5.2,19,5000);expect(c.message).toMatch(/too close or reversed/);expect(c.endpoints(15)).toEqual(original);
 capture(c,'far','open',1,10,6000);expect(c.message).toMatch(/disagree/);expect(c.endpoints(15)).toEqual(original);
});
it('reaches exact closed zero with a small tolerance and releases smoothly beyond the hysteresis band',()=>{
 const c=calibrated();for(let i=0;i<20;i++)c.update(5.15,15);expect(c.value).toBeGreaterThan(.99);
 expect(c.update(2.15+3*.03,15)).toBe(0);expect(c.update(2.15+3*.05,15)).toBe(0);
 expect(c.update(2.15+3*.08,15)).toBeGreaterThan(0);
 expect(c.update(2.15+3*.05,15)).toBeGreaterThan(0);expect(c.update(2.15,15)).toBe(0);
});
it('keeps instruments independent and preserves measurements on timeout or cancellation',()=>{
 const a=calibrated(),b=new JawCalibration();a.start('near','closed',5000);a.poll(7600);expect(a.message).toMatch(/timed out/);expect(a.endpoints(15)).not.toBeNull();expect(b.endpoints(15)).toBeNull();
 a.start('far','closed',8000);a.cancel('cancelled');expect(a.capturing).toBe(false);expect(a.endpoints(15)).not.toBeNull();a.reset();expect(a.endpoints(15)).toBeNull();
});
it('supports endpoints whose separation decreases when opening and bounds association with both distances',()=>{
 const c=new JawCalibration();capture(c,'near','closed',5,20,0);capture(c,'near','open',2,20,1000);capture(c,'far','closed',5.3,10,2000);capture(c,'far','open',2.3,10,3000);
 expect(c.update(5.15,15)).toBe(0);for(let i=0;i<20;i++)c.update(2.15,15);expect(c.value).toBeCloseTo(1,6);expect(c.limits).toEqual({closed:2,open:5.3});
});
it('restores independent saved endpoints without saving live jaw state or pending captures',()=>{
 const a=calibrated();a.update(5,15);a.start('near','closed',5000);const saved=a.snapshot(),b=new JawCalibration();expect(b.restore(saved)).toBe(true);expect(b.endpoints(15)).toEqual(a.endpoints(15));expect(b.capturing).toBe(false);expect(b.value).toBe(0);
 saved.near.closed!.separation=999;expect(b.endpoints(15)!.closed).toBeCloseTo(2.15);
 const before=b.endpoints(15);expect(b.restore({near:{closed:{separation:2,scale:-1}},far:{}})).toBe(false);expect(b.endpoints(15)).toEqual(before);
});
