import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:.5});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async route=>route.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(route.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page);
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;window.__glContexts=new Set();HTMLCanvasElement.prototype.getContext=function(kind,...args){const ctx=original.call(this,kind,...args);if(ctx&&(kind==='webgl'||kind==='webgl2'))window.__glContexts.add(ctx);return ctx;};});
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5176/').href,{waitUntil:'domcontentloaded'});
 await page.locator('#workspace-calibrate-toggle').click();await page.locator('#choose-primary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic ball pair camera'}).click();
 const preview=page.locator('.calibration-live-preview'),line=page.locator('[data-preview-tool] path').first();
 await page.waitForFunction(()=>document.querySelector('.calibration-live-preview').dataset.tracking==='live',{},{timeout:30000});
 await page.locator('[data-neutral]').click();await page.waitForTimeout(200);
 const before=await line.getAttribute('d');await page.evaluate(()=>window.__ballScene.shift=45);
 await page.waitForFunction(old=>document.querySelector('[data-preview-tool] path').getAttribute('d')!==old,before);
 await page.locator('.calibration-live-preview>details').evaluate(e=>e.open=true);
 const readX=()=>page.locator('[data-preview-values] tr').first().locator('td').nth(1).textContent().then(v=>Number(v.match(/-?\d+\.\d+/)?.[0]));
 await page.waitForFunction(()=>Math.abs(Number(document.querySelector('[data-preview-values] tr td:nth-child(2)').textContent.match(/-?\d+\.\d+/)?.[0]))>.03);
 const beforeTurn=await line.getAttribute('d');await page.evaluate(()=>window.__ballScene.angle=.35);await page.waitForTimeout(500);assert.notEqual(await line.getAttribute('d'),beforeTurn);
 await page.locator('[data-calibration-pane=axes]').click();await page.locator('[data-invert=translation][data-index="0"]').check();await page.waitForTimeout(200);
 const prior=await readX();await page.evaluate(()=>window.__ballScene.shift=75);await page.waitForFunction(x=>Number(document.querySelector('[data-preview-values] tr td:nth-child(2)').textContent.match(/-?\d+\.\d+/)?.[0])>x+.02,prior);
 const jawBefore=await line.getAttribute('d');await page.evaluate(()=>window.dispatchEvent(new CustomEvent('suturehero:jaw-opening',{detail:{type:'suturehero:jaw-opening',instrument:'forceps',opening:.15}})));await page.waitForFunction(old=>document.querySelector('[data-preview-tool] path').getAttribute('d')!==old,jawBefore);
 await page.waitForFunction(()=>document.querySelector('[data-preview-values] tr:last-child td:last-child').textContent.startsWith('15%'));
 assert.equal(await page.evaluate(()=>window.__glContexts.size),1,'preview must not allocate another WebGL context');
 const positionBeforeCenter=await readX();await page.locator('[data-preview-center]').click();await page.waitForTimeout(100);assert(Math.abs(await readX()-positionBeforeCenter)<.02,'centering the illustration must not recalibrate input');
 await page.locator('[data-calibration-tool=needleDriver]').click();assert.equal(await preview.getAttribute('data-tracking'),'waiting');assert.match(await page.locator('[data-preview-title]').textContent(),/needle driver/);
 await page.locator('[data-calibration-tool=scissors]').click();assert.equal(await preview.getAttribute('data-instrument'),'scissors');
 await page.locator('[data-calibration-tool=forceps]').click();await page.evaluate(()=>window.__ballScene.marker=false);await page.waitForFunction(()=>document.querySelector('.calibration-live-preview').dataset.tracking==='lost');const frozen=await line.getAttribute('d');await page.waitForTimeout(250);assert.equal(await line.getAttribute('d'),frozen);
 await page.evaluate(()=>window.__ballScene.marker=true);await page.waitForFunction(()=>document.querySelector('.calibration-live-preview').dataset.tracking==='live');
 await page.locator('[data-calibration-pane=pose]').click();await page.locator('[data-neutral]').click();await page.waitForTimeout(250);assert(Math.abs(await readX())<.02);
 if(process.env.SUTURE_SCREENSHOT)await page.screenshot({path:process.env.SUTURE_SCREENSHOT});
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert(await page.locator('#camera-video').isVisible());assert(await preview.isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.deepEqual(errors,[]);console.log('Passed: live mapped movement/rotation, reversed axis, jaw response, instrument isolation, loss/reacquisition, neutral reset, one WebGL context and responsive camera visibility.');
}finally{await browser.close();}
