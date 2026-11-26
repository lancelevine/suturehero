// Tracking Lab scrolling (2026-11-26): with camera setup open (the page is locked to the window
// height), a long recordings list can still be scrolled to its last entry, on desktop and phone.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 for(const viewport of [{width:1440,height:700},{width:390,height:844}]){
  const page=await browser.newPage({viewport}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
  await page.getByRole('tab',{name:'Tracking Lab',exact:true}).click();
  await page.locator('#tracking-lab:not([hidden])').waitFor();
  assert.ok(await page.evaluate(()=>document.body.classList.contains('camera-setup-active')),'camera setup is open, as by default');
  // Many saved recordings (rows as the library draws them).
  await page.evaluate(()=>{const list=document.querySelector('#lab-library-list');for(let i=0;i<25;i++){const row=document.createElement('div');row.className='lab-session';row.style.minHeight='60px';row.textContent='Recording '+i;list.append(row);}});
  const reach=await page.evaluate(()=>{const lab=document.querySelector('#tracking-lab');lab.scrollTop=1e6;const last=[...document.querySelectorAll('.lab-session')].at(-1).getBoundingClientRect();return {bottom:last.bottom,height:innerHeight,scrolls:lab.scrollHeight>lab.clientHeight};});
  assert.ok(reach.scrolls,`Lab scrolls at ${viewport.width}×${viewport.height}`);
  assert.ok(reach.bottom<=reach.height+1,`last recording reachable at ${viewport.width}×${viewport.height} (bottom ${reach.bottom} > ${reach.height})`);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Tracking Lab: a long recordings list scrolls to its last entry with camera setup open (desktop and phone).');
}finally{await browser.close();}
