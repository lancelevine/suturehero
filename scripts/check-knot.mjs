import {prepareEversion,advanceGuidedPass} from './guided-eversion.mjs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1180}}); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SUTURE_TEST_URL ?? 'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  if(process.env.SUTURE_TEST_COURSE){await page.locator('#start-course').click();assert.match(await page.locator('#course-status').innerText(),/Stitch 1 \/ 3/);assert.equal(await page.locator('#next-stitch').isDisabled(),true);}
  if(process.env.SUTURE_TEST_BITES){
    await page.locator('#right-bite').fill('130');await page.locator('#right-bite').dispatchEvent('input');
    await page.locator('#stitch-position').fill('-100');await page.locator('#stitch-position').dispatchEvent('input');
    await page.locator('#show-needle-guide').uncheck();assert.equal(await page.locator('#show-needle-guide').isChecked(),false);
    assert.notEqual(await page.locator('#right-bite-value').innerText(),await page.locator('#left-bite-value').innerText());
  }
  if(process.env.SUTURE_TEST_DEPTH){
    assert.equal(await page.locator('#cross-section').isVisible(),false);
    await page.locator('#show-cross-section').check();
    await page.waitForFunction(()=>document.querySelector('#cross-section-readout').textContent.includes('Deep dermal gap'));
    assert.equal(await page.locator('#cross-section-canvas').isVisible(),true);
  }
  await page.getByRole('button',{name:'Start guided pass'}).click();
  if(process.env.SUTURE_TEST_TRACTION){
    await page.locator('#position-forceps').click();await page.keyboard.down('z');
    await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Skin edge held'));await page.keyboard.up('z');
    const liftTo=async state=>{await page.keyboard.down('Shift');await page.keyboard.down('e');await page.waitForFunction(s=>document.querySelector('#skin-traction').dataset.state===s,state,{timeout:15000});await page.keyboard.up('e');await page.keyboard.up('Shift');};
    await liftTo('stretching');
    await page.keyboard.down('Shift');await page.keyboard.down('q');await page.waitForFunction(()=>document.querySelector('#skin-traction').dataset.state==='gentle'&&!document.querySelector('#begin-pass').disabled);await page.keyboard.up('q');await page.keyboard.up('Shift');
    await liftTo('slipping');await page.waitForFunction(()=>document.querySelector('#skin-traction').dataset.state==='slipped',{},{timeout:15000});
    assert.equal(await page.locator('#begin-pass').isDisabled(),true);assert.match(await page.locator('#stitch-quality').innerText(),/Skin grasp slips: 1/);
    assert.match(await page.locator('#skin-traction-state').innerText(),/Open X/);await page.waitForTimeout(800);
  }
  await prepareEversion(page);
  if(process.env.SUTURE_TEST_BITES){await page.waitForFunction(()=>document.querySelector('#bite-controls').disabled);assert.equal(await page.locator('#right-bite').isDisabled(),true);}
  if(await page.locator('#close-up').getAttribute('aria-pressed')==='false')await page.locator('#close-up').click();
  await advanceGuidedPass(page);
  console.log('Guided needle emergence passed.');
  await page.keyboard.down('x');await page.waitForFunction(()=>!document.querySelector('#position-forceps').disabled,{},{timeout:15000});await page.keyboard.up('x');
  await page.locator('#grip-point').fill('85'); await page.locator('#grip-point').dispatchEvent('input');
  await page.getByRole('button',{name:'Position forceps',exact:true}).click();
  await page.keyboard.down('z'); await page.waitForFunction(()=>document.querySelector('#grasp-status').textContent.includes('grip ready'),{},{timeout:10000}); await page.keyboard.up('z');
  await page.keyboard.down('.'); await page.waitForFunction(()=>document.querySelector('#grasp-status').textContent.includes('Needle held · left'),{},{timeout:10000}); await page.keyboard.up('.');
  await page.keyboard.down('r'); await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('fully through'),{},{timeout:45000}); await page.keyboard.up('r');
  console.log('Needle transfer and extraction passed.');
  await page.getByRole('button',{name:'Begin knot tying',exact:true}).click();
  for(const [wrap,first,second] of [['r','a','ArrowRight'],['y','d','ArrowLeft']]) {
    await page.keyboard.down(wrap);
    await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Click Position driver at tail'),{},{timeout:45000});
    await page.keyboard.up(wrap);
    await page.getByRole('button',{name:'Position driver at tail',exact:true}).click();
    await page.keyboard.down(',');
    await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('pull the ends apart'),{},{timeout:10000});
    await page.keyboard.up(',');
    await page.keyboard.down(first); await page.keyboard.down(second);
    await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('First throw seated') || document.querySelector('#exercise-title').textContent.includes('square-knot sequence complete'),{},{timeout:45000});
    await page.keyboard.up(first); await page.keyboard.up(second);console.log(`Guided ${wrap==='r'?'double first':'opposing'} throw seated.`);
    if(wrap==='r')await page.getByRole('button',{name:'Next opposing throw',exact:true}).click();
  }
  await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Local wound edges approximated'),{},{timeout:10000});
  await page.keyboard.down('x');
  await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Open right driver with period'),{},{timeout:10000});
  await page.keyboard.up('x');
  assert.match(await page.locator('#exercise-readout').innerText(),/Release check: waiting/);
  await page.keyboard.down('.');
  await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Release check: observing'),{},{timeout:10000});
  await page.keyboard.up('.');
  await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Release check: passed'),{},{timeout:45000});
  console.log('Release-and-hold check passed.');
  await page.getByRole('button',{name:'Position driver at released tail',exact:true}).click();
  await page.keyboard.down(',');
  await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Hold Left arrow'),{},{timeout:10000});
  await page.keyboard.up(',');await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(()=>Number(document.querySelector('#exercise-readout').textContent.match(/Pull load: ([0-9.]+)/)?.[1])>=0.25,{},{timeout:60000});
  await page.keyboard.up('ArrowLeft');
  await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Gentle pull check complete'),{},{timeout:15000});
  assert.deepEqual(errors,[],'Browser runtime errors');
  assert.match(await page.locator('#exercise-title').innerText(),/Gentle pull check complete/);
  assert.match(await page.locator('#exercise-readout').innerText(),/2 \/ 2 throws seated/);
  await page.getByRole('button',{name:'Use scissors',exact:true}).click();
  await page.getByRole('button',{name:'Position scissors at tail',exact:true}).click();
  await page.keyboard.down(',');
  await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Suture cut'),{},{timeout:15000});
  await page.keyboard.up(',');
  assert.match(await page.locator('#exercise-title').innerText(),/Tails trimmed/);
  assert.match(await page.locator('#stitch-quality').innerText(),/Tails trimmed: 1\/2/);
  await page.getByRole('button',{name:'Position scissors at tail',exact:true}).click();
  await page.keyboard.down(',');
  await page.waitForFunction(()=>document.querySelector('#stitch-quality').textContent.includes('Tails trimmed: 2/2'),{},{timeout:15000});
  await page.keyboard.up(',');
  assert.match(await page.locator('#stitch-stage').innerText(),/Stitch exercise complete/);
  if(process.env.SUTURE_TEST_DEPTH){
    assert.match(await page.locator('#stitch-quality').innerText(),/Deep dermal closure:/);
    assert.match(await page.locator('#cross-section-readout').innerText(),/Surface gap.*Deep dermal gap/);
    await page.locator('#cross-section').screenshot({path:'/tmp/suture-cross-section.png'});
    await page.locator('#show-cross-section').uncheck();assert.equal(await page.locator('#cross-section').isVisible(),false);
    await page.locator('#show-cross-section').check();
  }
  if(process.env.SUTURE_TEST_BITES)assert.match(await page.locator('#stitch-quality').innerText(),/unequal widths.*planned/);
  if(process.env.SUTURE_TEST_TRACTION)assert.match(await page.locator('#stitch-quality').innerText(),/Skin grasp slips: 1/);
  if(process.env.SUTURE_TEST_COURSE){
    await page.locator('#next-stitch').click();
    await page.waitForFunction(()=>document.querySelector('#course-status').textContent.includes('Stitch 2 / 3'));
    assert.equal(await page.locator('#course-review li').count(),1);
    if(process.env.SUTURE_TEST_TRACTION){assert.match(await page.locator('#course-review').innerText(),/Skin grasp slips: 1/);assert.doesNotMatch(await page.locator('#stitch-quality').innerText(),/Skin grasp slips/);}
    assert.match(await page.locator('#stitch-stage').innerText(),/Evert and pass/);
    assert.equal(await page.locator('#next-stitch').isDisabled(),true);
    assert.equal(await page.locator('#free-tying').isDisabled(),true);
    for(const width of [320,390,1440]){await page.setViewportSize({width,height:1180});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await page.locator('.version').isVisible());}
    if(process.env.SUTURE_SCREENSHOT)await page.locator('#viewport').screenshot({path:process.env.SUTURE_SCREENSHOT});
    await page.getByRole('button',{name:'Start guided pass',exact:true}).click();await prepareEversion(page);
    await advanceGuidedPass(page);
    assert.equal(await page.locator('#course-review li').count(),1);
    await page.locator('#reset').click();await page.waitForFunction(()=>document.querySelector('#course-status').textContent==='One-stitch practice');
    assert.equal(await page.locator('#course-review').isVisible(),false);assert.equal(await page.locator('#free-tying').isDisabled(),false);
  }
  assert.deepEqual(errors,[],'Browser runtime errors after trimming');
  console.log(JSON.stringify({result:await page.locator('#exercise-title').innerText(),readout:await page.locator('#exercise-readout').innerText(),errors}));
} finally {await browser.close();}
