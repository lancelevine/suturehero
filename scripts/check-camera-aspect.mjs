import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.addInitScript(()=>{
  navigator.mediaDevices.enumerateDevices=async()=>[];
  navigator.mediaDevices.getUserMedia=async()=>{
   const canvas=document.createElement('canvas');[canvas.width,canvas.height]=window.__cameraSize;
   const c=canvas.getContext('2d');const draw=()=>{c.fillStyle='#4a977d';c.fillRect(0,0,canvas.width,canvas.height);requestAnimationFrame(draw);};draw();
   return canvas.captureStream(1);
  };
 });
 // Preview sizing must not depend on marker recognition.
 await page.route('**/src/input/arucoWorker.ts?*',r=>r.abort());
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 for(const size of [[1280,720],[960,720],[720,1280]]){
  await page.evaluate(size=>window.__cameraSize=size,size);await page.locator('#start-camera').click();
  await page.waitForFunction(size=>{const v=document.querySelector('#camera-video');return v&&v.videoWidth===size[0]&&v.videoHeight===size[1];},size,{timeout:3000});
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);
   const measured=await page.evaluate(()=>{
    const frame=document.querySelector('#primary-camera-preview').getBoundingClientRect(),feed=document.querySelector('.tracking-camera-feeds').getBoundingClientRect(),v=document.querySelector('#camera-video'),overlay=document.querySelector('#camera-overlay').getBoundingClientRect();
    return {width:frame.width,height:frame.height,feedWidth:feed.width,ratio:v.videoWidth/v.videoHeight,overlayWidth:overlay.width,overlayHeight:overlay.height};
   });
   assert(Math.abs(measured.width-measured.feedWidth)<1,'Camera must use the full available width');
   assert(Math.abs(measured.height-measured.width/measured.ratio)<1,'Native aspect ratio must determine height, leaving no layout bars: '+JSON.stringify(measured));
   assert(Math.abs(measured.overlayWidth-measured.width)<1&&Math.abs(measured.overlayHeight-measured.height)<1,'Overlay must share camera proportions');
  }
  await page.locator('#stop-camera').click();await page.setViewportSize({width:1440,height:1000});
 }
 console.log('Passed: 16:9, 4:3 and portrait streams fill camera width with matching native height and overlay at desktop and mobile sizes.');
}finally{await browser.close();}
