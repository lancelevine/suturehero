import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR??'/tmp/suturehero-aruco',new URL(r.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await installSyntheticCamera(page);await page.addInitScript(()=>localStorage.setItem('suturehero.trackerType','ring6'));
 await page.route('**/src/tracking.ts*',async r=>{const response=await r.fetch(),body=await response.text();const patched=body.replace(/function stereoPrismRotation\(name, now\) \{/, '$&\nif(window.__forceCenter)return null;');assert.notEqual(patched,body);await r.fulfill({response,body:patched});});
 await page.goto('http://127.0.0.1:5173/tracking.html');
 await page.evaluate(()=>window.__ballScene.camera2={shift:-135});
 await page.locator('#camera-select').selectOption('synthetic',{force:true});await page.locator('#start-camera').click();
 await page.locator('#camera-select-2').selectOption('synthetic-secondary',{force:true});await page.locator('#start-camera-2').evaluate(e=>e.click());
 await page.locator('#tracking-mode').selectOption('stereo',{force:true});
 const camera={cameraMatrix:[[1800,0,480],[0,1800,270],[0,0,1]],distortionCoefficients:[0,0,0,0,0]};
 const calibration={format:'suturehero-stereo-calibration-v1',imageSize:{width:960,height:540},camera1:camera,camera2:camera,stereo:{rotation:[[1,0,0],[0,1,0],[0,0,1]],translationMm:[-60,0,0],baselineMm:60,rmsPx:0}};
 await page.locator('#stereo-import').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(calibration))});
 await page.waitForFunction(()=>document.querySelector('#stereo-geometry-status').textContent.includes('Calibration loaded'));
 await page.locator('#stereo-enable').evaluate(e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));});
 const position=()=>page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return c.preview('needleDriver')?.position.z;});
 await page.waitForFunction(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return c.preview('needleDriver')?.depthLocked===false;},{},{timeout:30000});
 for(const fallback of [false,true]){
  await page.evaluate(f=>{window.__forceCenter=f;window.__ballScene.scale=1;},fallback);await page.waitForTimeout(1200);const start=await position();
  await page.evaluate(()=>window.__ballScene.scale=.75);
  await page.waitForFunction(async start=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return Math.abs(c.preview('needleDriver').position.z-start)>.75;},start,{timeout:5000});
  await page.waitForTimeout(1000);const far=await position();assert(far<start-.75,JSON.stringify({start,far}));await page.evaluate(()=>window.__ballScene.scale=1.2);
  await page.waitForFunction(async far=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return Math.abs(c.preview('needleDriver').position.z-far)>1;},far,{timeout:5000});
  await page.waitForTimeout(1000);const near=await position();assert(near>far+1,JSON.stringify({far,near}));console.log({fallback,start,far,near});
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
