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
   // Stacked or side by side, whichever is larger (src/ui/dualFeedLayout.ts, 2026-11-14): no overlap either way.
   const separate=b.top>=a.bottom-1||b.left>=a.right-1;
   return {inside:a.top>=bounds.top-1&&b.bottom<=bounds.bottom+1&&a.left>=bounds.left-1&&b.right<=bounds.right+1,separate,positive:a.height>0&&b.height>0,proportions:Math.abs(a.width/a.height-16/9)<.02&&Math.abs(b.width/b.height-16/9)<.02};
  });
  assert(result.inside&&result.separate&&result.positive&&result.proportions,JSON.stringify({width,height,result}));
 }
 // Full-window camera view: both views fill the window side by side at desktop size, and return to the panel on Esc.
 await page.setViewportSize({width:1440,height:900});await page.locator('#camera-fullview-open').click();await page.waitForTimeout(300);
 const full=await page.evaluate(()=>{const a=document.querySelector('#primary-camera-preview').getBoundingClientRect(),b=document.querySelector('#camera-video-2').closest('.tracking-video').getBoundingClientRect();return {inOverlay:!!document.querySelector('.camera-fullview #primary-camera-preview'),aw:a.width,bw:b.width,sideBySide:Math.abs(a.top-b.top)<1&&b.left>=a.right-1,bottom:Math.max(a.bottom,b.bottom),ih:innerHeight,iw:innerWidth,right:b.right};});
 assert(full.inOverlay&&full.sideBySide&&full.aw>650&&full.bw>650&&full.bottom<=full.ih&&full.right<=full.iw,JSON.stringify(full));
 await page.keyboard.press('Escape');
 assert(await page.evaluate(()=>!!document.querySelector('.tracking-camera-stage #primary-camera-preview')&&document.querySelector('.camera-fullview').hidden),'Esc returns the views to the camera panel');
 assert.deepEqual(errors,[]);console.log('Passed: both live cameras fit completely (stacked or side by side, whichever is larger) across desktop, laptop and mobile sizes, and the full-window view shows both large and returns on Esc.');
}finally{await browser.close();}
