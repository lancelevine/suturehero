import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async route=>route.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(route.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page,{resolutionScale:2});
 await page.addInitScript(noFrames=>{window.__snapshotCounts={created:0,closed:0};if(noFrames){window.VideoFrame=undefined;return;}const Native=window.VideoFrame;if(Native)window.VideoFrame=new Proxy(Native,{construct(target,args){const frame=Reflect.construct(target,args),close=frame.close.bind(frame);window.__snapshotCounts.created++;frame.close=()=>{window.__snapshotCounts.closed++;close();};return frame;}});},!!process.env.SUTURE_NO_VIDEOFRAME);
 if(process.env.SUTURE_NO_FRAME_CALLBACK)await page.addInitScript(()=>{HTMLVideoElement.prototype.requestVideoFrameCallback=undefined;});
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5176/').href);await page.locator('#choose-primary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic ball pair camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent.includes('3'),{},{timeout:30000});await page.getByRole('button',{name:'Diagnostics',exact:true}).click();
 const report=async()=>{await page.locator('[data-perf-copy]').click();return JSON.parse(await page.locator('[data-perf-report]').inputValue());};
 const summaries=[];
 for(const predictive of process.env.SUTURE_NO_VIDEOFRAME?[true]:[false,true]){
  await page.locator('#roi-decode').evaluate((e,value)=>{e.checked=value;e.dispatchEvent(new Event('change'));},predictive);await page.waitForTimeout(1200);await page.locator('[data-perf-reset]').click();await page.waitForTimeout(6500);
  const r=await report(),row=name=>r.performance.rows.find(v=>v.name===name),decodes=row('Camera 1 decode worker');assert(decodes?.rate>0);assert.equal(r.context.camera1.width,1920);
  // Periodic whole-frame coverage is either full scans or (since build 0.124) quarter-frame discovery tiles.
  if(predictive)assert(r.performance.counters['Camera 1 search predicted']>0&&(r.performance.counters['Camera 1 search full']??0)+(r.performance.counters['Camera 1 search discovery']??0)>0);
  summaries.push({predictive,fps:decodes.rate,workerMs:decodes.meanMs,pixelsPerDecode:r.performance.counters['Camera 1 searched pixels']/['full','predicted','expanded','discovery'].reduce((sum,kind)=>sum+(r.performance.counters['Camera 1 search '+kind]??0),0),snapshot:r.context.snapshotBackend1});
 }
 if(summaries.length===2){assert(summaries[1].pixelsPerDecode<summaries[0].pixelsPerDecode*.7,'focused decoding must materially reduce pixel work');assert(summaries[1].workerMs<summaries[0].workerMs*.85,'decode worker cost should drop');}
 // Global scans must find a newly visible ID well outside the existing ROI.
 await page.evaluate(()=>{window.__ballScene.extraMarker=true;window.__ballScene.extraMarkerX=810;});await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent.includes('4'),{},{timeout:5000});
 await page.evaluate(()=>{window.__ballScene.extraMarker=false;window.__ballScene.shift=430;});
 await page.waitForFunction(()=>{const m=document.querySelector('#forceps-readout').textContent.match(/X (-?[\d.]+)/);return m&&Number(m[1])>60;},{},{timeout:5000});
 await page.locator('#stop-camera').evaluate(e=>e.click());const counts=await page.evaluate(()=>window.__snapshotCounts);assert.equal(counts.created,counts.closed,'every owned VideoFrame must be closed');if(!process.env.SUTURE_NO_VIDEOFRAME)assert(counts.created>0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({summaries,snapshotCounts:counts}));console.log('Passed: native 1080p predictive/full A-B, global discovery outside ROI, abrupt-move recovery and snapshot cleanup.');
}finally{await browser.close();}
