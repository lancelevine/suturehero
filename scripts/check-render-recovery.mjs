import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async route=>route.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(route.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page);
 await page.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;window.__gpu=[];
  HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=original.call(this,type,...args);if(gl&&(type==='webgl'||type==='webgl2')&&!window.__gpu.some(v=>v.gl===gl)){const item={gl,canvas:this,draws:0};window.__gpu.push(item);for(const name of ['drawElements','drawArrays']){const draw=gl[name].bind(gl);gl[name]=(...args)=>{item.draws++;return draw(...args);};}}return gl;};
 });
 await page.goto(process.env.SUTURE_TEST_URL??'http://127.0.0.1:5176/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__gpu[0]?.draws>0);
 assert.equal(await page.evaluate(()=>window.__gpu.length),1);
 await page.locator('#begin-pass').click();const maneuver=await page.locator('#exercise-title').textContent();
 for(const withCamera of [false,true]){
  if(withCamera){assert(await page.locator('#workspace-calibration-drawer').isVisible());await page.locator('#choose-primary-camera').click();await page.locator('.camera-device-card').filter({hasText:'Synthetic ball pair camera'}).click();await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent==='3',{},{timeout:30000});assert.equal(await page.evaluate(()=>window.__gpu.length),1,'embedded camera tracking must not allocate another WebGL context');}
  for(let attempt=0;attempt<2;attempt++){
   await page.evaluate(()=>{const item=window.__gpu[0];window.__lossExtension=item.gl.getExtension('WEBGL_lose_context');window.__lossExtension.loseContext();});
   await page.waitForFunction(()=>document.querySelector('#viewport>canvas').dataset.renderState==='lost');
   assert(await page.locator('.render-recovery').isVisible());
   await page.waitForTimeout(250);assert.equal(await page.locator('#exercise-title').textContent(),maneuver);
   await page.evaluate(()=>window.__lossExtension.restoreContext());
   await page.waitForFunction(()=>document.querySelector('#viewport>canvas').dataset.renderState==='ready');
   const draws=await page.evaluate(()=>window.__gpu[0].draws);await page.waitForFunction(before=>window.__gpu[0].draws>before,draws);
   assert(await page.locator('.render-recovery').isHidden());assert.equal(await page.locator('#exercise-title').textContent(),maneuver);assert.equal(await page.locator('#graphics-quality').inputValue(),'low');
  }
  if(withCamera){assert(await page.locator('#camera-video').evaluate(v=>v.srcObject?.active));await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent==='3');}
 }
 await page.locator('#camera-tracking-hide').click();
 for(const width of [390,1920,3840,1440]){await page.setViewportSize({width,height:1100});await page.waitForTimeout(150);const pixels=await page.locator('#viewport>canvas').evaluate(c=>c.width*c.height);assert(pixels<=750000,'recovered graphics must keep bounded buffers');}
 if(process.env.SUTURE_RENDER_SOAK_MS){await page.evaluate(async ms=>{const select=document.querySelector('#graphics-quality');select.value='standard';select.dispatchEvent(new Event('change'));const start=performance.now();let lowered=false;while(performance.now()-start<ms){if(!lowered&&performance.now()-start>ms/2){select.value='low';select.dispatchEvent(new Event('change'));lowered=true;}window.__ballScene.shift=60*Math.sin((performance.now()-start)/400);await new Promise(r=>setTimeout(r,70));if(document.querySelector('#viewport>canvas').dataset.renderState!=='ready')throw Error('Scene lost during sustained camera session');}},Number(process.env.SUTURE_RENDER_SOAK_MS));assert.equal(await page.evaluate(()=>window.__gpu.length),1);}
 assert.deepEqual(errors,[]);console.log('Passed: repeated real WebGL loss/restoration with and without camera tracking, stitch retained, one GPU context, resumed draw calls and bounded high-DPI buffers.');
}finally{await browser.close();}
