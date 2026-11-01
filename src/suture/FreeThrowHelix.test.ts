import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {InstrumentThreadContact} from './InstrumentThreadContact';
import {TailPassage} from './TailPassage';
import {FreeThrow} from './FreeThrow';
import {ThreadStrand} from './ThreadStrand';
function fixture(direction:number,tilted:boolean,wraps=1){
 const long=new ThreadStrand(3.5,104),short=new ThreadStrand(2.5,80),passage=new TailPassage(),knot=new FreeThrow(),tool=new Instrument('right',0),contact=new InstrumentThreadContact();
 tool.root.position.set(0,.65,0);if(tilted)tool.root.rotation.set(.4,-.6,.2);tool.root.updateWorldMatrix(true,false);const driver=tool.root.matrixWorld.clone();
 const point=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z).applyMatrix4(driver);
 long.reset([point(1,0,-.2),point(1,0,1.5)]);
 for(let i=20;i<=75;i++){const t=(i-20)/55,a=Math.PI+direction*t*Math.PI*(wraps*2-.1);long.applyContactCorrection(i,point(.12*Math.cos(a),.12*Math.sin(a),.3+t*.8).sub(long.points[i]));}
 const tip=(z:number)=>point(0,.07,z),axis=new THREE.Vector3(0,0,1).transformDirection(driver);
 const setTail=(z:number)=>short.reset([point(.3,-.22,0),tip(.1),tip(z)]);
 passage.update(long.points,tip(.2),driver,false,1,0);
 passage.update(long.points,tip(.2),driver,true,1,0);
 passage.update(long.points,tip(.8),driver,true,1,0);
 setTail(.8);contact.configure([tool]);
 const supports=(points:readonly THREE.Vector3[],normal:THREE.Vector3)=>contact.supportsOpening(tool.id,points,normal);
 const update=(held:number|undefined=79)=>knot.update(1/120,passage,long,short,supports,103,held,axis);
 return {long,short,passage,knot,tool,contact,driver,axis,point,tip,setTail,update};
}
it.each([{direction:1,tilted:false},{direction:-1,tilted:false},{direction:1,tilted:true},{direction:-1,tilted:true},{direction:1,tilted:false,wraps:2},{direction:-1,tilted:true,wraps:2}])('retains the first real helical crossing after metal clears ($direction, tilted $tilted)',({direction,tilted,wraps=1})=>{
 const f=fixture(direction,tilted,wraps);expect(f.passage.passage).toBeDefined();
 f.update();expect(f.knot.phase).toBe('passed');expect(f.knot.lastFailure).toBe('');
 // A held tail can still be between the leading and trailing parts of a helix.
 // Its opening stays in the shaft frame rather than the tilted best-fit plane.
 for(let i=0;i<30;i++){f.setTail(.8+i/30*.7);f.update();expect(f.knot.phase).toBe('passed');}
 f.tool.root.position.copy(f.point(0,0,4));f.contact.configure([f.tool]);f.update();
 expect(f.knot.phase).toBe('retained');expect(f.knot.wraps).toBe(wraps);expect(f.knot.direction).toBe(direction);
});
it('follows the driver axis when a supported helical loop rotates before capture',()=>{
 const f=fixture(1,false);f.update();expect(f.knot.phase).toBe('passed');
 const newPose=f.driver.clone().multiply(new THREE.Matrix4().makeRotationY(1.4)),delta=newPose.clone().multiply(f.driver.clone().invert());
 f.long.points.forEach((p,i)=>f.long.applyContactCorrection(i,p.clone().applyMatrix4(delta).sub(p)));
 f.short.points.forEach((p,i)=>f.short.applyContactCorrection(i,p.clone().applyMatrix4(delta).sub(p)));
 newPose.decompose(f.tool.root.position,f.tool.root.quaternion,f.tool.root.scale);f.contact.configure([f.tool]);
 f.axis.set(0,0,1).transformDirection(newPose);f.update();expect(f.knot.phase).toBe('passed');
});
it.each(['reverse','release'])('still cancels a supported crossing on actual %s',reason=>{
 const f=fixture(1,false);f.update();expect(f.knot.phase).toBe('passed');
 if(reason==='reverse'){f.setTail(.1);f.update();}
 else f.knot.update(1/120,f.passage,f.long,f.short,()=>true,103,undefined,f.axis);
 expect(f.knot.phase).toBe('idle');expect(f.knot.active).toBe(false);
});
