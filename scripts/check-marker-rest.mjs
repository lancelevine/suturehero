import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async route=>route.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(route.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page);
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5176/').href);
 await page.locator('.tracking-advanced').evaluate(e=>e.open=true);await page.locator('#tracker-type').selectOption('ring6');await page.locator('.tracking-advanced').evaluate(e=>e.open=false);
 await page.locator('#choose-primary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic ball pair camera'}).click();
 await page.waitForFunction(()=>document.querySelector('.calibration-live-preview').dataset.tracking==='live',{},{timeout:30000});await page.waitForTimeout(400);
 const line=page.locator('[data-preview-tool] path').first(),before=await line.getAttribute('d');
 for(let i=0;i<6;i++){
  const extra=i%2===0;await page.evaluate(extra=>window.__ballScene.extraMarker=extra,extra);
  await page.waitForFunction(extra=>{const text=document.querySelector('#marker-readout').textContent;return text.includes('3')&&text.includes('4')===extra;},extra,{timeout:15000});
  await page.waitForTimeout(250);assert.equal(await line.getAttribute('d'),before,'stationary pose must survive visibility/overlap changes: '+i+' · '+await page.locator('#rotation-solver-status').textContent());
 }
 assert.match(await page.locator('#rotation-solver-status').textContent(),/stationary image geometry/);
 await page.evaluate(()=>window.__ballScene.shift=45);await page.waitForFunction(before=>document.querySelector('[data-preview-tool] path').getAttribute('d')!==before,before,{timeout:5000});
 assert.deepEqual(errors,[]);console.log('Passed: real decoder alternates one/two hexagonal faces while the needle-driver preview stays fixed; deliberate motion releases the hold.');
}finally{await browser.close();}
