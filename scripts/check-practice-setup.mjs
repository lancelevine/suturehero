import {prepareEversion} from './guided-eversion.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor();
 for(const width of [320,375,390,760,900,1440]){
  await page.setViewportSize({width,height:1050});assert(await page.locator('.version').isVisible());
  assert(await page.evaluate(()=>{const r=document.querySelector('.version').getBoundingClientRect();return r.left>=document.querySelector('.brand').getBoundingClientRect().right&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth+1;}),`Header or page overflow at ${width}px`);
 }
 const selectSetup=async(id,value)=>{
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator(id).selectOption(value)]);await page.locator('canvas').waitFor();
 };
 await selectSetup('#skin-type','thick');assert.equal(await page.locator('#skin-type').inputValue(),'thick');
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#switch-environment').click()]);
 assert.equal(await page.locator('#viewport').getAttribute('data-environment'),'microsurgery');assert(await page.locator('#micro-target-field').isVisible());assert(!(await page.locator('#skin-type-field').isVisible()));
 await page.locator('#micro-target').selectOption('nerve');assert.match(await page.locator('.scene-heading h2').innerText(),/Nerve/);
 await page.waitForTimeout(700);if(process.env.SUTURE_SCREENSHOT_DIR)await page.locator('#viewport').screenshot({path:`${process.env.SUTURE_SCREENSHOT_DIR}/nerve.png`});
 await page.locator('#micro-target').selectOption('small-artery');assert.match(await page.locator('.scene-heading h2').innerText(),/Small artery/);
 await selectSetup('#needle-type','bv1');await selectSetup('#suture-material','monocryl');await selectSetup('#knot-technique','sliding');
 assert.equal(await page.locator('#micro-target').inputValue(),'small-artery');assert.equal(await page.locator('#needle-type').inputValue(),'bv1');assert.equal(await page.locator('#skin-type').inputValue(),'thick');
 assert.match(await page.locator('#right-tool-name').innerText(),/Castroviejo/);
 await page.locator('#begin-pass').click();await prepareEversion(page);await page.keyboard.down('u');
 await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Needle emerged'),{},{timeout:45000});await page.keyboard.up('u');
 await page.locator('#free-tying').click();await page.locator('#knot-state').waitFor();
 await page.waitForFunction(()=>document.querySelector('#guided-technique-field').hidden);
 assert.match(await page.locator('#exercise-readout').innerText(),/Detecting knot start/);assert.match(await page.locator('#knot-state').innerText(),/No throw formed/);
 // Wait for simulated frames: software rendering and bounded catch-up can
 // advance less physics than a wall-clock delay implies.
 await page.evaluate(async()=>{for(let i=0;i<240;i++)await new Promise(requestAnimationFrame);});
 await page.locator('#select-scissors').click();assert.match(await page.locator('#right-tool-name').innerText(),/Westcott/);
 await page.locator('#position-scissors').click();await page.keyboard.down(',');
 await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Suture cut'),{},{timeout:20000});await page.keyboard.up(',');
 assert.doesNotMatch(await page.locator('#exercise-readout').innerText(),/NaN|Infinity/);
 await page.locator('#reset').click();assert(!(await page.locator('#knot-state').isVisible()));
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#switch-environment').click()]);
 assert.equal(await page.locator('#viewport').getAttribute('data-environment'),'skin');assert.match(await page.locator('#right-tool-name').innerText(),/needle driver/);
 await selectSetup('#skin-type','thin');assert.equal(await page.locator('#skin-type').inputValue(),'thin');
 await page.locator('#free-tying').click();await page.waitForTimeout(1500);await page.locator('#select-scissors').click();assert.match(await page.locator('#right-tool-name').innerText(),/Mayo/);
 await page.locator('#position-scissors').click();await page.keyboard.down(',');await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Suture cut'),{},{timeout:20000});await page.keyboard.up(',');
 assert.deepEqual(errors,[]);console.log('Mobile build label, environment and target switching, setup persistence, free-tying status, Mayo and Westcott cutting passed.');
}finally{await browser.close();}
