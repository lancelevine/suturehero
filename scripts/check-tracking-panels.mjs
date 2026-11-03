import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(r.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page);
 const base=process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/';
 await page.goto(new URL('?graphics=low',base).href);
 await page.locator('#start-camera').click();
 await page.waitForFunction(()=>document.querySelector('#camera-video').videoWidth>0&&document.querySelector('#marker-readout').textContent.includes('3'),{},{timeout:45000});
 await page.evaluate(()=>window.__panelStream=document.querySelector('#camera-video').srcObject);
 assert.equal(await page.locator('.tracking-camera-card #roi-decode').count(),0);
 assert.equal(await page.locator('.tracking-camera-card #working-depth-mm').count(),0);
 assert.equal(await page.locator('#lock-depth').isVisible(),false,'Depth lock has one visible home in calibration');
 for(const width of [1440,900,390]){
  await page.setViewportSize({width,height:1000});
  for(const title of ['Tracking setup','Diagnostics']){
   await page.getByRole('button',{name:title,exact:true}).click();
   const dialog=page.getByRole('dialog',{name:title,exact:true});assert(await dialog.isVisible());
   assert(await dialog.evaluate(d=>{const r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;}),'Panel must fit the viewport');
   if(title==='Diagnostics'){
    await page.locator('[data-perf-copy]').click();
    await page.locator('[data-perf-report]').waitFor({state:'visible'});
    assert.equal(JSON.parse(await page.locator('[data-perf-report]').inputValue()).version,1);
   }
   await page.keyboard.press('Escape');assert(!(await dialog.isVisible()));
   assert(await page.locator('#workspace-calibration-drawer').isVisible(),'Closing a tool panel must not close calibration');
   assert(await page.getByRole('button',{name:title,exact:true}).evaluate(b=>b===document.activeElement),'Closing restores trigger focus');
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page must not overflow horizontally');
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Hide camera',exact:true}).click();assert(!(await page.locator('#camera-tracking-panel').isVisible()));
 await page.getByRole('button',{name:'Diagnostics',exact:true}).click();assert(await page.getByRole('dialog',{name:'Diagnostics',exact:true}).isVisible(),'Diagnostics is independent of camera panel visibility');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Camera',exact:true}).click();assert(await page.locator('#camera-tracking-panel').isVisible());
 assert(await page.evaluate(()=>document.querySelector('#camera-video').srcObject===window.__panelStream&&window.__panelStream.active),'Panel navigation must preserve the camera stream');
 await page.locator('#stop-camera').click();await page.waitForFunction(()=>!document.querySelector('#camera-video').srcObject);
 await page.goto(new URL('tracking.html',base).href);
 await page.getByRole('button',{name:'Tracking setup',exact:true}).click();
 await page.locator('#tracker-type').selectOption('ring6');assert.match(await page.locator('#tracker-type-status').innerText(),/6-face/);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Diagnostics',exact:true}).click();assert(await page.locator('#tracking-performance').isVisible());
 assert.deepEqual(errors,[]);console.log('Passed: separate camera/setup/diagnostics panels, report copying, responsive bounds, focus return, stream-preserving hide/show, stop, and standalone marker setup.');
}finally{await browser.close();}
