import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera,presetCalibration} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR??'/tmp/suturehero-aruco',new URL(r.request().url()).pathname.split('/').at(-1)))}));
 await installSyntheticCamera(page);await page.addInitScript(()=>localStorage.setItem('suturehero.trackerType','ring6'));
 await page.route('**/src/tracking.ts*',async r=>{const response=await r.fetch(),body=await response.text(),patched=body.replaceAll('const id = ++this.sequence;',"if(window.__rigFrames){const o=typeof origin==='object'&&origin?origin:{x:0,y:0};if(typeof bitmap!=='undefined')bitmap.close();return Promise.resolve(window.__rigFrames[this.label.startsWith('Camera 2')?1:0].map(m=>({...m,corners:m.corners.map(p=>({x:p.x-o.x,y:p.y-o.y}))})));}\nconst id = ++this.sequence;");assert.notEqual(patched,body);await r.fulfill({response,body:patched});});
 await page.goto(new URL('tracking.html',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 const scene=async(face1=0,face2=4,z=600,turn=0)=>page.evaluate(async({face1,face2,z,turn})=>{
  const {faceGeometry,localCorners}=await import('/src/input/prismPose.ts'),g=faceGeometry(0,'ring6'),q=g.rotation.clone().setFromAxisAngle(g.center.clone().set(0,1,0),Math.PI+turn);
  window.__rigFrames=[face1,face2].map((face,camera)=>[{id:face,corners:localCorners(face,'ring6').map(p=>{p.applyQuaternion(q).add(g.center.clone().set(0,-15,z));if(camera)p.set(p.z-600,p.y,500-p.x);return {x:480+700*p.x/p.z,y:270+700*p.y/p.z};})}]);
 },{face1,face2,z,turn});
 await scene();await page.locator('#camera-select').selectOption('synthetic',{force:true});await page.locator('#start-camera').click();await page.locator('#camera-select-2').selectOption('synthetic-secondary',{force:true});await page.locator('#start-camera-2').evaluate(e=>e.click());await page.waitForFunction(()=>document.querySelector('#camera-video-2').videoWidth>0);
 await page.locator('#tracking-mode').selectOption('stereo',{force:true});
 const camera={cameraMatrix:[[700,0,480],[0,700,270],[0,0,1]],distortionCoefficients:[0,0,0,0,0]};
 const calibration={format:'suturehero-stereo-calibration-v1',imageSize:{width:960,height:540},camera1:camera,camera2:camera,stereo:{rotation:[[0,0,1],[0,1,0],[-1,0,0]],translationMm:[-600,0,500]}};
 await page.locator('#stereo-import').setInputFiles({name:'rig.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(presetCalibration(calibration)))});await page.waitForFunction(()=>document.querySelector('#stereo-geometry-status').textContent.includes('Calibration loaded'));await page.locator('#stereo-enable').evaluate(e=>{e.checked=true;e.dispatchEvent(new Event('change'));});
 await page.evaluate(async()=>window.__cal=(await import('/src/input/InstrumentCalibration.ts')).instrumentCalibration);
 await page.waitForFunction(()=>window.__cal.preview('needleDriver')?.depthLocked===false);
 const sample=()=>page.evaluate(()=>{const p=window.__cal.preview('needleDriver');return {position:p.position.toArray(),quaternion:p.quaternion.toArray(),status:document.querySelector('#stereo-3d-points').textContent};});
 await page.waitForTimeout(500);const before=await sample();assert.match(before.status,/Camera 1 IDs 0 \/ Camera 2 IDs 4/);
 await scene(5,4);await page.waitForTimeout(700);const handoff=await sample();assert(Math.hypot(...handoff.position.map((v,i)=>v-before.position[i]))<.03);assert(Math.abs(handoff.quaternion.reduce((s,v,i)=>s+v*before.quaternion[i],0))>.999);
 // Move 80 mm deeper and turn 8.6° over ~1 s like a hand would (a one-frame teleport exceeds the tracking
// continuity limits of 10° / 15 mm per update and was intermittently not followed), then wait to settle.
for(let k=1;k<=10;k++){await scene(5,4,600+80*k/10,.15*k/10);await page.waitForTimeout(100);}
let moved=await sample();for(let k=0;k<16;k++){await page.waitForTimeout(250);const next=await sample();const still=Math.abs(next.position[2]-moved.position[2])<=.01;moved=next;if(still)break;}
assert(moved.position[2]<handoff.position[2]-.3);await page.waitForFunction(()=>document.querySelector('#stereo-view-label').textContent.includes('ACTIVE'));
 assert.deepEqual(errors,[]);console.log('Passed: different-face stereo with 90-degree cameras, face handoff without jumps, and metric depth motion.');
}finally{await browser.close();}
