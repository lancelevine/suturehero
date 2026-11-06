import {expect,it} from 'vitest';
import {MonocularDepthSource} from './MonocularDepthSource';
it('does not oscillate between incompatible pose and size distances at rest',()=>{
 const s=new MonocularDepthSource();expect(s.observe(900,1200,0,0).distance).toBe(900);
 for(let i=1;i<=60;i++)expect(s.observe(i%2?null:900,1200,0,i*40).distance).toBeCloseTo(900);
});
it('continues following depth in fallback while fit confidence alternates',()=>{
 const s=new MonocularDepthSource();s.observe(900,1200,0,0);s.observe(null,1200,0,40);
 for(let i=1;i<=20;i++)expect(s.observe(i%2?null:900+i*10,(900+i*10)*4/3,0,40+i*40).distance).toBeCloseTo(900+i*10);
});
it('keeps stationary depth across face changes and noisy planar solutions',()=>{
 const s=new MonocularDepthSource();s.observe(900,1200,0,0);
 for(let i=1;i<=30;i++)expect(s.observe(i%2?980:870,1300,i%2,i*40,true).distance).toBeCloseTo(900);
});
it('restores the pose source after sustained good fits without a handoff jump',()=>{
 const s=new MonocularDepthSource();s.observe(900,1200,0,0);s.observe(null,1200,0,40);
 for(let i=1;i<=8;i++){
  const result=s.observe(900,1200,0,40+i*40);expect(result.distance).toBeCloseTo(900);
  expect(result.source).toBe(i<8?'marker size':'3D pose');
 }
});
it('resets stale source anchors after loss instead of applying old geometry',()=>{
 const s=new MonocularDepthSource();s.observe(900,1200,0,0);
 expect(s.observe(null,1600,0,1000).distance).toBe(1600);
});
