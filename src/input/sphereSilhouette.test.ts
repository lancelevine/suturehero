import {expect,it} from 'vitest';
import {findSphereSilhouette,sphereSeeds} from './sphereSilhouette';
function image(rect=false){
 const w=130,h=110,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const inside=rect?Math.abs(x-70)<14&&Math.abs(y-55)<14:(x-70)**2+(y-55)**2<=14**2;
  const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=inside?230:40;data[i+3]=255;
 }return {data,w,h};
}
it('continues on a circular silhouette without requiring a stripe template',()=>{
 const {data,w,h}=image(),balls=findSphereSilhouette(data,w,h,{x:66,y:53},14);expect(balls.length).toBeGreaterThan(0);expect(Math.hypot(balls[0].x-70,balls[0].y-55)).toBeLessThan(3);
});
it('proposes off-prediction circle centers for whole-image reacquisition',()=>{
 const {data,w,h}=image(),result=sphereSeeds(data,w,h,14,true);expect(result.seeds.some(p=>Math.hypot(p.x-70,p.y-55)<5)).toBe(true);
});
it('rejects a flat unstructured image',()=>{const {data,w,h}=image();data.fill(220);expect(findSphereSilhouette(data,w,h,{x:60,y:50},14)).toEqual([]);});
