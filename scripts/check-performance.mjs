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
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5176/').href);await page.locator('#choose-primary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic ball pair camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent.includes('3'),{},{timeout:30000});
 await page.getByRole('button',{name:'Diagnostics',exact:true}).click();await page.waitForTimeout(5500);
 await page.locator('[data-perf-copy]').click();let report=JSON.parse(await page.locator('[data-perf-report]').inputValue());
 const required=['Camera 1 presented frames','Camera 1 decode worker','Camera 1 decode round trip','Camera 1 decode dictionary decoding','Camera 1 decode contour detection','Camera 1 decode frame age','Camera 1 flow worker','Pose estimation + filtering','Simulator render submission','Simulator CPU frame','Tracking CPU frame','Camera 1 flow readback','Tracking status UI'];
 for(const name of required){const row=report.performance.rows.find(r=>r.name===name);assert(row,'report missing '+name);assert(row.count>0&&Number.isFinite(row.meanMs)&&row.meanMs>=0&&row.p95Ms>=0);}
 assert.equal(report.context.build,'0.75');
 const count=name=>report.performance.rows.find(r=>r.name===name)?.count??0;assert(Math.abs(count('Camera 1 flow readback')-count('Camera 1 capture attempts'))<=2,'each captured image should need only one flow readback');assert(Object.keys(report.performance.counters).some(k=>k.startsWith('Camera 1 full reason:')));assert(report.performance.rows.some(r=>/Camera 1 (full|predicted) decode worker/.test(r.name)));
assert(report.context.decode1.width<=960&&report.context.decode1.height<=540);assert.equal(report.context.roiDecode,true,'predictive decode should be enabled');
 assert(!JSON.stringify(report).includes('synthetic-secondary'),'report must not include device IDs');
 await page.keyboard.press('Escape');await page.locator('#choose-secondary-camera').evaluate(e=>e.closest('details').open=true);await page.locator('#choose-secondary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic second camera'}).click();await page.waitForTimeout(4500);await page.getByRole('button',{name:'Diagnostics',exact:true}).click();
 await page.locator('[data-perf-copy]').click();report=JSON.parse(await page.locator('[data-perf-report]').inputValue());
 for(const name of ['Camera 2 presented frames','Camera 2 decode worker','Camera 2 flow worker','Camera capture skew','Camera accepted-update skew'])assert(report.performance.rows.some(r=>r.name===name),'second-camera report missing '+name);
 await page.locator('[data-perf-reset]').click();await page.locator('[data-perf-copy]').click();report=JSON.parse(await page.locator('[data-perf-report]').inputValue());assert(report.performance.elapsedSeconds<3);assert(await page.locator('#camera-video').isVisible());
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.deepEqual(errors,[]);console.log('Passed: live camera/decode/flow/pose/render/age metrics, copyable structured report, both-camera synchronization, timing reset, predictive search diagnostics and responsive layout.');
}finally{await browser.close();}
