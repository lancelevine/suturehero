import {expect,it} from 'vitest';
import {Euler,Quaternion,Vector3} from 'three';
import {tiltCorrectedSize,SizeDepthCalibration} from './tiltSizeDepth';
const square=(z:number,pitch=0,yaw=0,roll=0,tx=0,ty=0)=>{
 const q=new Quaternion().setFromEuler(new Euler(pitch,yaw,roll));
 return {id:0,corners:[[-8,-8],[8,-8],[8,8],[-8,8]].map(([x,y])=>{const p=new Vector3(x,y,0).applyQuaternion(q).add(new Vector3(tx,ty,z));return {x:960+1200*p.x/p.z,y:540+1200*p.y/p.z};})};
};
it('corrects tilt and image roll at fixed depth through moderate combined angles',()=>{
 for(const z of [200,500,1000])for(const pitch of [0,.3,.6])for(const yaw of [0,.4,.8])for(const roll of [0,.7,1.5]){
  const m=tiltCorrectedSize(square(z,pitch,yaw,roll),1920)!;
  expect(m).not.toBeNull();expect(Math.abs(m.sidePx/(16*1200/z)-1)).toBeLessThan(.01);
 }
});
it('accounts for off-center view rays and resolution changes',()=>{
 for(const tx of [-120,0,120])for(const ty of [-60,0,60]){
  const marker=square(500,.3,.6,.7,tx,ty),m=tiltCorrectedSize(marker,1920,1080,1200)!;
  expect(Math.abs(m.sidePx/(16*1200/500)-1)).toBeLessThan(.02);
  const doubled={...marker,corners:marker.corners.map(p=>({x:p.x*2,y:p.y*2}))};
  expect(tiltCorrectedSize(doubled,3840,2160,2400)!.normalizedSide).toBeCloseTo(m.normalizedSide);
 }
});
it('rejects edge-on, tiny and malformed squares instead of amplifying errors',()=>{
 expect(tiltCorrectedSize(square(500,0,1.3),1920)).toBeNull();
 expect(tiltCorrectedSize(square(3000),1920)).toBeNull();
 expect(tiltCorrectedSize({id:0,corners:[{x:0,y:0},{x:30,y:30},{x:0,y:30},{x:30,y:0}]},1920)).toBeNull();
});
it('uses inverse size to map Near, Far and a tilted physical midpoint',()=>{
 const c=new SizeDepthCalibration(),sample=(z:number,yaw=0)=>{const m=tiltCorrectedSize(square(z,0,yaw),1920)!;return {proxy:16/m.normalizedSide,normalizedSide:m.normalizedSide,binding:'camera:ring6',instrument:'needleDriver'};};
 c.setNear(sample(300));expect(c.setFar(sample(900))).toBe(true);
 expect(c.fraction(sample(300).proxy,'camera:ring6')).toBeCloseTo(0);
 expect(c.fraction(sample(900).proxy,'camera:ring6')).toBeCloseTo(1);
 expect(c.fraction(sample(600,.8).proxy,'camera:ring6')).toBeCloseTo(.5,2);
 expect(c.fraction(sample(1100).proxy,'camera:ring6')).toBeGreaterThan(1);
 expect(c.fraction(sample(600).proxy,'other camera')).toBeNull();
 const restored=new SizeDepthCalibration();expect(restored.restore(JSON.parse(JSON.stringify(c)))).toBe(true);expect(restored.fraction(sample(600).proxy,'camera:ring6')).toBeCloseTo(.5,2);
 expect(c.setFar({...sample(1000),instrument:'forceps'})).toBe(false);
 expect(c.setFar(sample(300))).toBe(false);
});
