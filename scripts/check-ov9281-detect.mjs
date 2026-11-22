// OV9281 recognition (build 0.216): a camera whose name says OV9281 switches the camera
// type to OV9281 by itself and is reopened at 1280×800 / 120 fps. Synthetic camera only.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await installSyntheticCamera(page);
 await page.addInitScript(()=>{
  try{localStorage.setItem('suturehero.cameraMode.v1','webcam1080');}catch{}
  const open=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  window.__requests=[];
  navigator.mediaDevices.getUserMedia=async constraints=>{
   window.__requests.push(constraints.video);
   const stream=await open(constraints),track=stream.getVideoTracks()[0];
   Object.defineProperty(track,'label',{value:'Arducam OV9281 USB Camera'});
   return stream;
  };
 });
 await page.goto(new URL('tracking.html',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 await page.locator('#start-camera').click();
 await page.waitForFunction(()=>window.__requests.length>=2,null,{timeout:20000});
 const [first,second]=await page.evaluate(()=>window.__requests.map(v=>({width:v.width?.ideal,height:v.height?.ideal,frameRate:v.frameRate?.ideal})));
 assert.deepEqual(first,{width:1920,height:1080,frameRate:30},'first request uses the saved 1080p camera type');
 assert.deepEqual(second,{width:1280,height:800,frameRate:120},'reopened at the OV9281 mode');
 assert.equal(await page.evaluate(()=>localStorage.getItem('suturehero.cameraMode.v1')),'ov9281');
 const typeSelect=page.locator('.tracking-camera-settings select').first();
 assert.equal(await typeSelect.inputValue(),'ov9281','camera type selector follows');
 assert.deepEqual(errors,[]);
 console.log('OV9281: recognised by name, camera type switched and the camera reopened at 1280×800 / 120 fps.');
}finally{await browser.close();}
