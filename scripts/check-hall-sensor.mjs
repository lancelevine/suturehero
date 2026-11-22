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
  const boards=['SutureHero Jaw','SutureHero Jaw 2'].map((name,index)=>{
   const characteristic=new EventTarget();
   characteristic.startNotifications=async()=>characteristic;characteristic.stopNotifications=async()=>characteristic;
   const battery=new EventTarget();battery.startNotifications=async()=>battery;battery.readValue=async()=>new DataView(new Uint8Array([index?12:83]).buffer);
   const server={connected:true,disconnect(){server.connected=false;},getPrimaryService:async uuid=>({getCharacteristic:async()=>uuid==='battery_service'?battery:characteristic})};
   const device=new EventTarget();device.name=name;device.id='board-'+index;device.gatt={connect:async()=>{if(window.__hallOff?.[index])throw new Error('out of range');server.connected=true;return server;}};
   device.drop=()=>{server.connected=false;device.dispatchEvent(new Event('gattserverdisconnected'));};
   let boardMs=0;
   const emit=raw=>{const view=new DataView(new ArrayBuffer(6));view.setUint16(0,raw,true);view.setUint32(2,boardMs+=10,true);characteristic.value=view;characteristic.dispatchEvent(new Event('characteristicvaluechanged'));};
   return {device,emit};
  });
  let requests=0;
  window.__hallEmit=(board,raw)=>boards[board].emit(raw);
  window.__hallBoards=boards;
  // getDevices: boards this site was already allowed to use (both, after the first visit).
  Object.defineProperty(navigator,'bluetooth',{value:{requestDevice:async options=>{window.__hallFilters=options.filters;return boards[requests++%2].device;},getDevices:async()=>sessionStorage.getItem('hallSeeded')==='2'?boards.map(b=>b.device):[]}});
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
 // The hand-set buttons sit in a collapsed section since build 0.218.
 await slot(2).locator('details > summary').click();
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
 assert.match(await slot(1).locator('[data-hall-reading]').textContent(),/SutureHero Jaw · raw 2100 · opening 25% · battery 83%$/);
 assert.match(await slot(2).locator('[data-hall-reading]').textContent(),/battery 12% \(low · charge soon\)/);
 assert.match(await slot(2).locator('[data-hall-reading]').textContent(),/SutureHero Jaw 2 · raw 2250/);
 // With camera tracking off (Sandbox only), the sensors still drive the instruments (build 0.212).
 await page.locator('#disable-camera-tracking').evaluate(e=>e.click());
 for(const raw of [1900,2700]){
  for(let i=0;i<30;i++)await page.evaluate(r=>window.__hallEmit(0,r),raw);
  await page.waitForTimeout(300);
  const meter=await page.evaluate(()=>document.querySelector('#right-jaw').value);
  assert.ok(raw===1900?meter<.1:meter>.9,`needle driver jaw follows the sensor with camera tracking off (raw ${raw}, meter ${meter})`);
 }
 await page.locator('#camera-tracking-toggle').click();
 await page.locator('[data-calibration-pane=jaws]').click();
 // Same instrument on both sensors is flagged.
 await slot(2).getByLabel('Sensor is on').selectOption('needleDriver');
 assert.match(await panel.locator('[data-hall-warning]').textContent(),/Two sensors are set to Needle driver/);
 await slot(2).getByLabel('Sensor is on').selectOption('forceps');
 assert.equal(await panel.locator('[data-hall-warning]').isHidden(),true);
 await slot(1).getByRole('button',{name:'Disconnect sensor 1'}).click();
 await slot(1).getByRole('button',{name:'Connect sensor 1'}).waitFor();
 assert.match(await slot(2).locator('[data-hall-reading]').textContent(),/Connected/,'sensor 2 stays connected');
 // Saved, and kept after a reload.
 const savedSettings={sensors:[{instrument:'needleDriver',closed:1900,open:2700,deviceId:'board-0'},{instrument:'forceps',closed:3000,open:2000,deviceId:'board-1'}]};
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('suturehero.hallJaw.v2'))),savedSettings);
 // A board that drops out is reconnected by itself once it is back in range (build 0.212).
 await slot(1).getByRole('button',{name:'Connect sensor 1'}).click();
 await slot(1).getByRole('button',{name:'Disconnect sensor 1'}).waitFor();
 // From here the browser lists both boards as already allowed (as Chrome does after the first visit).
 await page.evaluate(()=>sessionStorage.setItem('hallSeeded','2'));
 await page.evaluate(()=>{window.__hallOff=[false,true];window.__hallBoards[1].device.drop();});
 await slot(2).getByRole('button',{name:'Stop reconnecting sensor 2'}).waitFor();
 await page.waitForTimeout(5000);
 assert.match(await slot(2).locator('[data-hall-reading]').textContent(),/Waiting for SutureHero Jaw 2/);
 await page.evaluate(()=>{window.__hallOff=[false,false];});
 await slot(2).getByRole('button',{name:'Disconnect sensor 2'}).waitFor({timeout:10000});
 // After a reload, remembered boards reconnect without the device chooser.
 await page.reload();
 await page.locator('[data-calibration-pane=jaws]').click();
 assert.match(await slot(2).locator('[data-hall-calibration]').textContent(),/Calibrated · closed 3000 · open 2000/);
 await slot(1).getByRole('button',{name:'Disconnect sensor 1'}).waitFor({timeout:10000});
 await slot(2).getByRole('button',{name:'Disconnect sensor 2'}).waitFor({timeout:10000});
 // Guided calibration (build 0.218): hold closed, then open and close fully a few times.
 await slot(1).getByRole('button',{name:'Calibrate (guided)'}).click();
 const sweepStarted=Date.now();
 while(Date.now()-sweepStarted<5600){
  const t=(Date.now()-sweepStarted)/5000;
  const opening=t<.2?0:.5-.5*Math.cos((t-.2)/.8*3*2*Math.PI);
  await page.evaluate(r=>{for(let i=0;i<5;i++)window.__hallEmit(0,r);},Math.round(2000+800*opening));
  await page.waitForTimeout(40);
 }
 await page.waitForFunction(()=>/Calibrated · closed/.test(document.querySelector('[data-hall-slot="1"] [data-hall-calibration]').textContent),null,{timeout:5000});
 const swept=(await slot(1).locator('[data-hall-calibration]').textContent()).match(/closed (\d+) · open (\d+)/).slice(1).map(Number);
 assert.ok(Math.abs(swept[0]-2000)<=20&&Math.abs(swept[1]-2800)<=40,`guided calibration found closed/open (got ${swept})`);
 // The graph shows the recent readings.
 assert.ok(await slot(1).locator('[data-hall-graph]').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)),'graph drawn');
 // A third sensor slot can be added (scissors by default) and is remembered.
 await panel.getByRole('button',{name:'Add a third sensor'}).click();
 assert.equal(await slot(3).getByLabel('Sensor is on').inputValue(),'scissors');
 assert.equal(await panel.getByRole('button',{name:'Add a third sensor'}).isHidden(),true);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('suturehero.hallJaw.v2')).sensors.length),3);
 assert.deepEqual(errors,[]);
 console.log('Hall sensors: two boards connect, calibrate and drive their own instruments; settings migrate and persist (fake Bluetooth devices).');
}finally{await browser.close();}
