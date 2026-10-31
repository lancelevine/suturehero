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
 await page.addInitScript(()=>{
  window.__ballScene={shift:0,open:false,distractor:false,marker:true};window.__jawEvents=[];
  window.addEventListener('message',e=>{if(e.data?.type==='suturehero:jaw-opening')window.__jawEvents.push(e.data);});
  navigator.mediaDevices.enumerateDevices=async()=>[{kind:'videoinput',deviceId:'synthetic',label:'Synthetic ball pair camera',groupId:'test',toJSON(){return {};}}];
  navigator.mediaDevices.getUserMedia=async()=>{
   const image=new Image();image.src='/scripts/fixtures/aruco-4x4-50.png';await image.decode();
   const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const c=canvas.getContext('2d');
   const draw=()=>{
    const s=window.__ballScene;c.fillStyle='#eeeeee';c.fillRect(0,0,960,540);
    if(s.marker)c.drawImage(image,320,20,60,60,380+s.shift,200,36,36);
    c.fillStyle='rgb(225,50,60)';c.beginPath();c.arc((s.distractor?310:400)+s.shift,340,10,0,2*Math.PI);c.fill();
    c.fillStyle='rgb(30,100,235)';c.beginPath();c.arc((s.open?460:430)+s.shift,340,10,0,2*Math.PI);c.fill();
    requestAnimationFrame(draw);
   };draw();return canvas.captureStream(30);
  };
 });
 await page.goto(new URL('tracking.html',base).href);
 await page.locator('#start-camera').click();
 await page.waitForFunction(()=>document.querySelector('#marker-readout').textContent.includes('3'),{},{timeout:30000});
 await page.locator('#ball-instrument').evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
 await page.locator('#ball-instrument').selectOption('forceps');await page.locator('#ball-enable').check();
 const pick=async(side,x,y)=>{
  await page.locator(side===0?'#ball-pick-a':'#ball-pick-b').click();await page.locator('#camera-overlay').scrollIntoViewIfNeeded();const box=await page.locator('#camera-overlay').boundingBox();
  await page.mouse.click(box.x+x/960*box.width,box.y+y/540*box.height);
 };
 await pick(0,400,340);await pick(1,430,340);
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('paired with instrument'),{},{timeout:20000});
 assert.match(await page.locator('#ball-pick-a').evaluate(e=>e.style.borderColor),/rgb\(225, 50, 60\)/);
 assert.match(await page.locator('#ball-pick-b').evaluate(e=>e.style.borderColor),/rgb\(30, 100, 235\)/);
 await page.locator('#ball-closed').click();await page.evaluate(()=>window.__ballScene.open=true);
 await page.waitForFunction(()=>Number(document.querySelector('#ball-readout').textContent.match(/normalized separation ([0-9.]+)/)?.[1])>2.5,{},{timeout:20000});
 await page.locator('#ball-open').click();
 await page.waitForFunction(()=>window.__jawEvents.length>0,{},{timeout:10000});
 await page.evaluate(()=>window.__ballScene.distractor=true);
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('pair rejected or missing'),{},{timeout:15000});
 await page.waitForTimeout(400);const count=await page.evaluate(()=>window.__jawEvents.length);await page.waitForTimeout(450);
 assert.equal(await page.evaluate(()=>window.__jawEvents.length),count,'invalid pair must not refresh jaw readings');
 await page.evaluate(()=>{window.__ballScene.distractor=false;window.__ballScene.marker=false;});
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('waiting for this instrument'),{},{timeout:10000});
 await page.evaluate(()=>{window.__ballScene.marker=true;window.__ballScene.shift=80;});
 await page.waitForFunction(()=>document.querySelector('#ball-readout').textContent.includes('paired with instrument'),{},{timeout:20000});
 assert.deepEqual(errors,[]);console.log('Passed: sampled overlay colors, calibrated pair tracking, background rejection, missing-ArUco hold, and marker-relative reacquisition.');
}finally{await browser.close();}
