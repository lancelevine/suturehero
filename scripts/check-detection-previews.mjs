// Decode previews (src/ui/detectionPreviews.ts, 2026-11-26): with the camera running, the
// threshold preview and the centre crop (original + adaptive threshold) are drawn from the frame.
// (A thresholded synthetic frame can be all one colour, so only full coverage is checked.)
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(r.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await installSyntheticCamera(page);
 await page.goto(new URL('tracking.html',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 await page.locator('#start-camera').click();
 await page.waitForFunction(()=>document.querySelector('#stop-camera')&&!document.querySelector('#stop-camera').disabled,null,{timeout:30000});
 // The toggles sit in collapsed diagnostics sections; set them as the page's own controls would.
 await page.evaluate(()=>{for(const id of ['show-threshold','show-crop']){const box=document.querySelector('#'+id);box.checked=true;box.dispatchEvent(new Event('change'));}});
 const drawn=id=>page.evaluate(id=>{const c=document.querySelector('#'+id);if(!c.width||!c.height)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let opaque=0;for(let i=3;i<d.length;i+=4)if(d[i]===255)opaque++;return opaque===d.length/4;},id);
 // Previews refresh on full decodes (can be seconds apart): wait until each canvas left its 300×150 default size.
 await page.waitForFunction(()=>['threshold-preview','crop-original','crop-adaptive'].every(id=>{const c=document.querySelector('#'+id);return c.width!==300||c.height!==150;}),null,{timeout:60000});
 for(const id of ['threshold-preview','crop-original','crop-adaptive'])assert.ok(await drawn(id),`${id} is fully drawn from the frame`);
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#crop-views')).display),'grid');
 assert.equal(await page.evaluate(()=>document.querySelector('#threshold-preview').style.display),'block');
 assert.deepEqual(errors,[]);
 console.log('Detection previews: threshold and centre crop draw from the live frame.');
}finally{await browser.close();}
