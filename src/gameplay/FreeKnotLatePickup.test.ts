import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {FreeKnotPractice} from './FreeKnotPractice';
it.each([{dt:1/30,radius:.4,depth:.3},{dt:1/20,radius:.4,depth:.3}])('retains a first throw when wrapping precedes tail pickup at display interval $dt',async({dt,radius,depth})=>{
 const ticks=(n:number)=>Math.max(1,Math.round(n/(120*dt)));
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools,'auto');const [left,right]=tools;
 let frames=0;
 const update=async()=>{model.update(dt,tools);if(++frames%120===0)await new Promise(r=>setTimeout(r,0));};
 for(let i=0;i<ticks(240);i++)await update();
 const lp=left.root.position.clone();right.root.position.set(0,1,-.65);
 for(let i=1;i<=ticks(120);i++){left.root.position.copy(lp).lerp(new THREE.Vector3(-radius,1,-.65+depth),i/ticks(120));await update();}
 for(let i=0;i<=ticks(480);i++){const a=i/ticks(480)*Math.PI*2;left.root.position.set(-radius*Math.cos(a),1+radius*Math.sin(a),-.65+depth);await update();}
 expect(Math.abs(model.winding)).toBeGreaterThan(.8);expect(model.passage.hasOpening).toBe(true);
 const from=right.root.position.clone();
 for(let i=1;i<=ticks(180);i++){right.root.position.copy(from).lerp(model.short.points.at(-1)!.clone().sub(new THREE.Vector3(0,0,.05)),i/ticks(180));await update();}
 right.openness=.1;await update();expect(model.gripLabel('right')).toBe('short tail');
 const start=right.root.position.clone();for(let i=1;i<=ticks(480);i++){right.root.position.copy(start);right.root.position.z+=i/ticks(480)*1.6;await update();}
 expect(model.passage.passage).toBeDefined();
 expect(model.retainedThrow.active).toBe(true);
},180000);
