import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{window.__cameraRequests=0;navigator.mediaDevices.getUserMedia=async()=>{window.__cameraRequests++;throw new Error('Opening the Lab must not request a camera');};window.__labKeys=0;window.addEventListener('keydown',()=>window.__labKeys++);});
 await page.goto(process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/');
 await page.getByRole('tab',{name:'Tracking Lab',exact:true}).click();
 const boxes=await page.locator('.lab-camera').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};}));
 assert.equal(boxes.length,2);assert.equal(boxes[0].y,boxes[1].y);assert(boxes[1].x>boxes[0].x+boxes[0].width);
 assert((await page.locator('#tracking-lab').boundingBox()).width>1200);assert(!(await page.locator('.suturing-app').isVisible()));
 // Live virtual instruments (src/trackingLab/liveView.ts): the simulator view moves into the Lab and keeps rendering.
 const live=await page.evaluate(()=>{const v=document.querySelector('#viewport');const r=v.getBoundingClientRect();return {inLab:!!v.closest('#tracking-lab'),width:r.width,height:r.height,canvas:!!v.querySelector('canvas')};});
 assert(live.inLab&&live.canvas&&live.width>600&&live.height>200,JSON.stringify(live));
 const frames=async()=>page.evaluate(()=>new Promise(resolve=>{const c=document.querySelector('#viewport canvas');let n=0;const start=performance.now();requestAnimationFrame(function tick(){n++;if(performance.now()-start<500)requestAnimationFrame(tick);else resolve({n,state:c.dataset.renderState});});}));
 assert.equal((await frames()).state,'ready');
 await page.locator('#lab-duration').focus();await page.keyboard.press('ArrowUp');assert.equal(await page.locator('#lab-duration').inputValue(),'5000');assert.equal(await page.evaluate(()=>window.__labKeys),0);
 await page.getByRole('tab',{name:'Simulator',exact:true}).focus();await page.keyboard.press('Space');await page.locator('.suturing-app').waitFor({state:'visible'});
 assert(await page.evaluate(()=>!!document.querySelector('#viewport').closest('.suturing-app')),'viewport returns to the simulator');
 await page.getByRole('tab',{name:'Tracking Lab',exact:true}).focus();await page.keyboard.press('Space');await page.locator('#tracking-lab').waitFor({state:'visible'});
 assert.equal(await page.locator('iframe.tracking-lab-engine').count(),0);assert.equal(await page.evaluate(()=>window.__cameraRequests),0);assert.deepEqual(errors,[]);
 console.log('Passed: dedicated full-size Lab, side-by-side cameras, keyboard controls isolated from gameplay, keyboard tab navigation, live virtual view moved in and back, and no unsolicited camera access.');
}finally{await browser.close();}
