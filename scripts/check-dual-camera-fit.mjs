import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(r.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page);
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 await page.locator('#choose-primary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic ball pair camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#camera-video').videoWidth>0);
 await page.locator('#choose-secondary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic second camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#camera-video-2').videoWidth>0);
 for(const [width,height] of [[1440,900],[1024,768],[390,844]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(300);
  const result=await page.evaluate(()=>{
   const stage=document.querySelector('.tracking-camera-stage');stage.scrollTop=0;
   const bounds=stage.getBoundingClientRect(),a=document.querySelector('#primary-camera-preview').getBoundingClientRect(),b=document.querySelector('#camera-video-2').closest('.tracking-video').getBoundingClientRect();
   return {inside:a.top>=bounds.top-1&&b.bottom<=bounds.bottom+1,stacked:b.top>=a.bottom-1,positive:a.height>0&&b.height>0,proportions:Math.abs(a.width/a.height-16/9)<.02&&Math.abs(b.width/b.height-16/9)<.02};
  });
  assert(result.inside&&result.stacked&&result.positive&&result.proportions,JSON.stringify({width,height,result}));
 }
 assert.deepEqual(errors,[]);console.log('Passed: both live stacked cameras fit completely at scroll-top across desktop, laptop and mobile sizes without cropping.');
}finally{await browser.close();}
