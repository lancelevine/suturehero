import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR??'/tmp/suturehero-aruco',new URL(r.request().url()).pathname.split('/').at(-1)))}));
 await installSyntheticCamera(page,{resolutionScale:2});await page.addInitScript(()=>localStorage.setItem('suturehero.trackerType','ring6'));
 await page.goto('http://127.0.0.1:5173/tracking.html');await page.evaluate(()=>Object.assign(window.__ballScene,{striped:true,background:'#404040'}));
 await page.locator('#start-camera').click();await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent.includes('3'));
 await page.locator('[data-calibration-tool=needleDriver]').click();await page.locator('[data-calibration-pane=jaws]').click();await page.locator('#needle-ball-pattern').selectOption('striped10');
 const pick=async(side,x)=>{await page.locator(side?'#ball-pick-b':'#ball-pick-a').click();const overlay=page.locator('#camera-overlay');await overlay.scrollIntoViewIfNeeded();const b=await overlay.boundingBox();await page.mouse.click(b.x+x/960*b.width,b.y+340/540*b.height);};
 await pick(0,400);await pick(1,430);await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('paired with instrument'));
 await page.locator('#ball-closed').click();await page.waitForFunction(()=>!document.querySelector('#ball-closed').disabled&&document.querySelector('#ball-calibration-status').textContent.includes('Near closed recorded'));
 await page.evaluate(()=>window.__ballScene.open=true);await page.waitForTimeout(800);await page.locator('#ball-open').click();await page.waitForFunction(()=>!document.querySelector('#ball-open').disabled&&document.querySelector('#ball-calibration-status').textContent.includes('Near open recorded'));
 const count=await page.evaluate(()=>{window.__ballScene.plainWhite=true;return window.__jawEvents.length;});
 for(let i=1;i<=6;i++){await page.evaluate(i=>window.__ballScene.ballShift=i*3,i);await page.waitForTimeout(130);}
 await page.waitForFunction(n=>window.__jawEvents.length>n+3,count);assert.match(await page.locator('#ball-readout').textContent(),/silhouette/);
 const colors=()=>page.evaluate(()=>{
  const data=document.querySelector('#jaw-overlay').getContext('2d').getImageData(390,318,68,46).data;let green=0,gray=0;
  for(let i=0;i<data.length;i+=4)if(data[i+3]>128){if(data[i]<120&&data[i+1]>180&&data[i+2]>80&&data[i+2]<180)green++;if(data[i]>145&&data[i]<200&&data[i+1]>150&&data[i+1]<205&&data[i+2]>155&&data[i+2]<215)gray++;}
  return {green,gray};
 });
 await page.waitForTimeout(100);assert((await colors()).green>5,'Fresh detections should have green outlines');
 await page.locator('#camera-video').evaluate(v=>v.pause());await page.waitForTimeout(450);const stalled=await colors();assert.equal(stalled.green,0,'A frozen stream must not retain a green lock');assert(stalled.gray>5,'A frozen stream should display a gray prediction');await page.evaluate(()=>window.__ballScene.plainWhite=false);await page.locator('#camera-video').evaluate(v=>v.play());
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('paired with instrument'));
 const hiddenCount=await page.evaluate(()=>{document.querySelector('#camera-video').style.display='none';return window.__jawEvents.length;});await page.waitForTimeout(900);assert(await page.evaluate(()=>window.__jawEvents.length)>hiddenCount,'Hidden camera controls must retain fresh decoded-frame tracking');await page.locator('#camera-video').evaluate(v=>v.style.display='');
 await page.evaluate(()=>{window.__ballScene.plainWhite=false;window.__ballScene.hideA=true;});await page.waitForTimeout(400);
 const lost=await page.evaluate(()=>window.__jawEvents.length);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__jawEvents.length),lost,'Predicted positions cannot update jaws');
 await page.evaluate(()=>{window.__ballScene.hideA=false;window.__ballScene.ballShift=170;window.__ballScene.open=false;});
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('Searching full frame'),{},{timeout:6000});
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('paired with instrument'),{},{timeout:12000}).catch(async e=>{console.log(await page.locator('#ball-readout').textContent(),errors);throw e;});
 // The original anchors remain fixed: reacquisition did not reassign them.
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('suturehero.jaw-tracking.v1.striped10')));assert(Math.abs(saved.tools.needleDriver.anchors[0].x-400*640/960)<3);
 assert.deepEqual(errors,[]);console.log('Passed: stripe identity, silhouette-only continuation, stale-pair invalidation, velocity tracking, and full-frame reacquisition without reassignment.');
}finally{await browser.close();}
