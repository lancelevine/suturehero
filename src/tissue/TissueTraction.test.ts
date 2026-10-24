import {expect,it} from 'vitest';
import {TissueTraction} from './TissueTraction';
it('keeps gentle eversion secure and recovers from a brief excessive pull',()=>{
 const t=new TissueTraction();t.beginGrip();for(let i=0;i<120;i++)expect(t.advance(1/60,.15)).toBe(true);
 expect(t.state).toBe('gentle');expect(t.load).toBe(0);
 for(let i=0;i<12;i++)expect(t.advance(1/60,.32)).toBe(true);expect(t.state).toBe('slipping');expect(t.progress).toBeGreaterThan(0);
 for(let i=0;i<60;i++)expect(t.advance(1/60,.15)).toBe(true);expect(t.state).toBe('gentle');expect(t.progress).toBe(0);expect(t.peakLoad).toBeGreaterThan(.6);
 t.release();for(let i=0;i<90;i++)t.relax(1/60);expect(t.state).toBe('released');expect(t.stretch).toBe(0);t.reset();expect(t.peakLoad).toBe(0);
});
it.each([1/30,1/60,1/120])('loses a sustained overloaded grasp in a bounded interval (dt %f)',dt=>{
 const t=new TissueTraction();t.beginGrip();let time=0;
 while(t.advance(dt,.34)&&time<2)time+=dt;
 expect(t.state).toBe('slipped');expect(time).toBeGreaterThan(.7);expect(time).toBeLessThan(.8);expect(t.peakLoad).toBe(1);
 t.beginGrip();expect(t.state).toBe('gentle');expect(t.progress).toBe(0);
});
