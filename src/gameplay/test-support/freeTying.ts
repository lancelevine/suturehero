import {expect} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../../instruments/Instrument';
import {FreeKnotPractice} from '../FreeKnotPractice';
import type {KnotTechnique} from '../../suture/KnotTechnique';
export function createFreeTyingFixture(technique:KnotTechnique|'auto',advance=(dt:number,model:FreeKnotPractice,tools:Instrument[])=>model.update(dt,tools),motion?:{radius:number;depth:number;pullSide:number;rotation?:[number,number,number]}){
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools,technique);
 const [left,right]=tools;
 for(let i=0;i<240;i++)advance(1/120,model,tools);
 right.root.position.copy(model.short.points.at(-1)!);right.root.position.z-=.05;advance(1/120,model,tools);right.openness=.1;advance(1/120,model,tools);
 expect(model.gripLabel('right')).toBe('short tail');
 const moveToWork=()=>{
  const lp=left.root.position.clone(),rp=right.root.position.clone();
  for(let i=1;i<=240;i++){const t=i/240;right.root.position.copy(rp).lerp(new THREE.Vector3(0,1,-.65),t);left.root.position.copy(lp).lerp(new THREE.Vector3(-.5,1,.55),t);advance(1/120,model,tools);}
 };
 const yieldWorker=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
 const throwOne=async(wraps:number,direction:number)=>{
  moveToWork();
  if(motion?.rotation){
   const start=right.root.quaternion.clone(),target=new THREE.Quaternion().setFromEuler(new THREE.Euler(...motion.rotation));
   for(let i=1;i<=120;i++){right.root.quaternion.copy(start).slerp(target,i/120);advance(1/120,model,tools);if(i%60===0)await yieldWorker();}
  }
  const offset=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z).applyQuaternion(right.root.quaternion);
  const subsequent=model.sequence!.throws.length>0,base=right.root.position.clone(),radius=subsequent?.25:motion?.radius??.5,depth=subsequent?.4:motion?.depth??1.2;
  if(motion){const start=left.root.position.clone(),target=base.clone().add(offset(-radius,0,depth));for(let i=1;i<=120;i++){left.root.position.copy(start).lerp(target,i/120);advance(1/120,model,tools);if(i%60===0)await yieldWorker();}}
  for(let i=0;i<=480*(wraps+(model.sequence!.throws.length ? .35 : 0));i++){const a=direction*i/480*Math.PI*2;left.root.position.copy(base).add(offset(-radius*Math.cos(a),radius*Math.sin(a),depth));advance(1/120,model,tools);if(i%120===0)await yieldWorker();}
  const start=right.root.position.clone();for(let i=1;i<=480;i++){right.root.position.copy(start);right.root.position.add(offset(i/480*(motion?.pullSide??0),0,i/480*(subsequent?.8:1.6)));advance(1/120,model,tools);if(i%120===0)await yieldWorker();}
  const lp=left.root.position.clone(),rp=right.root.position.clone();
  for(let i=1;i<=600;i++){const t=Math.min(1,i/300);left.root.position.copy(lp);left.root.position.x-=2.3*t;right.root.position.copy(rp);right.root.position.x+=.65*t;advance(1/120,model,tools);if(i%120===0)await yieldWorker();}
 };
 const lowerAndPull=async()=>{
  const starts=tools.map(tool=>tool.root.position.clone());
  for(let frame=1;frame<=720;frame++){
   const t=Math.min(1,frame/360);
   tools.forEach((tool,i)=>tool.root.position.copy(starts[i]).lerp(new THREE.Vector3(starts[i].x+(i?.5:-.8),model.entry.y+.05,model.entry.z+.05),t));
   advance(1/120,model,tools);if(frame%120===0)await yieldWorker();
  }
 };
 return {model,tools,throwOne,lowerAndPull,update:(dt:number)=>advance(dt,model,tools)};
}
