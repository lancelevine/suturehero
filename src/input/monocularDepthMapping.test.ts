import {describe,expect,it} from 'vitest';
import {cameraPlaneXY,desiredDepthZ,mapMonocularDepth,smoothDepthZ} from './monocularDepthMapping';
import {MonocularDepthFilter} from './MonocularDepthFilter';
it('continues responding outside the default 100–500 mm range instead of saturating',()=>{
 const a=mapMonocularDepth(600,100,400,1.5),b=mapMonocularDepth(650,100,400,1.5);
 expect(b-a).toBeCloseTo(.8625);expect(mapMonocularDepth(80,100,400,1.5)).toBeLessThan(mapMonocularDepth(90,100,400,1.5));
});
it('retains current depth on unlock while following later physical movement beyond the configured span',()=>{
 const filter=new MonocularDepthFilter(),a=mapMonocularDepth(600,100,400,1.5),b=mapMonocularDepth(650,100,400,1.5);
 filter.update(a,0,true,-.65);expect(filter.update(a,70,false,-.65)).toBe(-.65);let output=-.65;
 for(let i=2;i<40;i++)output=filter.update(b,i*70,false,-.65);expect(output).toBeGreaterThan(.15);
});

describe('virtual placement helpers (moved from tracking.ts)', () => {
  it('uses the size calibration when available, else the working span', () => {
    expect(desiredDepthZ(500, 100, 400, 1, null)).toBeCloseTo(mapMonocularDepth(500, 100, 400, 1));
    expect(desiredDepthZ(500, 100, 400, 2, 0)).toBeCloseTo(-4.6);
    expect(desiredDepthZ(500, 100, 400, 1, 1)).toBeCloseTo(2.3);
  });
  it('smooths small depth changes more than large ones', () => {
    expect(smoothDepthZ(undefined, 1)).toBe(1);
    expect(smoothDepthZ(0, 0.1)).toBeCloseTo(0.025);
    expect(smoothDepthZ(0, 1)).toBeCloseTo(0.65);
  });
  it('places the image centre at X 0 and clamps to the workspace', () => {
    const centre = cameraPlaneXY({ x: 480, y: 270 }, 960, 540, 400, 700, 100, 400);
    expect(centre.x).toBeCloseTo(0);
    expect(centre.y).toBeCloseTo(0.55);
    const far = cameraPlaneXY({ x: 0, y: 540 }, 960, 540, 4000, 700, 100, 400);
    expect(far.x).toBe(2.6);
    expect(far.y).toBe(0.15);
  });
});
