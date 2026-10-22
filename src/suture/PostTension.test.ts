import {expect,it} from 'vitest';
import * as THREE from 'three';
import {ThreadStrand} from './ThreadStrand';
import {postIsTaut} from './PostTension';
it('recognizes a straight post even with slack between the knot and tissue',()=>{
 const strand=new ThreadStrand(1.2,13);
 strand.points.forEach((p,i)=>p.set(i<6?.1*Math.sin(i):.1*(i-6),0,0));
 expect(postIsTaut(strand,12,6)).toBe(true);expect(postIsTaut(strand,12)).toBe(false);
 strand.points[12].x=.4;expect(postIsTaut(strand,12,6)).toBe(false);
 expect(postIsTaut(strand,undefined,6)).toBe(false);
});
