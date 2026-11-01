import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const base=process.env.SUTURE_TEST_URL??'http://127.0.0.1:5176/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async route=>route.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(route.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page);
 await page.goto(new URL('?graphics=low',base).href);
 const frame=await page.locator('#viewport').boundingBox();assert(frame.y<110&&frame.height>650,'suturing window should be large and at the top');
 await page.locator('#workspace-calibrate-toggle').click();await page.locator('#choose-primary-camera').waitFor();
 await page.locator('#choose-primary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic ball pair camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent.includes('3'),{},{timeout:30000});
 await page.locator('.tracking-advanced').evaluate(e=>e.open=true);
 await page.locator('#choose-secondary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic second camera'}).click();
 await page.waitForFunction(()=>document.querySelector('#camera-video-2').srcObject?.active&&!document.querySelector('#camera-video-2').closest('.tracking-video').hidden,{},{timeout:30000});
 await page.locator('.tracking-advanced').evaluate(e=>e.open=false);
 await page.evaluate(()=>window.__originalCameraVideo=document.querySelector('#camera-video'));
 const visible=async()=>{
  assert(await page.locator('#camera-video').isVisible());assert(await page.locator('#camera-video-2').isVisible());assert(await page.locator('#viewport').isVisible());
  const box=await page.locator('#camera-video').boundingBox();assert(box.y>=0&&box.y+box.height<=page.viewportSize().height+1,'camera feed must remain on screen while setting up');
  assert(await page.evaluate(()=>window.__originalCameraVideo===document.querySelector('#camera-video')&&document.querySelector('#camera-video').srcObject?.active));
 };
 for(const tool of ['forceps','needleDriver','scissors']){await page.locator(`[data-calibration-tool=${tool}]`).click();for(const pane of ['pose','jaws','axes']){await page.locator(`[data-calibration-pane=${pane}]`).click();await visible();}}
 await page.locator('.tracking-advanced').evaluate(e=>e.open=true);
 for(const checked of [false,true]){await page.locator('#lock-depth').setChecked(checked);for(const tool of ['forceps','needleDriver','scissors']){await page.locator(`[data-calibration-tool=${tool}]`).click();await page.locator('[data-calibration-pane=pose]').click();assert.equal(await page.locator('[data-profile-check=depthLock]').isChecked(),checked);}}
 await page.locator('.tracking-advanced').evaluate(e=>e.open=false);
 await page.locator('[data-calibration-tool=forceps]').click();await page.locator('[data-calibration-pane=pose]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-neutral]').disabled,{},{timeout:15000});await page.locator('[data-neutral]').click();assert.match(await page.locator('[data-calibration-message]').innerText(),/Neutral pose set/);
 await page.locator('[data-gain=movementGain]').fill('2');await page.locator('[data-gain=movementGain]').dispatchEvent('input');
 await page.locator('[data-calibration-tool=needleDriver]').click();assert.equal(await page.locator('[data-gain=movementGain]').inputValue(),'1');await page.locator('[data-mount=flip]').click();assert.equal(await page.locator('[data-mount=flip]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-calibration-tool=forceps]').click();assert.equal(await page.locator('[data-gain=movementGain]').inputValue(),'2');await page.locator('[data-save]').click();assert.match(await page.locator('[data-calibration-message]').innerText(),/saved/);
 await page.locator('#camera-tracking-hide').click();await visible();assert(await page.locator('#workspace-calibration-drawer').isHidden());
 await page.locator('#workspace-calibrate-toggle').click();await visible();
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);await visible();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow at '+width);}
 await page.setViewportSize({width:1440,height:1000});await page.reload();await page.locator('#workspace-calibrate-toggle').click();await page.locator('[data-calibration-tool=forceps]').click();await page.locator('[data-gain=movementGain]').waitFor();assert.equal(await page.locator('[data-gain=movementGain]').inputValue(),'2');await page.locator('[data-calibration-tool=needleDriver]').click();assert.equal(await page.locator('[data-mount=upright]').getAttribute('aria-pressed'),'true','unsaved driver edits must not persist');
 assert.deepEqual(errors,[]);console.log('Passed: large top workspace, device cards, persistent primary/secondary camera views through every instrument/tab, neutral pose, separate saved profiles, unsaved isolation, and mobile layout.');
}finally{await browser.close();}
