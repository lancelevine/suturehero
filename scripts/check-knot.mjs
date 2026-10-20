import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1180}}); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SUTURE_TEST_URL ?? 'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Start guided pass'}).click();
  await page.getByRole('button',{name:'Close-up view',exact:true}).click();
  await page.keyboard.down('u');
  await page.waitForFunction(()=>!document.querySelector('#position-forceps').disabled,{},{timeout:45000});
  await page.keyboard.up('u');
  await page.locator('#grip-point').fill('85'); await page.locator('#grip-point').dispatchEvent('input');
  await page.getByRole('button',{name:'Position forceps',exact:true}).click();
  await page.keyboard.down('z'); await page.waitForFunction(()=>document.querySelector('#grasp-status').textContent.includes('grip ready'),{},{timeout:10000}); await page.keyboard.up('z');
  await page.keyboard.down('.'); await page.waitForFunction(()=>document.querySelector('#grasp-status').textContent.includes('Needle held · left'),{},{timeout:10000}); await page.keyboard.up('.');
  await page.keyboard.down('r'); await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('fully through'),{},{timeout:45000}); await page.keyboard.up('r');
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
    await page.keyboard.up(first); await page.keyboard.up(second);
    if(wrap==='r')await page.getByRole('button',{name:'Next opposing throw',exact:true}).click();
  }
  assert.deepEqual(errors,[],'Browser runtime errors');
  assert.match(await page.locator('#exercise-title').innerText(),/square-knot sequence complete/);
  assert.match(await page.locator('#exercise-readout').innerText(),/2 \/ 2 opposing throws seated/);
  console.log(JSON.stringify({result:await page.locator('#exercise-title').innerText(),readout:await page.locator('#exercise-readout').innerText(),errors}));
} finally {await browser.close();}
