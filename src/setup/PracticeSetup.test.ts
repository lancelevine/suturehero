import {expect,it} from 'vitest';
import {GUIDED_NEEDLES,NEEDLES,SUTURES,resolveSetup} from './PracticeSetup';
it('resolves common needle and material profiles and falls back on unknown values',()=>{
 expect(resolveSetup('?needle=sh&suture=nylon').needle.tip).toBe('taper');expect(resolveSetup('?needle=ct1').needle.arc).toBe(Math.PI);
 expect(resolveSetup('?needle=missing&suture=missing').needle.id).toBe('ps2');
 expect(resolveSetup('',{trainerDefault:true}).needle.id).toBe('trainer');expect(resolveSetup('?environment=microsurgery',{trainerDefault:true}).needle.id).toBe('ps2');
 expect(NEEDLES.find(p=>p.id==='trainer')!.arc).toBeLessThan(NEEDLES.find(p=>p.id==='ps2')!.arc);
 expect(new Set(SUTURES.map(p=>p.color)).size).toBe(3);expect(new Set(SUTURES.map(p=>p.drag)).size).toBe(3);
 // Every needle used by the guided exercise clears its bite; the Sandbox trainer is shorter on purpose (see PracticeSetup.ts).
 for(const p of GUIDED_NEEDLES){const depth=Math.min(.18,p.radius*.6),start=Math.asin((p.radius-depth)/p.radius);expect(Math.PI-2*start).toBeLessThan(p.arc);expect(p.radius).toBeGreaterThan(.2);}
});
