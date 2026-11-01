import {installSyntheticCamera} from './synthetic-camera.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
const base=process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async route=>route.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(route.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await installSyntheticCamera(page,{muted:!!process.env.SUTURE_BALL_MUTED});
 await page.goto(new URL('tracking.html',base).href);
 await page.locator('#start-camera').click();
 await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent.includes('3'),{},{timeout:30000});
 await page.locator('[data-calibration-tool=forceps]').click();await page.locator('[data-calibration-pane=jaws]').click();
 const pick=async(side,x,y)=>{
  await page.locator(side===0?'#ball-pick-a':'#ball-pick-b').click();await page.locator('#camera-overlay').scrollIntoViewIfNeeded();const box=await page.locator('#camera-overlay').boundingBox();
  await page.mouse.click(box.x+x/960*box.width,box.y+y/540*box.height);
 };
 await pick(0,400,340);
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('A acquiring'),{},{timeout:10000});
 await page.evaluate(()=>window.__ballScene.shift=20);await page.waitForTimeout(400);
 assert.match(await page.locator('#ball-readout').innerText(),/A acquiring/);
 await pick(1,450,340);
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('paired with instrument'),{},{timeout:20000});
 assert.match(await page.locator('#ball-pick-a').evaluate(e=>e.style.borderColor),process.env.SUTURE_BALL_MUTED?/rgb\(120, 95, 90\)/:/rgb\(225, 50, 60\)/);
 assert.match(await page.locator('#ball-pick-b').evaluate(e=>e.style.borderColor),process.env.SUTURE_BALL_MUTED?/rgb\(90, 100, 130\)/:/rgb\(30, 100, 235\)/);
 await page.locator('#ball-closed').click();await page.waitForFunction(()=>document.querySelector('#ball-calibration-status').textContent.includes('Near closed recorded'));await page.evaluate(()=>window.__ballScene.open=true);
 await page.waitForFunction(()=>Number(document.querySelector('#ball-readout').textContent.match(/normalized separation ([0-9.]+)/)?.[1])>2.5,{},{timeout:20000});
 await page.waitForTimeout(600);await page.locator('#ball-open').click();await page.waitForFunction(()=>document.querySelector('#ball-calibration-status').textContent.includes('Near open recorded'));
 await page.waitForFunction(()=>window.__jawEvents.length>0,{},{timeout:10000});
 if(process.env.SUTURE_JAW_DEPTH){
  await page.locator('#ball-calibration-distance').selectOption('far');
  await page.evaluate(()=>{window.__ballScene.scale=.7;window.__ballScene.separationBias=4;window.__ballScene.open=false;});await page.waitForTimeout(1200);
  await page.locator('#ball-closed').click();await page.waitForFunction(()=>document.querySelector('#ball-calibration-status').textContent.includes('Far closed recorded'));
  await page.evaluate(()=>window.__ballScene.open=true);await page.waitForTimeout(900);await page.locator('#ball-open').click();
  await page.waitForFunction(()=>document.querySelector('#ball-calibration-status').textContent.includes('Near/Far compensation ready'));
  for(const [scale,bias] of [[1,0],[.85,2],[.7,4]]){
   await page.evaluate(({scale,bias})=>{window.__ballScene.scale=scale;window.__ballScene.separationBias=bias;window.__ballScene.open=false;},{scale,bias});
   await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('jaw 0%'),{},{timeout:10000});
   await page.evaluate(()=>window.__ballScene.open=true);await page.waitForFunction(()=>window.__jawEvents.at(-1)?.opening>.85,{},{timeout:10000});
  }
  await page.locator('[data-calibration-tool=needleDriver]').click();await page.waitForFunction(()=>document.querySelector('#ball-calibration-status').textContent.includes('Near: closed — / open —'));
  await page.locator('[data-calibration-tool=forceps]').click();await page.waitForFunction(()=>document.querySelector('#ball-calibration-status').textContent.includes('Near/Far compensation ready'));
  await page.evaluate(()=>{window.__ballScene.scale=1;window.__ballScene.separationBias=0;});await page.waitForTimeout(800);
 }
 await page.evaluate(()=>window.__ballScene.distractor=true);
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('pair rejected or missing'),{},{timeout:15000});
 await page.waitForTimeout(400);const count=await page.evaluate(()=>window.__jawEvents.length);await page.waitForTimeout(450);
 assert.equal(await page.evaluate(()=>window.__jawEvents.length),count,'invalid pair must not refresh jaw readings');
 await page.evaluate(()=>{window.__ballScene.distractor=false;window.__ballScene.marker=false;});
 await page.waitForTimeout(1200);assert.match(await page.locator('#ball-readout').textContent(),/paired with instrument/,'calibrated ball pair can bridge a temporary marker loss');
 await page.evaluate(()=>{window.__ballScene.marker=true;window.__ballScene.shift=80;});
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('paired with instrument'),{},{timeout:20000});
 assert.deepEqual(errors,[]);console.log(process.env.SUTURE_JAW_DEPTH?'Passed: averaged near/far closed/open captures, closed zero and opening across three depths, and per-instrument isolation.':'Jaw baseline check.');console.log('Passed: persistent single-ball acquisition, sampled overlay colors, calibrated pair tracking, background rejection, missing-ArUco hold, and marker-relative reacquisition.');
}finally{await browser.close();}
