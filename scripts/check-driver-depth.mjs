import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(r.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await installSyntheticCamera(page);
 await page.addInitScript(()=>localStorage.setItem('suturehero.trackerType','ring6'));
 await page.route('**/src/main.ts*',async r=>{const response=await r.fetch(),body=await response.text(),patched=body.replace(/const scissors = new Scissors\(\);/,'window.__depthTools = tools; const scissors = new Scissors();');assert.notEqual(patched,body);await r.fulfill({response,body:patched});});
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 await page.locator('#start-camera').click();
 await page.waitForFunction(()=>document.querySelector('#tracking-filter-diagnostics').textContent.includes('needleDriver: distance'),{},{timeout:45000});
 const sample=()=>page.evaluate(async()=>{
  const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');
  const preview=c.preview('needleDriver');
  return {diagnostics:document.querySelector('#tracking-filter-diagnostics').textContent,position:preview?.position.toArray(),movement:preview?.movement.toArray(),locked:preview?.depthLocked,scene:window.__depthTools[1].root.position.toArray()};
 });
 const locked=await sample();
 // Exercise the instrument calibration control rather than the global lock.
 await page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');c.update('needleDriver',{depthLock:false});});
 await page.waitForTimeout(800);const unlocked=await sample();
 assert.equal(unlocked.locked,false);assert(Math.abs(unlocked.scene[2]-locked.scene[2])<.08,'Unlock must preserve main-scene placement');
 await page.evaluate(()=>window.__ballScene.scale=.72);
 await page.waitForFunction(start=>window.__depthTools[1].root.position.z>start+.2,unlocked.scene[2],{timeout:20000});
 const farther=await sample();assert(farther.position[2]>unlocked.position[2]+.2,'Calibration must follow depth');
 await page.evaluate(()=>window.__ballScene.scale=1.15);
 await page.waitForFunction(start=>window.__depthTools[1].root.position.z<start-.2,farther.scene[2],{timeout:20000});
 const nearer=await sample();assert(nearer.position[2]<farther.position[2]-.2,'Calibration must follow reverse depth');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({locked,unlocked,farther,nearer},null,2));
}finally{await browser.close();}
