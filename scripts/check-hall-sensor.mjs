// Bluetooth jaw sensor check (build 0.204): a fake Web Bluetooth device streams
// firmware packets; connecting, calibrating closed/open and the jaw-opening message
// sent to the practice scene are verified. No real hardware.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const characteristic=new EventTarget();
  characteristic.startNotifications=async()=>characteristic;characteristic.stopNotifications=async()=>characteristic;
  let boardMs=0;
  window.__hallEmit=raw=>{const view=new DataView(new ArrayBuffer(6));view.setUint16(0,raw,true);view.setUint32(2,boardMs+=10,true);characteristic.value=view;characteristic.dispatchEvent(new Event('characteristicvaluechanged'));};
  const server={connected:true,disconnect(){server.connected=false;},getPrimaryService:async()=>({getCharacteristic:async()=>characteristic})};
  const device=new EventTarget();device.name='SutureHero Jaw';device.gatt={connect:async()=>server};
  Object.defineProperty(navigator,'bluetooth',{value:{requestDevice:async options=>{window.__hallFilters=options.filters;return device;}}});
  window.__jawMessages=[];
  window.addEventListener('suturehero:jaw-opening',e=>window.__jawMessages.push(e.detail));
 });
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 await page.locator('[data-calibration-pane=jaws]').click();
 const panel=page.locator('.hall-sensor-panel');
 await panel.locator('summary').click();
 await panel.getByLabel('Sensor is on').selectOption('forceps');
 await panel.getByRole('button',{name:'Connect sensor'}).click();
 await panel.getByRole('button',{name:'Disconnect'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__hallFilters),[{services:['5a1e0001-8f6c-4b8e-9d2a-3c4b5e6f7a80']}]);
 const emit=async(raw,count=20)=>{for(let i=0;i<count;i++)await page.evaluate(r=>window.__hallEmit(r),raw);await page.waitForTimeout(200);await page.evaluate(r=>window.__hallEmit(r),raw);};
 await emit(1900);
 await panel.getByRole('button',{name:/Set closed/}).click();
 await emit(2700);
 await panel.getByRole('button',{name:/Set open/}).click();
 assert.match(await panel.locator('[data-hall-calibration]').textContent(),/Calibrated · closed 1900 · open 2700/);
 await emit(2300,40);
 const last=await page.evaluate(()=>window.__jawMessages.at(-1));
 assert.equal(last.instrument,'forceps');
 assert.ok(Math.abs(last.opening-.5)<.05,`half-way reading gives about 50% opening (got ${last.opening})`);
 assert.match(await panel.locator('[data-hall-reading]').textContent(),/raw 2300 · opening 5\d%|raw 2300 · opening 4\d%/);
 await panel.getByRole('button',{name:'Disconnect'}).click();
 await panel.getByRole('button',{name:'Connect sensor'}).waitFor();
 // The calibration is remembered.
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('suturehero.hallJaw.v1'))),{instrument:'forceps',closed:1900,open:2700});
 assert.deepEqual(errors,[]);
 console.log('Hall sensor: connect, calibrate and jaw opening messages work (fake Bluetooth device).');
}finally{await browser.close();}
