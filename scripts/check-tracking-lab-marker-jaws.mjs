import assert from 'node:assert/strict';
/** Reuse the existing 3D ring/white-ball calibration fixture from check-marker-jaws. */
export async function verifyMarkerJawLab(context,installRingCamera,base){
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await installRingCamera(page);
 await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('suturehero.jawEngine.v1','marker');});
 await page.goto(new URL('./',base).href);
 await page.getByRole('tab',{name:'Tracking Lab',exact:true}).click();
 await page.evaluate(()=>Object.assign(window.__jawScene,{opening:.5,turning:false}));
 await page.locator('#lab-duration').selectOption('5000');await page.locator('#lab-record').click();
 await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent.startsWith('Recording')||document.querySelector('#lab-message').textContent);
 assert.equal(await page.locator('#lab-message').textContent(),'');
 await page.evaluate(()=>{setTimeout(()=>window.__jawScene.opening=1,1500);setTimeout(()=>Object.assign(window.__jawScene,{opening:.3,distractor:true}),3000);});
 await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent.startsWith('Saved')||document.querySelector('#lab-message').textContent);
 assert.equal(await page.locator('#lab-message').textContent(),'');
 await page.locator('#stop-camera').evaluate(e=>e.click());await page.waitForTimeout(800);
 // Erase recorded observations: replay must recover balls from pixels and the saved model.
 await page.evaluate(async()=>{const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const db=await request(indexedDB.open('suturehero-tracking-lab',1)),frames=await request(db.transaction('frames').objectStore('frames').getAll()),tx=db.transaction('frames','readwrite');for(const f of frames){delete f.diagnostics;tx.objectStore('frames').put(f);}await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();navigator.mediaDevices.getUserMedia=async()=>{throw new Error('Replay must not request hardware');};window.__labPoseCount=0;window.addEventListener('suturehero:tracking-pose',()=>window.__labPoseCount++);window.__labSettings=JSON.stringify({...localStorage});});
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new Error('Replay must not request hardware');};});
 await page.locator('#lab-replay').click();
 await page.waitForFunction(()=>document.querySelector('#lab-mode').textContent==='Replay complete'||document.querySelector('#lab-message').textContent,null,{timeout:90000});
 assert.equal(await page.locator('#lab-message').textContent(),'');const diagnostics=await page.locator('#lab-diagnostics').textContent();console.log(diagnostics);
 assert.match(diagnostics,/Balls [1-9]/);assert.match(diagnostics,/Jaw visibility confidence:/);assert.match(diagnostics,/Unavailable \(marker-relative engine\)/);
 assert.equal(await page.evaluate(()=>window.__labPoseCount),0);assert(await page.evaluate(()=>JSON.stringify({...localStorage})===window.__labSettings));
 assert.equal(await page.evaluate(()=>document.querySelector('iframe.tracking-lab-engine').contentDocument.querySelector('[data-jaw-engine]').value),'marker');
 await page.screenshot({path:'/tmp/suturehero-tracking-lab-marker-jaws.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('Passed: calibrated new marker-relative white-ball jaw tracker reprocessed recorded images through the real controller, with saved observations removed and hardware/live-scene output blocked.');
 await page.close();
}
