import {expect,it} from 'vitest';
import * as THREE from 'three';
import {KnotTissueSeat,stitchSupport} from './KnotTissueSeat';
import {ThreadStrand} from './ThreadStrand';
const v=(x:number,y:number,z=0)=>new THREE.Vector3(x,y,z);
function fixture(){
  const long=new ThreadStrand(1.326,40),short=new ThreadStrand(1.326,40),entry=v(.24,.43),exit=v(-.24,.43);
  long.points[0].copy(exit);short.points[0].copy(entry);short.points[8].set(0,.46,0);
  for(let i=8;i<=14;i++){const a=(i-8)/6*Math.PI*2;long.points[i].set(.025*Math.cos(a),.46+.025*Math.sin(a),0);}
  const knot={active:true,phase:'seated' as const,first:8,last:14,shortMaterialCoordinate:8};
  const seat=new KnotTissueSeat(),update=()=>seat.update(knot,long,short,entry,exit,()=>.423);
  return {long,short,entry,exit,knot,seat,update};
}
it('requires actual support near the stitch, not just a compact throw',()=>{
  for(const offset of [v(0,.3),v(0,0,.5),v(0,-.08)]){
    const f=fixture();for(let i=8;i<=14;i++)f.long.points[i].add(offset);
    f.update();expect(f.seat.contact).toBe(false);expect(f.seat.load).toBe(0);
  }
});
it('requires both tissue-side arms to have taken up their slack',()=>{
  for(const side of ['long','short'] as const){
    const f=fixture();f[side].setMaterialLength(4);f.update();
    expect(f.seat.contact).toBe(true);expect(f.seat.load).toBe(0);
  }
  const f=fixture();f.update();expect(f.seat.contact).toBe(true);expect(f.seat.load).toBe(1);
});
it('retains achieved bearing after exterior tails relax, but loses load on lifting or resetting the knot',()=>{
  const f=fixture();f.update();expect(f.seat.load).toBe(1);
  f.long.points[39].set(-.2,.423,.6);f.short.points[39].set(.2,.423,.6);f.update();expect(f.seat.load).toBe(1);
  for(let i=8;i<=14;i++)f.long.points[i].y+=.1;
  f.update();expect(f.seat.load).toBe(0);expect(f.seat.contact).toBe(false);
  f.seat.reset();expect(f.seat.clearance).toBe(Infinity);
});
it('bridges only the local stitch seam while preserving the environment surface elsewhere',()=>{
  const entry=v(.24,.43),exit=v(-.24,.43);
  expect(stitchSupport(v(0,.44),entry,exit,()=>-.445)).toBeCloseTo(.43);
  expect(stitchSupport(v(0,.44,.4),entry,exit,()=>-.445)).toBeCloseTo(-.445);
  expect(stitchSupport(v(.2,.44),entry,exit,()=>.45)).toBe(.45);
});
