import {prepareEversion} from './guided-eversion.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1180}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  const build=await page.locator('.version').innerText();assert.match(build,/BUILD \d+\.\d+/);
  const evertSkin=async()=>{
    await page.getByRole('button',{name:'Position forceps at skin edge',exact:true}).click();
    await page.keyboard.down('z');await page.waitForFunction(()=>document.querySelector('#grasp-status').textContent.includes('holding skin edge'),{},{timeout:15000});await page.keyboard.up('z');
    await page.keyboard.down('Shift');await page.keyboard.down('e');
    await page.waitForFunction(()=>document.querySelector('#grasp-status').textContent.includes('Edge everted'),{},{timeout:15000});
    await page.keyboard.up('e');await page.keyboard.up('Shift');
  };
  await evertSkin();
  assert.match(await page.locator('#begin-pass').innerText(),/Start guided pass/);
  await page.getByRole('button',{name:'Reset practice',exact:true}).click();
  await page.getByRole('button',{name:'Free tying lab',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Forceps: holding'));
  assert.equal(await page.locator('#begin-pass').isDisabled(),true);
  assert.match(await page.locator('#knot-state').innerText(),/No throw formed.*Make a complete wrap/s);
  await page.keyboard.down('m');
  await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Driver at tissue surface'),{},{timeout:15000});
  await page.waitForTimeout(300);await page.keyboard.up('m');
  assert.match(await page.locator('#exercise-readout').innerText(),/Driver at tissue surface/);
  await page.keyboard.down('n');
  await page.waitForFunction(()=>!document.querySelector('#exercise-readout').textContent.includes('Driver at tissue surface'),{},{timeout:15000});
  await page.keyboard.up('n');

  await page.keyboard.down('d');await page.keyboard.down('n');await page.keyboard.down('r');
  await page.waitForTimeout(1200);
  await page.keyboard.up('d');await page.keyboard.up('n');await page.keyboard.up('r');
  await page.keyboard.down('m');await page.waitForTimeout(300);await page.keyboard.up('m');
  if(process.env.SUTURE_SCREENSHOT)await page.screenshot({path:process.env.SUTURE_SCREENSHOT});
  await page.keyboard.down('x');
  await page.waitForFunction(()=>document.querySelector('#exercise-readout').textContent.includes('Forceps: free'),{},{timeout:15000});
  await page.keyboard.up('x');
  assert.doesNotMatch(await page.locator('#exercise-readout').innerText(),/NaN|Infinity/);
  for(const width of [390,760,1100,1440]) {
    await page.setViewportSize({width,height:1180});await page.waitForTimeout(400);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Free lab overflow');
    assert(await page.locator('.version').isVisible(),'Build number visible on mobile and desktop');
    assert.equal(await page.locator('.version').innerText(),build);
  }
  await evertSkin();
  assert.match(await page.locator('#exercise-readout').innerText(),/Forceps: holding skin edge/);
  if(process.env.SUTURE_SKIN_SCREENSHOT)await page.screenshot({path:process.env.SUTURE_SKIN_SCREENSHOT});
  await page.getByRole('button',{name:'Reset practice',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#begin-pass').disabled);
  assert.equal(await page.locator('#free-note').isVisible(),false);
  await page.getByRole('button',{name:'Start guided pass',exact:true}).click();
  await prepareEversion(page);
  await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('U advances'));
  assert.deepEqual(errors,[]);console.log('Free lab: movement inputs, release, finite readout, resize and guided reset passed.');
} finally {await browser.close();}
