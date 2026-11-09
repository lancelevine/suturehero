import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page);
 await page.addInitScript(()=>{
  const open=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  window.__cameraConstraints=[];
  navigator.mediaDevices.getUserMedia=async(...args)=>{
   const stream=await open(...args),track=stream.getVideoTracks()[0],original=track.getSettings.bind(track);
   const settings={exposureMode:'auto',focusMode:'continuous',exposureTime:100,gain:2,focusDistance:20};
   track.getCapabilities=()=>({exposureMode:['auto','manual'],focusMode:['continuous','manual'],exposureTime:{min:10,max:1000,step:10},gain:{min:0,max:10,step:1},focusDistance:{min:0,max:100,step:1}});
   track.getSettings=()=>({...original(),...settings});
   track.applyConstraints=async constraints=>{window.__cameraConstraints.push(constraints);Object.assign(settings,constraints.advanced[0]);};
   return stream;
  };
 });
 // Controls must work even if recognition cannot initialize.
 await page.route('**/src/input/arucoWorker.ts?*',r=>r.abort());
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 await page.locator('#start-camera').click();
 // Camera controls are collapsed by default since build 0.133; open them as a user would.
 await page.locator('.tracking-camera-settings').locator('xpath=..').locator('summary').first().click();
 await page.getByLabel('Exposure mode').waitFor({state:'visible'});
 assert.deepEqual(await page.getByLabel('Exposure mode').locator('option').allTextContents(),['auto','Manual']);
 await page.getByLabel('Exposure mode').selectOption('manual');
 await page.getByLabel('Focus mode').selectOption('manual');
 for(const title of ['Exposure','Gain','Focus distance']){
  const slider=page.locator('.camera-settings-row').filter({has:page.locator('span',{hasText:new RegExp('^'+title+'$')})}).locator('input');
  await slider.fill('700');await slider.dispatchEvent('change');
 }
 const applied=await page.evaluate(()=>window.__cameraConstraints.map(c=>c.advanced[0]));
 for(const key of ['exposureMode','focusMode','exposureTime','gain','focusDistance'])assert(applied.some(c=>key in c),'Missing camera constraint '+key);
 for(const width of [1440,900,390]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);
  assert(await page.evaluate(()=>{
   const box=document.querySelector('#primary-camera-preview').getBoundingClientRect(),feeds=document.querySelector('.tracking-camera-feeds').getBoundingClientRect(),video=document.querySelector('#camera-video').getBoundingClientRect(),overlay=document.querySelector('#camera-overlay').getBoundingClientRect();
   return Math.abs(box.width-feeds.width)<1&&box.left>=feeds.left-1&&box.right<=feeds.right+1&&Math.abs(video.width-box.width)<1&&Math.abs(overlay.width-video.width)<1&&Math.abs(overlay.height-video.height)<1;
  }),'Preview, video and overlay must fit their panel at '+width);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 assert.match(await page.locator('#camera-status').textContent(),/Detector worker failed to load/);
 assert.deepEqual(errors.filter(message=>message!=='Detector worker failed to load'),[]);console.log('Passed: preview fits panel at desktop/mobile widths; focus/exposure modes, exposure, gain and focus distance apply to the camera even without marker detection.');
}finally{await browser.close();}
