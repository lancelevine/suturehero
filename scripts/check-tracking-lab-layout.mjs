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
 await page.locator('#lab-duration').focus();await page.keyboard.press('ArrowUp');assert.equal(await page.locator('#lab-duration').inputValue(),'5000');assert.equal(await page.evaluate(()=>window.__labKeys),0);
 await page.getByRole('tab',{name:'Simulator',exact:true}).focus();await page.keyboard.press('Space');await page.locator('.suturing-app').waitFor({state:'visible'});
 await page.getByRole('tab',{name:'Tracking Lab',exact:true}).focus();await page.keyboard.press('Space');await page.locator('#tracking-lab').waitFor({state:'visible'});
 assert.equal(await page.locator('iframe.tracking-lab-engine').count(),0);assert.equal(await page.evaluate(()=>window.__cameraRequests),0);assert.deepEqual(errors,[]);
 console.log('Passed: dedicated full-size Lab, side-by-side cameras, keyboard controls isolated from gameplay, keyboard tab navigation, and no unsolicited camera access.');
}finally{await browser.close();}
