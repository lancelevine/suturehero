// Run against the Vite dev server: supplies repeatable poses through the real calibration module.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5175/').href);
await page.locator('[data-guide-start]').waitFor({state:'attached'});
await page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');const {TrackedPoseFilter}=await import('/src/input/TrackedPoseFilter.ts');const T=await import('/node_modules/.vite/deps/three.js');const filter=new TrackedPoseFilter();let frame=0;window.pose=[0,0,0];window.feed=setInterval(()=>{const noise=++frame%2?.05:-.05,v=new T.Vector3(...window.pose).add(new T.Vector3(noise,noise*.4,0)),a=v.length(),now=performance.now();filter.update(new T.Vector3(noise*.05,0,0),a?new T.Quaternion().setFromAxisAngle(v.normalize(),a):new T.Quaternion(),now);c.transform('needleDriver',filter.position,filter.quaternion,now);},50);});
await page.waitForFunction(()=>!document.querySelector('[data-neutral]').disabled);
await page.locator('.rotation-guide').evaluate(e=>e.open=true);await page.locator('[data-guide-start]').click();
const capture=page.locator('[data-guide-capture]');
page.on('pageerror',e=>console.log('ERROR',e.message));

for(const pose of [[.6,0,0],[-.6,0,0],[0,.6,0],[0,-.6,0],[0,0,.6],[0,0,-.6]]){
 await page.evaluate(()=>window.pose=[0,0,0]);await capture.waitFor();await page.waitForFunction(()=>!document.querySelector('[data-guide-capture]').disabled);assert.match(await capture.textContent(),/Confirm neutral/);await capture.click();assert.match(await page.locator('[data-guide-instruction]').textContent(),/^Check /);
 assert(await capture.isDisabled());await page.evaluate(p=>window.pose=p,pose);await page.waitForFunction(()=>!document.querySelector('[data-guide-capture]').disabled);await capture.click();
}
assert.match(await page.locator('[data-calibration-message]').textContent(),/All six rotation checks passed/);
assert.match(await page.locator('[data-guide-instruction]').textContent(),/Six checks passed/);
await page.evaluate(()=>clearInterval(window.feed));console.log('PASS: all six guided UI steps with noisy poses through the live filter, stable holds, neutral gates and final apply');
}finally{await browser.close();}
