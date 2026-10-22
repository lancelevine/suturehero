import {expect,it} from 'vitest';
import * as THREE from 'three';
import {ThreadStrand} from './ThreadStrand';
import {throwsAreStacked} from './KnotStack';
function fixture(){
 const long=new ThreadStrand(1,41),short=new ThreadStrand(1,41);
 long.points.forEach((p,i)=>p.set(i*.025,0,0));short.points.forEach((p,i)=>p.set(i*.025,0,0));
 const lower={phase:'seated' as 'seated'|'retained',first:2,last:8,shortMaterialCoordinate:8};
 const upper={phase:'seated' as 'seated'|'retained',first:10,last:16,shortMaterialCoordinate:10};
 return {long,short,lower,upper};
}
it('requires compact adjacent material, not just a close point',()=>{
 const {long,short,lower,upper}=fixture();
 expect(throwsAreStacked(lower,upper,long,short)).toBe(true);
 upper.first=16;long.points[16].copy(long.points[8]).add(new THREE.Vector3(.01,0,0));
 expect(throwsAreStacked(lower,upper,long,short)).toBe(false);
});
it('rejects separated, unfinished and reversed material cores',()=>{
 const {long,short,lower,upper}=fixture();
 long.points[upper.first].y=.2;expect(throwsAreStacked(lower,upper,long,short)).toBe(false);
 long.points[upper.first].y=0;upper.phase='retained';expect(throwsAreStacked(lower,upper,long,short)).toBe(false);
 upper.phase='seated';upper.first=lower.last;expect(throwsAreStacked(lower,upper,long,short)).toBe(false);
});

it('rejects post reversal and slack hidden in a short-side bridge',()=>{
 const {long,short,lower,upper}=fixture();
 upper.shortMaterialCoordinate=7;expect(throwsAreStacked(lower,upper,long,short)).toBe(false);
 upper.shortMaterialCoordinate=16;short.points[16].copy(short.points[8]);
 expect(throwsAreStacked(lower,upper,long,short)).toBe(false);
});
