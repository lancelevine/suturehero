import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR??'/tmp/suturehero-aruco',new URL(r.request().url()).pathname.split('/').at(-1)))}));
 await installSyntheticCamera(page);
 // Deterministic corner/quality results isolate capture-state behavior. The
 // actual worker pixel processing is covered separately below.
 await page.addInitScript(()=>{
  const Original=window.Worker;
  window.Worker=class extends Original{
   constructor(url,options){
    if(!String(url).includes('checkerboardWorker'))return new Original(url,options);
    return new class{onmessage=null;onerror=null;stopped=false;postMessage(data){const result=data.type==='refine'?(window.__refineNext?.()??{width:1920,height:1080,corners:null}):structuredClone(window.__captureMeasurements);if(data.type==='check')window.__captureChecks=(window.__captureChecks??0)+1;setTimeout(()=>{if(!this.stopped)this.onmessage?.({data:{id:data.id,...(data.type==='init'?{ready:true}:{result})}});},window.__captureDelay??20);}terminate(){this.stopped=true;}};
   }
  };
 });
 await page.goto('http://127.0.0.1:5173/tracking.html');
 const set=async(i,blur=false,missing=false)=>page.evaluate(async({i,blur,missing})=>{
  const {faceGeometry}=await import('/src/input/prismPose.ts');const g=faceGeometry(0,'ring6');
  const measure=(camera)=>{
   const x=i<0?.5:.28+(i%5)*.11,y=i<0?.5:.32+Math.floor(i/5)*.12,z=i<0?600:500+(i%5)*70;
   const rx=i<0?0:-.5+Math.floor(i/5)/3+(camera?.1:0),ry=i<0?0:-.5+(i%5)/4-(camera?.1:0);
   const axis=g.center.clone(),qx=g.rotation.clone().setFromAxisAngle(axis.set(1,0,0),rx),qy=g.rotation.clone().setFromAxisAngle(axis.set(0,1,0),ry),q=qx.multiply(qy);
   const corners=Array.from({length:48},(_,j)=>{
    const p=g.center.clone().set((j%8-3.5)*16,(Math.floor(j/8)-2.5)*16,0).applyQuaternion(q);p.z+=z;
    return {x:(x+(camera?.02:0))*640+800*p.x/p.z,y:y*480+800*p.y/p.z};
   });
   return {width:640,height:480,corners:missing&&camera?[]:corners,contrast:180,focus:blur?.01:.8};
  };window.__captureMeasurements=[measure(0),measure(1)];
 },{i,blur,missing});
 await set(-1,true);await page.locator('#camera-select').selectOption('synthetic',{force:true});await page.locator('#start-camera').click();await page.locator('#camera-select-2').selectOption('synthetic-secondary',{force:true});await page.locator('#start-camera-2').evaluate(e=>e.click());
 await page.waitForFunction(()=>document.querySelector('#camera-video-2').videoWidth>0);
 await page.locator('#capture-stereo-pair').evaluate(e=>e.click());
 await page.waitForFunction(()=>document.querySelector('#checkerboard-quality').textContent.includes('blurred')).catch(async e=>{console.log(await page.evaluate(()=>({status:document.querySelector('#stereo-calibration-status').textContent,quality:document.querySelector('#checkerboard-quality').textContent,cameras:['#camera-select','#camera-select-2'].map(s=>document.querySelector(s).value),settings:['#camera-video','#camera-video-2'].map(s=>document.querySelector(s).srcObject?.getVideoTracks()[0].getSettings()),checks:window.__captureChecks})));throw e;});
 const count=()=>page.locator('#stereo-calibration-status').getAttribute('data-accepted');assert.equal(await count(),'0');
 await set(-1);await page.waitForFunction(()=>document.querySelector('#stereo-calibration-status').dataset.accepted==='1');
 await page.waitForFunction(()=>document.querySelector('#stereo-calibration-status').textContent.includes('Pose already captured'));assert.equal(await count(),'1');
 await set(-1,false,true);await page.waitForFunction(()=>document.querySelector('#checkerboard-quality').textContent.includes('Camera 2: board not found'));assert.equal(await count(),'1');
 await page.locator('#capture-stereo-pair').evaluate(e=>e.click());await set(0);await page.waitForTimeout(1800);assert.equal(await count(),'1','Pause must retain accepted pairs and save nothing');
 await page.locator('#capture-stereo-pair').evaluate(e=>e.click());
 for(let i=0;i<20;i++){
  if(await page.locator('#stereo-calibration-status').getAttribute('data-complete')==='true')break;
  const old=Number(await count());await set(i);
  await page.waitForFunction(n=>Number(document.querySelector('#stereo-calibration-status').dataset.accepted)>n,old,{timeout:7000});
 }
 assert.equal(await page.locator('#stereo-calibration-status').getAttribute('data-complete'),'true');assert(await page.locator('#capture-stereo-pair').isDisabled());
 const done=await count();await set(0,true);await page.waitForTimeout(1800);assert.equal(await count(),done,'Complete capture must stop collecting');
 const downloadPromise=page.waitForEvent('download');await page.locator('#export-stereo-pairs').evaluate(e=>e.click());const download=await downloadPromise;const data=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.equal(data.pairs.length,Number(done));assert.equal(data.diagnostics.coverage.complete,true);assert(data.pairs.every(p=>p.quality.first.focus>=.08&&p.quality.second.focus>=.08));

 // In-app solve (build 0.119): refine requests answered with corners of a known synthetic stereo rig.
 await page.evaluate(async()=>{
  const {boardPoints,projectPoint,rodrigues,rotationVector}=await import('/src/input/stereoCalibrationSolver.ts');
  const board={innerCornersX:8,innerCornersY:6,squareSizeMm:16},object=boardPoints(board);
  const K1=[1400,1395,965,548,-0.11,0.06,0.0012,-0.0006],K2=[1385,1380,950,532,-0.08,0.03,-0.0008,0.0004],ext=[0,15*Math.PI/180,0.02,-283,6,24];
  let request=0;
  window.__refineNext=()=>{
   const i=Math.floor(request/2)%20,camera=request%2;request++;
   const pose1=[-0.45+(i%5)*0.22,-0.4+Math.floor(i/5)*0.27,(i%3)*0.2-0.2,-116+(i%5)*18,-80+Math.floor(i/5)*12,520+(i%4)*60];
   let pose=pose1;
   if(camera){const R2=rodrigues(ext),Rb=rodrigues(pose1),Rc=[0,1,2].flatMap(r=>[0,1,2].map(c=>R2[r*3]*Rb[c]+R2[r*3+1]*Rb[3+c]+R2[r*3+2]*Rb[6+c])),t=pose1.slice(3);pose=[...rotationVector(Rc),...[0,1,2].map(r=>R2[r*3]*t[0]+R2[r*3+1]*t[1]+R2[r*3+2]*t[2]+ext[3+r])];}
   return {width:1920,height:1080,corners:object.map(X=>projectPoint(camera?K2:K1,pose,X))};
  };
 });
 await page.locator('#solve-stereo-calibration').evaluate(e=>e.click());
 await page.waitForFunction(()=>/Calibration solved and applied|not accepted|Solve failed/.test(document.querySelector('#stereo-calibration-status').textContent),{},{timeout:60000});
 const solved=await page.locator('#stereo-calibration-status').textContent();
 assert.match(solved,/Calibration solved and applied/,solved);
 const geometry=await page.locator('#stereo-geometry-status').textContent();
 const baseline=Number(/([\d.]+) mm baseline/.exec(geometry)?.[1]);
 assert(Math.abs(baseline-284.1)<3,geometry);
 console.log('In-app solve:',solved);
 page.once('dialog',d=>d.accept());await page.locator('#clear-stereo-pairs').evaluate(e=>e.click());assert.equal(await count(),'0');
 await set(0);await page.locator('#capture-stereo-pair').evaluate(e=>e.click());await page.waitForFunction(()=>document.querySelector('#stereo-calibration-status').dataset.accepted==='1');
 await page.locator('#camera-select-2').selectOption('synthetic',{force:true});await page.waitForFunction(()=>document.querySelector('#stereo-calibration-status').textContent.includes('device selection changed'));assert.equal(await count(),'1');
 const secondDownload=page.waitForEvent('download');await page.locator('#export-stereo-pairs').evaluate(e=>e.click());const secondFile=await secondDownload;const exportedAfterChange=JSON.parse(await readFile(await secondFile.path(),'utf8'));assert.equal(exportedAfterChange.camera2,'synthetic-secondary');
 await page.locator('#camera-select-2').selectOption('synthetic-secondary',{force:true});await page.locator('#start-camera-2').evaluate(e=>{if(!e.disabled)e.click();});await page.waitForFunction(()=>document.querySelector('#camera-video-2').srcObject?.getVideoTracks()[0].getSettings().deviceId==='synthetic-secondary');await set(1);
 const before=await page.evaluate(()=>{window.__captureDelay=600;return window.__captureChecks;});
 await page.locator('#capture-stereo-pair').evaluate(e=>e.click());await page.waitForFunction(n=>window.__captureChecks>n,before);
 await page.locator('#capture-stereo-pair').evaluate(e=>e.click());page.once('dialog',d=>d.accept());await page.locator('#clear-stereo-pairs').evaluate(e=>e.click());await page.waitForTimeout(1000);assert.equal(await count(),'0','Late worker results must not restore cleared pairs');
 assert.deepEqual(errors,[]);console.log('Passed: live feedback, blur/missing/duplicate rejection, retained pause/resume, coverage-guided automatic completion, and accepted-only export.',{accepted:data.pairs.length});
}finally{await browser.close();}
