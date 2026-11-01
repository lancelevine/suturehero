// Vite dev-server check: exercise real controls against repeatable forceps poses.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5175/').href);
 await page.locator('[data-calibration-tool=forceps]').click();
 await page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts'),T=await import('/node_modules/.vite/deps/three.js');window.rotation=[0,0,0];window.feed=setInterval(()=>{const axis=new T.Vector3(...window.rotation),angle=axis.length();c.transform('forceps',new T.Vector3(),angle?new T.Quaternion().setFromAxisAngle(axis.normalize(),angle):new T.Quaternion());},50);});
 await page.waitForFunction(()=>!document.querySelector('[data-neutral]').disabled);await page.locator('[data-neutral]').click();
 await page.locator('[data-calibration-pane=axes]').click();
 const leftRight=page.getByRole('checkbox',{name:'Invert rotation Left/right tilt · about Z',exact:true});
 assert.equal(await leftRight.getAttribute('data-index'),'2');assert.equal(await page.locator('[data-axis=rotation]').first().inputValue(),'2');
 await page.evaluate(()=>window.rotation=[0,0,.4]);
 const handleX=()=>page.locator('[data-preview-tool] path').first().getAttribute('d').then(d=>Number(d.match(/^M(-?\d+\.?\d*)/)[1]));
 await page.waitForFunction(()=>Number(document.querySelector('[data-preview-tool] path').getAttribute('d').match(/^M(-?\d+\.?\d*)/)[1])<145);
 const before=await handleX();await leftRight.check();
 await page.waitForFunction(()=>Number(document.querySelector('[data-preview-tool] path').getAttribute('d').match(/^M(-?\d+\.?\d*)/)[1])>155);
 assert(await handleX()>before+15,'left/right invert must visibly reverse the handle tilt');
 const profile=await page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return {forceps:c.profile('forceps'),driver:c.profile('needleDriver')};});
 assert.deepEqual(profile.forceps.rotationInvert,[false,false,true]);assert.deepEqual(profile.driver.rotationInvert,[false,false,false]);
 assert.deepEqual(profile.forceps.translationInvert,[false,false,false]);
 await leftRight.uncheck();await page.waitForFunction(()=>Number(document.querySelector('[data-preview-tool] path').getAttribute('d').match(/^M(-?\d+\.?\d*)/)[1])<145);
 // Check the other two physical rotation rows independently using the actual mapped output.
 for(const [label,input,axis] of [['Forward/back tilt · about X',[.4,0,0],0],['Axial roll · about Y',[0,.4,0],1]]){
  await page.evaluate(p=>window.rotation=p,input);
  await page.waitForFunction(async axis=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return c.preview('forceps')?.mappedRotation.getComponent(axis)>.35;},axis);
  await page.getByRole('checkbox',{name:'Invert rotation '+label,exact:true}).check();
  await page.waitForFunction(async axis=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return c.preview('forceps')?.mappedRotation.getComponent(axis)<-.35;},axis);
 }
 await leftRight.check();await page.locator('[data-save]').click();await page.evaluate(()=>clearInterval(window.feed));await page.reload();
 await page.locator('[data-calibration-tool=forceps]').click();await page.locator('[data-calibration-pane=axes]').click();
 for(const index of [0,1,2])assert(await page.locator(`[data-invert=rotation][data-index="${index}"]`).isChecked());
 assert.deepEqual(errors,[]);console.log('Passed: forceps left/right checkbox visibly reverses tilt, all three rotation rows invert their intended output, movement/driver isolation and saved profile reload.');
}finally{await browser.close();}
