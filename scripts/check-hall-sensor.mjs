// Bluetooth jaw sensor check (builds 0.204/0.206): two fake Web Bluetooth boards stream
// firmware packets. Connecting each slot, calibrating closed/open, the jaw-opening
// messages per instrument, the duplicate-instrument warning and migration of the
// single-sensor settings are verified. No real hardware.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  // Build 0.204 single-sensor settings: must become sensor 1.
  if(!sessionStorage.getItem('hallSeeded')){localStorage.setItem('suturehero.hallJaw.v1',JSON.stringify({instrument:'needleDriver',closed:1900,open:2700}));sessionStorage.setItem('hallSeeded','1');}
  const boards=['SutureHero Jaw','SutureHero Jaw 2'].map(name=>{
   const characteristic=new EventTarget();
   characteristic.startNotifications=async()=>characteristic;characteristic.stopNotifications=async()=>characteristic;
   const server={connected:true,disconnect(){server.connected=false;},getPrimaryService:async()=>({getCharacteristic:async()=>characteristic})};
   const device=new EventTarget();device.name=name;device.gatt={connect:async()=>{server.connected=true;return server;}};
   let boardMs=0;
   const emit=raw=>{const view=new DataView(new ArrayBuffer(6));view.setUint16(0,raw,true);view.setUint32(2,boardMs+=10,true);characteristic.value=view;characteristic.dispatchEvent(new Event('characteristicvaluechanged'));};
   return {device,emit};
  });
  let requests=0;
  window.__hallEmit=(board,raw)=>boards[board].emit(raw);
  Object.defineProperty(navigator,'bluetooth',{value:{requestDevice:async options=>{window.__hallFilters=options.filters;return boards[requests++%2].device;}}});
  window.__jawMessages=[];
  window.addEventListener('suturehero:jaw-opening',e=>window.__jawMessages.push(e.detail));
 });
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 await page.locator('[data-calibration-pane=jaws]').click();
 const panel=page.locator('.hall-sensor-panel');
 await panel.waitFor();
 const slot=n=>panel.locator(`[data-hall-slot="${n}"]`);
 // Migrated sensor 1, default forceps for sensor 2.
 assert.equal(await slot(1).getByLabel('Sensor is on').inputValue(),'needleDriver');
 assert.match(await slot(1).locator('[data-hall-calibration]').textContent(),/Calibrated · closed 1900 · open 2700/);
 assert.equal(await slot(2).getByLabel('Sensor is on').inputValue(),'forceps');
 assert.match(await slot(2).locator('[data-hall-calibration]').textContent(),/Not calibrated/);
 const emit=async(board,raw,count=20)=>{for(let i=0;i<count;i++)await page.evaluate(([b,r])=>window.__hallEmit(b,r),[board,raw]);await page.waitForTimeout(200);await page.evaluate(([b,r])=>window.__hallEmit(b,r),[board,raw]);};
 await slot(1).getByRole('button',{name:'Connect sensor 1'}).click();
 await slot(1).getByRole('button',{name:'Disconnect sensor 1'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__hallFilters),[{services:['5a1e0001-8f6c-4b8e-9d2a-3c4b5e6f7a80']}]);
 await slot(2).getByRole('button',{name:'Connect sensor 2'}).click();
 await slot(2).getByRole('button',{name:'Disconnect sensor 2'}).waitFor();
 // Calibrate sensor 2 (forceps), inverted direction.
 await emit(1,3000);
 await slot(2).getByRole('button',{name:/Set closed/}).click();
 await emit(1,2000);
 await slot(2).getByRole('button',{name:/Set open/}).click();
 assert.match(await slot(2).locator('[data-hall-calibration]').textContent(),/Calibrated · closed 3000 · open 2000/);
 // Both boards at once: needle driver at 25 %, forceps at 75 %.
 await page.evaluate(()=>{window.__jawMessages.length=0;});
 for(let i=0;i<40;i++){await page.evaluate(()=>{window.__hallEmit(0,2100);window.__hallEmit(1,2250);});}
 await page.waitForTimeout(200);
 const last=await page.evaluate(()=>{const latest={};for(const m of window.__jawMessages)latest[m.instrument]=m.opening;return latest;});
 assert.ok(Math.abs(last.needleDriver-.25)<.05,`needle driver about 25 % (got ${last.needleDriver})`);
 assert.ok(Math.abs(last.forceps-.75)<.05,`forceps about 75 % (got ${last.forceps})`);
 assert.match(await slot(1).locator('[data-hall-reading]').textContent(),/SutureHero Jaw · raw 2100/);
 assert.match(await slot(2).locator('[data-hall-reading]').textContent(),/SutureHero Jaw 2 · raw 2250/);
 // Same instrument on both sensors is flagged.
 await slot(2).getByLabel('Sensor is on').selectOption('needleDriver');
 assert.match(await panel.locator('[data-hall-warning]').textContent(),/Both sensors are set to Needle driver/);
 await slot(2).getByLabel('Sensor is on').selectOption('forceps');
 assert.equal(await panel.locator('[data-hall-warning]').isHidden(),true);
 await slot(1).getByRole('button',{name:'Disconnect sensor 1'}).click();
 await slot(1).getByRole('button',{name:'Connect sensor 1'}).waitFor();
 assert.match(await slot(2).locator('[data-hall-reading]').textContent(),/Connected/,'sensor 2 stays connected');
 // Saved, and kept after a reload.
 const savedSettings={sensors:[{instrument:'needleDriver',closed:1900,open:2700},{instrument:'forceps',closed:3000,open:2000}]};
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('suturehero.hallJaw.v2'))),savedSettings);
 await page.reload();
 await page.locator('[data-calibration-pane=jaws]').click();
 assert.match(await slot(2).locator('[data-hall-calibration]').textContent(),/Calibrated · closed 3000 · open 2000/);
 assert.deepEqual(errors,[]);
 console.log('Hall sensors: two boards connect, calibrate and drive their own instruments; settings migrate and persist (fake Bluetooth devices).');
}finally{await browser.close();}
