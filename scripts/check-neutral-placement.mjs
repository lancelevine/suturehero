// Dev-server integration: inspect tool positions through a test-only response patch.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch(),body=await response.text(),patched=body.replace(/const scissors = new Scissors\(\);/,'window.__neutralCheckTools = tools; const scissors = new Scissors();');assert.notEqual(body,patched,'test must locate tool initialization');await route.fulfill({response,body:patched});});
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5178/').href);await page.waitForFunction(()=>window.__neutralCheckTools?.length===2);
 const initial=await page.evaluate(()=>window.__neutralCheckTools.map(t=>t.root.position.toArray()));
 await page.locator('[data-calibration-tool=forceps]').click();
 await page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts'),T=await import('/node_modules/.vite/deps/three.js');window.source=[.9,2.3,1.7];window.feed=setInterval(()=>{const pose=c.transform('forceps',new T.Vector3(...window.source),new T.Quaternion());window.dispatchEvent(new CustomEvent('suturehero:tracking-pose',{detail:{type:'suturehero:tracking-pose',instrument:'forceps',position:pose.position.toArray(),quaternion:pose.quaternion.toArray()}}));},50);});
 await page.waitForFunction(()=>!document.querySelector('[data-neutral]').disabled);await page.waitForTimeout(200);
 const before=await page.evaluate(()=>window.__neutralCheckTools[0].root.position.toArray());assert(Math.abs(before[0]-initial[0][0])<.02,'initial acquisition must preserve placement');
 await page.locator('[data-neutral]').click();
 await page.waitForFunction(()=>{const p=window.__neutralCheckTools[0].root.position;return Math.abs(p.x-.9)<.02&&Math.abs(p.y-1.2)<.02;});
 const after=await page.evaluate(()=>window.__neutralCheckTools.map(t=>t.root.position.toArray()));assert(Math.abs(after[0][2]-before[2])<.02,'neutral preserves depth');assert.deepEqual(after[1],initial[1],'driver must remain unchanged');
 await page.evaluate(()=>window.source=[1,2.45,1.7]);await page.waitForFunction(()=>{const p=window.__neutralCheckTools[0].root.position;return Math.abs(p.x-1)<.02&&Math.abs(p.y-1.35)<.02;});
 await page.evaluate(()=>clearInterval(window.feed));assert.deepEqual(errors,[]);console.log('Passed: real Set neutral button aligns forceps main-view XY, keeps depth and driver placement, and subsequent tracking continues without a jump.');
}finally{await browser.close();}
