import {expect,it} from 'vitest';
import {fieldShift,fieldLift,retainedShift,retainedLift,retainedSurfaceLift,type TissueSite} from './StitchField';
const site=(siteZ:number,changes:Partial<TissueSite>={}):TissueSite=>({siteZ,closure:1,initialGap:.1,eversion:.02,pucker:0,...changes});
it('shares closure between adjacent seated stitches without adding shifts or crossing the edges',()=>{
 const sites=[site(-.375),site(.375)],mid=fieldShift(.05,0,sites);
 expect(mid).toBeGreaterThan(Math.max(...sites.map(s=>retainedShift(.05,0,s)))+.005);
 for(let z=-1.6;z<=1.6;z+=.025){const shift=fieldShift(.05,z,sites);expect(.1-2*shift).toBeGreaterThanOrEqual(.012-1e-8);expect(shift).toBeGreaterThanOrEqual(0);}
 expect(fieldShift(.05,2,sites)).toBeLessThan(.0001);
});
it('leaves wide gaps more open and does not bridge to an unseated stitch',()=>{
 const narrow=[site(-.3),site(.3)],wide=[site(-.65),site(.65)];
 expect(fieldShift(.05,0,narrow)).toBeGreaterThan(fieldShift(.05,0,wide)+.02);
 const open=[site(-.375),site(.375,{closure:0,eversion:0})];
 expect(fieldShift(.05,0,open)).toBe(retainedShift(.05,0,open[0]));
 expect(fieldLift(.05,.41,0,open)).toBe(retainedLift(.05,.41,0,open[0]));
});
it('shares a smooth ridge while retaining local compression, height mismatch and passive fat',()=>{
 const gentle=[site(-.375),site(.375)],tight=[site(-.375,{compression:.006,mismatch:.015}),site(.375,{compression:.006,mismatch:.015})];
 expect(fieldLift(.05,.41,0,gentle)).toBeGreaterThan(Math.max(...gentle.map(s=>retainedLift(.05,.41,0,s))));
 expect(fieldLift(.05,.41,0,tight)).toBeLessThan(fieldLift(.05,.41,0,gentle));
 expect(fieldLift(-.05,.41,0,tight)).toBeGreaterThan(fieldLift(.05,.41,0,tight));
 expect(fieldLift(.05,.05,0,tight)).toBe(0);
 expect(retainedSurfaceLift(.05,0,tight)).toBe(fieldLift(.05,.41,0,tight));
 for(const s of tight)expect(fieldLift(.05,.41,s.siteZ,tight)).toBeCloseTo(retainedLift(.05,.41,s.siteZ,s),6);
 expect(fieldShift(.05,0,[])).toBe(0);expect(fieldLift(.05,.41,0,[])).toBe(0);
});
it('is continuous across stitch centers and keeps isolated stitches unchanged',()=>{
 const sites=[site(-.375),site(.375)];
 for(const s of sites){expect(Math.abs(fieldShift(.05,s.siteZ-1e-5,sites)-fieldShift(.05,s.siteZ+1e-5,sites))).toBeLessThan(.00001);}
 const single=[site(0)];for(const z of [-1,0,.2,1]){expect(fieldShift(.05,z,single)).toBe(retainedShift(.05,z,single[0]));expect(fieldLift(.05,.41,z,single)).toBe(retainedLift(.05,.41,z,single[0]));}
});
