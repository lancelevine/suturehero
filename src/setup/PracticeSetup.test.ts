import {expect,it} from 'vitest';
import {NEEDLES,SUTURES,resolveSetup} from './PracticeSetup';
it('resolves common needle and material profiles and falls back on unknown values',()=>{
 expect(resolveSetup('?needle=sh&suture=nylon').needle.tip).toBe('taper');expect(resolveSetup('?needle=ct1').needle.arc).toBe(Math.PI);
 expect(resolveSetup('?needle=missing&suture=missing').needle.id).toBe('ps2');
 expect(new Set(SUTURES.map(p=>p.color)).size).toBe(3);expect(new Set(SUTURES.map(p=>p.drag)).size).toBe(3);
 for(const p of NEEDLES){const depth=Math.min(.18,p.radius*.6),start=Math.asin((p.radius-depth)/p.radius);expect(Math.PI-2*start).toBeLessThan(p.arc);expect(p.radius).toBeGreaterThan(.2);}
});
