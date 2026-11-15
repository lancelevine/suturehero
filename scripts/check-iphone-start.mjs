// iPhone start-up check (build 0.182): on an iPhone the page opens in Production mode with a
// "Start back camera" button; one tap starts camera 1 with the iPhone camera type (synthetic camera).
import assert from 'node:assert/strict';
import {chromium,devices} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--use-fake-ui-for-media-stream']});
try{
  const context=await browser.newContext({...devices['iPhone 15'],viewport:{width:852,height:393},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await installSyntheticCamera(page,{});
  await page.goto(process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.locator('#production-mode:not([hidden])').waitFor({timeout:20000});
  const start=page.getByRole('button',{name:'Start back camera'});
  await start.waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('suturehero.cameraMode.v1')),null,'iPhone mode comes from the device, not a saved choice');
  await start.click();
  await page.waitForFunction(()=>!document.querySelector('.iphone-start'),{},{timeout:20000});
  await page.waitForFunction(()=>document.querySelector('#stop-camera')&&!document.querySelector('#stop-camera').disabled,{},{timeout:20000});
  assert.equal(await page.locator('#tracker-type').inputValue(),'prism','synthetic scenes pin the prism (the app default is the 8-face ring)');
  assert.deepEqual(errors,[]);
  console.log('iPhone start: Production mode opens and one tap starts the back camera.');
}finally{await browser.close();}
