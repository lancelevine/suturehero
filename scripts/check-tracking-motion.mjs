import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1100,height:800},deviceScaleFactor:.5});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async route=>route.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(route.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page);
 await page.goto(new URL('tracking.html',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5175/').href,{waitUntil:'domcontentloaded'});
 await page.locator('#choose-primary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic ball pair camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent==='3',{},{timeout:30000});
 const result=await page.evaluate(async()=>{
  let tracked=0,green=0;const positions=new Set();
  for(let i=0;i<60;i++){
   window.__ballScene.shift=Math.round(90*Math.sin(i*.16));
   await new Promise(r=>setTimeout(r,70));
   if(document.querySelector('#marker-readout').textContent==='3')tracked++;
   const canvas=document.querySelector('#camera-overlay'),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   if(data.some((v,k)=>k%4===0&&v===24&&data[k+1]===232&&data[k+2]===157))green++;
   positions.add(document.querySelector('#forceps-readout').textContent);
  }
  return {tracked,green,samples:60,positions:positions.size};
 });
 assert(result.tracked>=54,JSON.stringify(result));assert(result.green>=48,JSON.stringify(result));assert(result.positions>10,'instrument pose should move');assert.deepEqual(errors,[]);
 console.log('Passed: moving camera marker stays recognized and updates instrument pose through the real decoder/flow bridge.',result);
}finally{await browser.close();}
