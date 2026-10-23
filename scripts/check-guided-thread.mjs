import {prepareEversion} from './guided-eversion.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try {
 for(const setup of ['', '?environment=microsurgery&target=small-artery&needle=bv1']){
  const page=await browser.newPage({viewport:{width:1440,height:1180},deviceScaleFactor:.5}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(new URL(setup,process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href,{waitUntil:'domcontentloaded'});
  await page.locator('#graphics-quality').selectOption('low');
  for(const width of [320,375,1440]){await page.setViewportSize({width,height:1180});assert(await page.locator('.version').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.getByRole('button',{name:'Start guided pass',exact:true}).click();await prepareEversion(page);
  await page.keyboard.down('u');await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Needle emerged'),{},{timeout:45000});await page.keyboard.up('u');
  await page.locator('#graphics-quality').selectOption('standard');await page.locator('#graphics-quality').selectOption('low');
  assert.match(await page.locator('#exercise-title').innerText(),/Needle emerged/);assert.match(page.url(),/graphics=low/);
  await page.keyboard.down('x');await page.waitForFunction(()=>!document.querySelector('#position-forceps').disabled,{},{timeout:15000});await page.keyboard.up('x');
  await page.locator('#grip-point').fill('85');await page.locator('#grip-point').dispatchEvent('input');
  await page.getByRole('button',{name:'Position forceps',exact:true}).click();
  await page.keyboard.down('z');await page.waitForFunction(()=>document.querySelector('#grasp-status').textContent.includes('grip ready'),{},{timeout:15000});await page.keyboard.up('z');
  await page.keyboard.down('.');await page.waitForFunction(()=>document.querySelector('#grasp-status').textContent.includes('Needle held · left'),{},{timeout:15000});await page.keyboard.up('.');
  await page.keyboard.down('r');await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('fully through'),{},{timeout:45000});await page.keyboard.up('r');
  assert.doesNotMatch(await page.locator('#exercise-readout').innerText(),/NaN|Infinity/);
  if(!setup){
   assert.equal(await page.locator('#begin-free-knot').isDisabled(),false);
   await page.locator('#begin-free-knot').click();
   await page.waitForFunction(()=>document.querySelector('#stitch-stage').textContent.includes('Tie and seat'));
   assert.equal(await page.locator('#begin-free-knot').isDisabled(),true);
   assert.equal(await page.locator('#knot-action').isDisabled(),true);
   assert(await page.locator('#tension-panel').isVisible());
   await page.evaluate(async()=>{for(let i=0;i<240;i++)await new Promise(requestAnimationFrame);});
   await page.locator('#select-scissors').click();assert.match(await page.locator('#right-tool-name').innerText(),/Mayo/);
   await page.locator('#position-scissors').click();await page.keyboard.down(',');
   await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Long tail cut'),{},{timeout:20000});await page.keyboard.up(',');
   assert.match(await page.locator('#stitch-quality').innerText(),/Tails trimmed: 1\/2/);
  }
  assert.deepEqual(errors,[]);console.log(`${setup?'Microsurgery BV-1':'Skin and Mayo cutting'}: guided emergence, handoff, and extraction passed.`);await page.close();
 }
}finally{await browser.close();}
