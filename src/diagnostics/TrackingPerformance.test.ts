import {expect,it} from 'vitest';
import {TrackingPerformance} from './TrackingPerformance';
it('reports rolling rates, weighted camera frames and tail latency without retaining stale samples',()=>{
 let now=0;const p=new TrackingPerformance(()=>now);for(let i=0;i<10;i++){now+=500;p.sample('decode',i===9?100:10);p.tick('camera',15);}const s=p.snapshot();expect(s.rows.find(r=>r.name==='decode')).toMatchObject({count:10,rate:2,meanMs:19,p95Ms:100});expect(s.rows.find(r=>r.name==='camera')!.rate).toBe(30);now=11000;expect(p.snapshot().rows).toEqual([]);
});
it('measures failed sync work without swallowing errors and resets counters independently of tracking',()=>{
 let now=0;const p=new TrackingPerformance(()=>now);expect(()=>p.measure('pose',()=>{now=20;throw Error('original');})).toThrow('original');expect(p.snapshot().rows[0].meanMs).toBe(20);p.count('stale');expect(p.snapshot().counters.stale).toBe(1);p.reset();expect(p.snapshot().rows).toEqual([]);expect(p.snapshot().counters).toEqual({});
});
