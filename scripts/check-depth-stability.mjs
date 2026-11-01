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
 await page.goto(new URL('tracking.html',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5176/').href);await page.locator('#start-camera').click();
 await page.waitForFunction(()=>document.querySelector('#tracking-filter-diagnostics').textContent.includes('forceps: distance'),{},{timeout:30000});
 await page.locator('.tracking-advanced').evaluate(e=>e.open=true);
 // Keep both synthetic distances inside the configured working range.
 await page.locator('#working-depth-mm').evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
 await page.locator('#working-depth-mm').fill('1000');await page.locator('#working-depth-mm').press('Tab');await page.waitForTimeout(400);
 const z=()=>page.locator('#tracking-filter-diagnostics').textContent().then(t=>Number(t.match(/forceps: distance [\d.]+ mm · virtual Z (-?[\d.]+)/)[1]));
 const locked=await z();await page.locator('#lock-depth').uncheck();await page.waitForTimeout(400);const unlocked=await z();assert(Math.abs(unlocked-locked)<.05,`unlocking must preserve current source depth: ${locked} → ${unlocked}`);
 const samples=[];
 for(let i=0;i<12;i++){await page.evaluate(i=>window.__ballScene.scale=i%2?1.01:.99,i);await page.waitForTimeout(100);samples.push(await z());}
 assert(Math.max(...samples)-Math.min(...samples)<.12,'small apparent-size noise should not cause depth jumps');
 await page.evaluate(()=>window.__ballScene.scale=.72);try{await page.waitForFunction(start=>{const m=document.querySelector('#tracking-filter-diagnostics').textContent.match(/forceps: distance [\d.]+ mm · virtual Z (-?[\d.]+)/);return m&&Number(m[1])>start+.2;},locked,{timeout:10000});}catch(e){console.log(await page.locator('#tracking-filter-diagnostics').textContent(),await page.locator('#forceps-readout').textContent());throw e;}
 assert.deepEqual(errors,[]);console.log('Passed: real camera pipeline preserves depth on unlock, suppresses small apparent-size jitter and follows deliberate farther movement.');
}finally{await browser.close();}
