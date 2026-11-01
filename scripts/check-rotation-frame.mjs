// Run against a freshly started Vite dev server, with no source edits during the check.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('suturehero.instrument-calibration.v1',JSON.stringify({needleDriver:{rotationAxes:[2,1,0],rotationInvert:[false,false,false]}})));
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5180/').href);
 await page.locator('[data-calibration-pane=axes]').click();
 assert.deepEqual(await page.locator('[data-axis=rotation]').evaluateAll(els=>els.map(e=>e.value)),['0','2','1']);
 assert(await page.locator('[data-invert=rotation][data-index="1"]').isChecked(),'stored X/Z swap needs a companion roll correction');
 await page.locator('[data-calibration-pane=pose]').click();
 await page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts'),T=await import('/node_modules/.vite/deps/three.js');window.roll=0;window.tilt=0;window.feed=setInterval(()=>{const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),window.tilt).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),window.roll));c.transform('needleDriver',new T.Vector3(),q);},50);});
 await page.waitForFunction(()=>!document.querySelector('[data-neutral]').disabled);await page.locator('[data-neutral]').click();
 const x=()=>page.locator('[data-preview-tool] path').first().getAttribute('d').then(d=>Number(d.match(/^M(-?\d+\.?\d*)/)[1]));
 const settle=async(roll,tilt)=>{
  await page.locator('.calibration-live-preview').scrollIntoViewIfNeeded();await page.evaluate(({roll,tilt})=>{window.roll=roll;window.tilt=tilt;},{roll,tilt});
  await page.waitForFunction(async({roll,tilt})=>{
   const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts'),T=await import('/node_modules/.vite/deps/three.js'),{trackedInstrumentRotation}=await import('/src/input/trackingFrame.ts');
   const s=c.preview('needleDriver');if(!s)return false;
   const raw=s.rawRotation.clone(),angle=raw.length(),actual=angle?new T.Quaternion().setFromAxisAngle(raw.normalize(),angle):new T.Quaternion();
   const target=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),tilt).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),roll));if(actual.angleTo(target)>.001)return false;
   const point=new T.Vector3(-.18,0,1.62).multiplyScalar(.8).applyQuaternion(trackedInstrumentRotation(s.quaternion)).add(s.movement);
   const expected=150+75*(point.x+point.z*.42),d=document.querySelector('[data-preview-tool] path').getAttribute('d');return Math.abs(Number(d.match(/^M(-?\d+\.?\d*)/)[1])-expected)<.05;
  },{roll,tilt});
 };
 const deltas=[];
 for(const roll of [0,Math.PI/3,Math.PI*2/3,Math.PI]){
  await settle(roll,0);const before=await x();await settle(roll,.2);deltas.push(await x()-before);
 }
 assert(deltas.every(delta=>delta<-5),'forward tilt must stay in the same direction across faces: '+deltas);
 await page.locator('[data-calibration-pane=axes]').click();const rollInvert=page.locator('[data-invert=rotation][data-index="1"]');await rollInvert.uncheck();
 assert(await page.locator('[data-invert=rotation][data-index="0"]').isChecked(),'roll edit must adjust pitch rather than undo the requested checkbox');
 assert.match(await page.locator('[data-calibration-message]').textContent(),/forward\/back tilt also adjusted/);
 await page.evaluate(()=>clearInterval(window.feed));assert.deepEqual(errors,[]);console.log('Passed: stored X/Z correction, consistent visible needle-driver tilt through four face orientations, and explicit roll checkbox with visible companion correction.');
}finally{await browser.close();}
