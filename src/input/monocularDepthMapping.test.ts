import {expect,it} from 'vitest';
import {mapMonocularDepth} from './monocularDepthMapping';
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
