import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {PracticeSession} from './PracticeSession';
import {REST_COMMAND} from '../input/InstrumentControls';
it.each(['skin','microsurgery'] as const)('holds the short tail near its tip without idle chatter in %s',environment=>{
 const tools=[new Instrument('left',0),new Instrument('right',0)],session=new PracticeSession({sample:()=>REST_COMMAND,dispose:()=>{}},tools);
 session.setEnvironment(environment);session.beginFreeTying('auto');const model=session.freeKnot;
 for(let i=0;i<360;i++)model.update(1/120,tools);
 const driver=tools[1],target=model.short.points[model.short.count-(environment==='microsurgery'?2:4)].clone();
 if(environment==='microsurgery'){driver.root.rotation.y=target.z<0?Math.PI:0;target.x+=.07;}
 driver.root.position.copy(target).sub(new THREE.Vector3(0,0,.05).applyQuaternion(driver.root.quaternion));
 driver.openness=.7;model.update(1/120,tools);driver.openness=.1;model.update(1/120,tools);
 expect(model.gripLabel('right')).toBe('short tail');
 const origin=driver.root.position.clone();let tip=0,body=0,tool=0;
 for(let i=0;i<720;i++){
  const before=model.short.points.map(p=>p.clone());model.update(1/120,tools);
  if(i>600){tip=Math.max(tip,model.short.points.at(-1)!.distanceTo(before.at(-1)!));body=Math.max(body,...model.short.points.map((p,j)=>p.distanceTo(before[j])));tool=Math.max(tool,driver.root.position.distanceTo(origin));}
 }
 expect(tip).toBeLessThan(.001);expect(body).toBeLessThan(.001);expect(tool).toBeLessThan(.001);
},30000);
