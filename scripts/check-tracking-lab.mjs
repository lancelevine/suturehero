import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const stereo=process.env.SUTURE_LAB_STEREO==='1',balls=process.env.SUTURE_LAB_BALLS==='1';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log(m.text());});
 await context.route('https://cdn.jsdelivr.net/**',r=>r.abort());
 await installSyntheticCamera(page,{frameRate:9,secondFrameRate:7});
 await page.addInitScript(({balls,stereo})=>{
  if(window!==window.top)return;
  localStorage.setItem('suturehero.trackerType','ring6');
  if(stereo){const camera={cameraMatrix:[[700,0,480],[0,700,270],[0,0,1]],distortionCoefficients:[0,0,0,0,0]};localStorage.setItem('suturehero.stereoCalibration.v1',JSON.stringify({format:'suturehero-stereo-calibration-v1',imageSize:{width:960,height:540},camera1:camera,camera2:camera,stereo:{rotation:[[1,0,0],[0,1,0],[0,0,1]],translationMm:[-100,0,0]},cameraIds:{first:'synthetic',second:'synthetic-secondary'}}));localStorage.setItem('suturehero-camera-primary','synthetic');localStorage.setItem('suturehero-camera-secondary','synthetic-secondary');}
  if(balls)for(const camera of [0,1]){
   const key=camera?'suturehero.jaw-tracking.camera2.v1':'suturehero.jaw-tracking.v1';
   localStorage.setItem(key,JSON.stringify({version:1,enabled:true,tools:{}}));
   localStorage.setItem(key+'.striped10',JSON.stringify({version:1,enabled:true,tools:{needleDriver:{colors:[[1/3,1/3,1/3],[1/3,1/3,1/3]],displayColors:['rgb(240, 240, 240)','rgb(240, 240, 240)'],brightness:[720,720],anchors:[{x:400*2/3,y:340*2/3},{x:430*2/3,y:340*2/3}],anchorMarkers:[{x:398*2/3,y:218*2/3,side:24},{x:398*2/3,y:218*2/3,side:24}],reference:null,calibration:{near:{},far:{}}}}}));
   localStorage.setItem('suturehero.needleJawPattern.v1','striped10');
  }
 },{balls,stereo});
 await page.goto(process.env.SUTURE_TEST_URL??process.env.SUTURE_LAB_URL??'http://127.0.0.1:5173/');
 await page.getByRole('tab',{name:'Tracking Lab',exact:true}).click();
 assert(await page.locator('#tracking-lab').isVisible());assert(!(await page.locator('.suturing-app').isVisible()));
 await page.waitForSelector('#tracking-mode',{state:'attached'});
 if(stereo){
  await page.locator('#tracking-mode').evaluate(mode=>{mode.value='stereo';mode.dispatchEvent(new Event('change'));});
  await page.locator('#stereo-enable').evaluate(e=>{e.checked=true;e.dispatchEvent(new Event('change'));});
 }
 if(balls)await page.evaluate(()=>Object.assign(window.__ballScene,{striped:true,background:'#404040'}));
 await page.locator('#lab-duration').selectOption('5000');await page.locator('#lab-record').click();
 if(balls){await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent.startsWith('Recording'));await page.evaluate(()=>{setTimeout(()=>window.__ballScene.hideA=true,1400);setTimeout(()=>window.__ballScene.hideA=false,3000);});}
 await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent.startsWith('Saved')||document.querySelector('#lab-message').textContent,null,{timeout:25000});
 assert.equal(await page.locator('#lab-message').textContent(),'');
 // Use native IndexedDB so the same test runs against the production build.
 const saved=await page.evaluate(async()=>{
  const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const db=await request(indexedDB.open('suturehero-tracking-lab',1));
  const sessions=await request(db.transaction('sessions').objectStore('sessions').getAll()),s=sessions[0];
  const f=await request(db.transaction('frames').objectStore('frames').index('session').getAll(s.id));
  const tx=db.transaction('frames','readwrite'),done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  for(const frame of f){frame.diagnostics={...frame.diagnostics,markers:[{id:49,corners:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]}]};tx.objectStore('frames').put(frame);}await done;db.close();
  return {session:s,count:f.length,cameras:f.map(f=>f.camera),times:f.map(f=>f.at),types:f.map(f=>f.image.type)};
 });
 assert(saved.count>5);assert.equal(saved.session.cameras.length,stereo?2:1);if(stereo)assert(saved.cameras.includes(1));assert.equal(saved.session.status,'complete');
 assert(saved.times.every((t,i,a)=>i===0||t>=a[i-1]));assert(saved.types.every(t=>t==='image/jpeg'));
 // Block webcam access in every future processor context, not just the parent.
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new Error('Replay requested webcam access');};});
 await page.locator('#stop-camera').evaluate(b=>b.click());if(stereo)await page.locator('#stop-camera-2').evaluate(b=>b.click());await page.waitForTimeout(800);
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new Error('Replay requested webcam access');};window.__savedSettings=JSON.stringify({...localStorage});window.__replayPoseEvents=0;window.addEventListener('suturehero:tracking-pose',()=>window.__replayPoseEvents++);});
 await page.locator('#lab-replay').click();
 await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent==='Replay complete'||document.querySelector('#lab-message').textContent,null,{timeout:90000});
 assert.equal(await page.locator('#lab-message').textContent(),'');assert.equal(await page.locator('#lab-mode').textContent(),'Replay complete');
 const firstSummary=await page.locator('#lab-diagnostics').textContent();console.log(firstSummary);assert.match(firstSummary,/Markers [1-9]/);if(stereo)assert.match(firstSummary,/Camera 2:/);if(balls)assert.match(firstSummary,/Balls [1-9]/);
 assert(await page.evaluate(()=>{const frame=document.querySelector('iframe.tracking-lab-engine');return frame.contentDocument.querySelector('#marker-readout').textContent.includes('3')&&!frame.contentDocument.querySelector('#marker-readout').textContent.includes('49');}),'Replay must detect real pixels instead of saved detections');
 if(stereo)assert(await page.evaluate(()=>document.querySelector('iframe.tracking-lab-engine').contentDocument.querySelector('#stereo-enable').checked));
 assert.equal(await page.evaluate(()=>window.__replayPoseEvents),0,'Replay must not move live simulator instruments');assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})===window.__savedSettings),true,'Replay must not modify live calibration');
 await page.locator('#lab-back').click();await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent==='Paused');const before=await page.locator('#lab-time').textContent();
 await page.locator('#lab-next').click();await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent==='Replay complete');assert.notEqual(await page.locator('#lab-time').textContent(),before);
 assert.equal(await page.locator('#lab-diagnostics').textContent(),firstSummary,'Reset and full preroll should reproduce the same detection metrics');
 await page.locator('#lab-seek').fill('1000');await page.locator('#lab-seek').dispatchEvent('change');await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent==='Paused');assert.match(await page.locator('#lab-time').textContent(),/^0\./);
 await page.locator('.lab-session input').fill('Tracking failure fixture');await page.locator('.lab-session input').dispatchEvent('change');
 const downloadPromise=page.waitForEvent('download');await page.locator('.lab-session').getByRole('button',{name:'Export',exact:true}).click();const download=await downloadPromise,path=await download.path();assert(path);const bytes=(await readFile(path)).length;assert(bytes>0);
 const chooserPromise=page.waitForEvent('filechooser');await page.locator('#lab-import').click();const chooser=await chooserPromise;await chooser.setFiles(path);
 await page.waitForFunction(()=>document.querySelectorAll('.lab-session').length===2&&document.querySelector('#lab-mode').textContent==='Paused',null,{timeout:30000});
 assert.equal(await page.locator('.lab-session input').last().inputValue(),'Tracking failure fixture');
 await page.getByRole('tab',{name:'Simulator',exact:true}).click();assert(await page.locator('.suturing-app').isVisible());await page.getByRole('tab',{name:'Tracking Lab',exact:true}).click();
 await page.screenshot({path:'/tmp/suturehero-tracking-lab'+(stereo?'-stereo':'')+(balls?'-balls':'')+'.png',fullPage:true});
 await page.locator('.lab-session').last().getByRole('button',{name:'Delete',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.lab-session').length===1);
 // Recover an interrupted recording, then replay after a cold page load with hardware blocked.
 await page.evaluate(async()=>{const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const db=await request(indexedDB.open('suturehero-tracking-lab',1)),sessions=await request(db.transaction('sessions').objectStore('sessions').getAll()),tx=db.transaction('sessions','readwrite'),s=sessions[0];s.status='recording';s.frames=0;tx.objectStore('sessions').put(s);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();});
 await page.reload();await page.getByRole('tab',{name:'Tracking Lab',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.lab-session small')?.textContent.includes('Interrupted recording recovered'));
 await page.locator('.lab-session').getByRole('button',{name:'Replay',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent==='Replay complete'||document.querySelector('#lab-message').textContent,null,{timeout:90000});assert.equal(await page.locator('#lab-message').textContent(),'');
 assert.deepEqual(errors,[]);
 console.log(`Passed: ${stereo?'dual':'single'}-camera recording (${saved.count} frames), automatic save, actual ${balls?'marker + ball':'marker'} pipeline replay, isolated calibration/poses, repeatable reset/preroll metrics, seek/step, rename, portable UI export/import (${bytes} bytes), delete and simulator restoration.`);
}finally{await browser.close();}
