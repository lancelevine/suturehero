// Demo button check (2026-11-15): from the Sandbox, ▶ Demo reloads with the PS-2 and plays the
// whole simple interrupted suture by itself, ending with both tails trimmed. Takes about 3 minutes here.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.locator('#demo').click();
  await page.waitForURL(/needle=ps2/,{timeout:20000});
  await page.waitForFunction(()=>/Demo (complete|paused|stopped)/.test(document.querySelector('.demo-caption')?.textContent??''),{},{timeout:480000,polling:500});
  assert.match(await page.locator('.demo-caption').textContent(),/Demo complete/);
  assert.match(await page.locator('#exercise-title').textContent(),/Stitch exercise complete/);
  assert.equal(new URL(page.url()).searchParams.has('demo'),false,'demo parameter removed after the automatic start');
  assert.deepEqual(errors,[]);
  console.log('Demo: simple interrupted suture played by itself to trimmed tails.');
}finally{await browser.close();}
