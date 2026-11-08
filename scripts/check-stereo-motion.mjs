import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR??'/tmp/suturehero-aruco',new URL(r.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await installSyntheticCamera(page);await page.addInitScript(()=>localStorage.setItem('suturehero.trackerType','ring6'));
 await page.route('**/src/tracking.ts*',async r=>{const response=await r.fetch(),body=await response.text();let patched=body.replace(/function stereoPrismRotation\(name, now\) \{/, '$&\nif(window.__forceCenter)return null;');assert.notEqual(patched,body);if(process.env.SUTURE_STEREO_DELAY)patched=patched.replace('pending.resolve(data.found ?? []);',"setTimeout(()=>pending.resolve(data.found ?? []),this.label==='Camera 2 flow'?35:0);");await r.fulfill({response,body:patched});});
 await page.goto(process.env.SUTURE_MAIN_STATUS?'http://127.0.0.1:5173/?graphics=low':'http://127.0.0.1:5173/tracking.html');
 // Camera 2's view is shifted by the disparity of the synthetic marker's depth:
 // 36 px for a 12 mm square at fx 1800 → 600 mm, and 1800 × 60 mm baseline / 600 mm = 180 px.
 // (Was 135 px, matching the old 16 mm assumption.)
 await page.evaluate(()=>window.__ballScene.camera2={shift:-180});
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
 // Large synthetic depth jumps (~270–470 mm) take ~2 s to settle through the pose smoothing (traced
 // 2026-11-08: −3.91 → −2.08 over 3 s, still moving at the old fixed 1 s read). Wait until the position
 // stops changing (≤ 0.02 between 250 ms samples, at most 4 s); the movement thresholds are unchanged.
 // Move the synthetic marker in depth over ~1 s like a hand would, instead of teleporting it 270–470 mm in
 // one frame: with unsynchronised cameras a teleport pairs an old view with a new one for a frame or two,
 // and the stereo continuity limits then (correctly) refuse the impossible jump, freezing the pose.
 const ramp=async target=>{const from=await page.evaluate(()=>window.__ballScene.scale??1);for(let k=1;k<=20;k++){await page.evaluate(v=>{window.__ballScene.scale=v;},from+(target-from)*k/20);await page.waitForTimeout(50);}};
 const settled=async()=>{let previous=await position();for(let k=0;k<16;k++){await page.waitForTimeout(250);const now=await position();if(Math.abs(now-previous)<=.02)return now;previous=now;}return previous;};
 for(const fallback of (process.env.SUTURE_STEREO_DELAY||process.env.SUTURE_MAIN_STATUS)?[]:[false]){
  await page.evaluate(f=>{window.__forceCenter=f;window.__ballScene.scale=1;},fallback);await page.waitForTimeout(1200);const start=await position();
  // Far at ~867 mm (600 mm / 0.69): the original 267 mm start→far movement with 12 mm squares.
  await ramp(.69);
  await page.waitForFunction(async start=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return Math.abs(c.preview('needleDriver')?.position.z-start)>.75;},start,{timeout:5000});
  const far=await settled();assert(far<start-.75,JSON.stringify({start,far}));
  // Near at 400 mm (600 mm / 1.5), keeping the original 400 mm far→near movement with 12 mm squares.
  await ramp(1.5);
  await page.waitForFunction(async far=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return Math.abs(c.preview('needleDriver')?.position.z-far)>1;},far,{timeout:5000});
  const near=await settled();assert(near>far+1,JSON.stringify({far,near}));console.log({fallback,start,far,near});
 }
 // Exercise each physical camera dropout, not just a rejected corner fit.
 await page.evaluate(()=>{window.__forceCenter=false;window.__ballScene.scale=1;window.__ballScene.camera2={shift:-180,marker:true};});
 await page.waitForTimeout(1300);
 await page.evaluate(()=>window.__ballScene.marker=false);
 await page.waitForFunction(()=>document.querySelector('#stereo-view-label').textContent.includes('Camera 2'),{},{timeout:5000});
 const xy=()=>page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return c.preview('needleDriver')?.position.toArray();});
 if(process.env.SUTURE_MAIN_STATUS)await page.waitForFunction(()=>/fallback.*Camera 2/.test(document.querySelector('#practice-tracking-status').textContent));
 const secondStart=await xy();await page.evaluate(()=>window.__ballScene.camera2.shift=-80);await page.waitForTimeout(800);const secondMove=await xy();
 assert(secondMove[0]>secondStart[0]+.12,JSON.stringify({secondStart,secondMove}));
 await page.evaluate(()=>{window.__ballScene.marker=true;window.__ballScene.camera2={shift:-180,marker:true};});
 await page.waitForFunction(()=>document.querySelector('#stereo-view-label').textContent.includes('ACTIVE'),{},{timeout:5000});await page.waitForTimeout(1000);
 await page.evaluate(()=>window.__ballScene.camera2.marker=false);
 await page.waitForFunction(()=>document.querySelector('#stereo-view-label').textContent.includes('Camera 1'),{},{timeout:5000});
 if(process.env.SUTURE_MAIN_STATUS)await page.waitForFunction(()=>/fallback.*Camera 1/.test(document.querySelector('#practice-tracking-status').textContent));
 const firstStart=await xy();await page.evaluate(()=>window.__ballScene.shift=100);await page.waitForTimeout(800);const firstMove=await xy();
 assert(firstMove[0]>firstStart[0]+.12,JSON.stringify({firstStart,firstMove}));
 await page.evaluate(()=>{window.__ballScene.shift=0;window.__ballScene.camera2.marker=true;});
 await page.waitForFunction(()=>document.querySelector('#stereo-view-label').textContent.includes('ACTIVE'),{},{timeout:5000});
 console.log('Passed: movement with either camera missing and automatic stereo recovery.');
 if(process.env.SUTURE_STEREO_DELAY){
  await page.evaluate(()=>{
   const start=performance.now();window.__movingStereo=true;
   const move=()=>{if(!window.__movingStereo)return;window.__ballScene.yShift=45*Math.sin((performance.now()-start)/600);requestAnimationFrame(move);};move();
  });
  const samples=[];
  for(let i=0;i<35;i++){
   await page.waitForTimeout(100);
   samples.push(await page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return {y:c.preview('needleDriver')?.position.y,status:document.querySelector('#stereo-view-label').textContent};}));
  }
  await page.evaluate(()=>window.__movingStereo=false);
  const active=samples.filter(s=>s.status.includes('ACTIVE')).length;
  const changes=samples.slice(1).filter((s,i)=>Math.abs(s.y-samples[i].y)>.003).length;
  assert(active>8,JSON.stringify({active,samples}));assert(changes>20,JSON.stringify({changes,samples}));
  console.log('Passed: continuous vertical motion with 35 ms extra secondary worker delay.',{active,changes});
 }
 if(process.env.SUTURE_MAIN_STATUS){await page.waitForFunction(()=>document.querySelector('#practice-tracking-status').textContent.includes('triangulation ACTIVE'));await page.locator('#camera-tracking-hide').evaluate(e=>e.click());assert(await page.locator('#practice-tracking-status').isVisible());console.log('Passed: live stereo status remains visible on main screen with camera controls hidden.');}
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
