import {expect,it} from 'vitest';
import * as THREE from 'three';
import {ThreadStrand} from './ThreadStrand';
import {FreeKnotPractice} from '../gameplay/FreeKnotPractice';
import {Instrument} from '../instruments/Instrument';
it('severs material exactly, preserves cut positions, and permits repeated shortening',()=>{
 const strand=new ThreadStrand(1.2,40);strand.reset([new THREE.Vector3(0,.5,0),new THREE.Vector3(1.2,.5,0)]);
 const cut=strand.points[20].clone().lerp(strand.points[21],.4),split=strand.splitAt(20.4)!;
 expect(strand.length+split.fragment.length).toBeCloseTo(1.2,10);
 expect(strand.points.at(-1)!.distanceTo(cut)).toBeLessThan(1e-9);expect(split.fragment.points[0].distanceTo(cut)).toBeLessThan(1e-9);
 expect(strand.count).toBe(22);expect(split.fragment.count).toBe(20);
 const second=strand.splitAt(12.5)!;expect(strand.length+second.fragment.length+split.fragment.length).toBeCloseTo(1.2,10);
 for(let i=0;i<120;i++){strand.advance(1/120,new Map([[0,new THREE.Vector3(0,.5,0)]]),()=>.1);split.fragment.advance(1/120,new Map(),()=>.1);}
 expect(split.fragment.points[0].y).toBeCloseTo(.1,3);expect(strand.measuredLength).toBeCloseTo(strand.length,2);
 expect(strand.splitAt(1)).toBeUndefined();
});
it('keeps retained knot indices intact and transfers a held offcut to its own strand',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
 const knot=model.retainedThrow;knot.phase='seated';knot.first=10;knot.last=16;
 expect(model.cut(model.long,15)).toBe(false);
 const total=model.long.length;expect(model.cut(model.long,35.5)).toBe(true);
 expect(knot.first).toBe(10);expect(knot.last).toBe(16);expect(knot.phase).toBe('seated');
 expect(model.gripLabel('left')).toBe('cut-off strand');expect(model.grips.get('left')!.strand).toBe(model.fragments[0]);
 expect(model.long.length+model.fragments[0].length).toBeCloseTo(total,10);
 model.reset();expect(model.fragments).toHaveLength(0);model.begin(tools);expect(model.long.count).toBe(64);
});
it('restores the full short tail when restarting after a cut',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
 expect(model.cut(model.short,20)).toBe(true);expect(model.short.count).toBeLessThan(40);
 model.begin(tools);expect(model.short.count).toBe(40);expect(model.short.length).toBe(1.2);expect(model.fragments).toHaveLength(0);
});
it('keeps a guided offcut in the closed driver across repeated cuts until release',async()=>{
 const {KnotSlack}=await import('./KnotSlack');const slack=new KnotSlack();
 const point=(x:number)=>new THREE.Vector3(x,.8,0),held=point(1.2);
 slack.update(0,{enabled:true,shortStart:point(0),shortEnd:held,longStart:point(-.1),longEnd:point(-1.2)});
 expect(slack.cut(slack.short,16.4)).toBe(true);
 const fragment=slack.fragments[0];slack.advanceTrimmed(1/120,{short:held});expect(fragment.points.at(-1)!.distanceTo(held)).toBeLessThan(1e-9);
 expect(slack.cut(fragment,8)).toBe(true);const tip=slack.fragments[1];held.x+=.2;
 slack.advanceTrimmed(1/120,{short:held});expect(tip.points.at(-1)!.distanceTo(held)).toBeLessThan(1e-9);
 for(let i=0;i<180;i++)slack.advanceTrimmed(1/120);
 expect(tip.points.at(-1)!.y).toBeLessThan(.6);
 slack.reset();expect(slack.short.count).toBe(32);expect(slack.fragments).toHaveLength(0);expect(slack.trimmed).toBe(false);
});

it('offers each untrimmed tail once and clears trim progress on restart',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
 expect(model.nextTrimTarget).toBe(model.long);
 expect(model.cut(model.long,model.minimumCut(model.long)-.1)).toBe(false);
 expect(model.trimmedTails.size).toBe(0);
 expect(model.cut(model.long,35.5)).toBe(true);expect(model.nextTrimTarget).toBe(model.short);
 expect(model.cut(model.short,20.5)).toBe(true);expect(model.nextTrimTarget).toBeUndefined();
 expect(model.trimHint).toContain('2/2');
 model.begin(tools);expect(model.trimmedTails.size).toBe(0);expect(model.nextTrimTarget).toBe(model.long);
});
it('protects a provisionally captured long-thread loop before it becomes a retained throw',()=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools);
 model.retainedThrow.phase='passed';model.retainedThrow.first=10;model.retainedThrow.last=24;
 const count=model.long.count;
 expect(model.cut(model.long,20)).toBe(false);expect(model.long.count).toBe(count);
 expect(model.retainedThrow.phase).toBe('passed');expect(model.minimumCut(model.long)).toBe(27);
 expect(model.cut(model.long,35)).toBe(true);expect(model.long.count).toBeGreaterThan(model.retainedThrow.last);
});
