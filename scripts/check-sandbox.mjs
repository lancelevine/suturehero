import {readFile} from 'node:fs/promises';
// Sandbox browser check (2026-11-15): a free pass through the skin with feedback and marks,
// a forced pass that tears the skin, no purchase in the tear, Undo pass, replay, and the session panel.
// Needs `npm run dev` (uses the development-only window.__sutureHeroSandbox hook).
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__sutureHeroSandbox,{},{timeout:20000});
  // Drive the needle driver (holding the needle) about the needle's curve centre, one step per frame, like a real wrist turn.
  const drive=(z,steps,shove)=>page.evaluate(async([z,steps,shove])=>{
    const {session,needle,tools,grasp,heldDisplay}=window.__sutureHeroSandbox,right=tools[1],T=needle.root.position.constructor,Q=needle.root.quaternion.constructor;
    const centre=new T(0,.41+.2,z);
    heldDisplay.restore();
    grasp.release();
    needle.root.position.copy(centre);needle.root.quaternion.setFromAxisAngle(new T(1,0,0),-Math.PI/2);needle.root.updateWorldMatrix(true,false);
    right.root.position.set(.5,1,z);right.root.quaternion.identity();right.root.updateWorldMatrix(true,false);right.openness=.1;
    grasp.attach(right);
    const step=new Q().setFromAxisAngle(new T(0,0,1),.02);
    const before=session.freePass.passes.length+session.freePass.torn.length;let entered=false,peak=0,i=0;
    for(i=0;i<steps&&session.freePass.passes.length+session.freePass.torn.length===before;i++){
      // The driver is drawn on the needle while in the skin (scene/heldInstrumentDisplay.ts): move the real hand pose.
      heldDisplay.restore();
      if(shove&&session.freePass.inTissue&&session.freePass.eyeAngle>-1.2)right.root.position.z+=.02;
      else{right.root.position.sub(centre).applyQuaternion(step).add(centre);right.root.quaternion.premultiply(step);}
      right.root.updateWorldMatrix(true,false);
      await new Promise(r=>requestAnimationFrame(r));entered||=session.freePass.inTissue;peak=Math.max(peak,session.freePass.forcing.units);
    }
    return {entered,peak,i,sandbox:session.sandbox,holder:grasp.holder?.id??null,inTissue:session.freePass.inTissue,tipY:needle.getTipPose().position.y,passes:session.freePass.passes.length,torn:session.freePass.torn.length,rents:session.freePass.rents.length};
  },[z,steps,shove]);
  const clean=await drive(.2,400,false);
  assert.equal(clean.passes,1,'a free pass completes');
  await page.waitForFunction(()=>/from the edge/.test(document.querySelector('#exercise-readout').textContent),{},{timeout:10000});
  assert.match(await page.locator('#exercise-readout').innerText(),/entered at \d+°/);
  const marks=await page.evaluate(()=>window.__sutureHeroSandbox.scene.getObjectByName('free-pass-marks').children.length);
  assert.ok(marks>=2,'entry and exit marks drawn');
  const forced=await drive(-.5,600,true);
  assert.equal(forced.torn,1,'shoving the needle sideways tears it out');
  assert.equal(forced.rents,1,'the tear splits the skin');
  assert.ok(await page.evaluate(()=>!!window.__sutureHeroSandbox.scene.getObjectByName('skin-rent')),'the split is drawn');
  await page.waitForFunction(()=>/Tissue torn/.test(document.querySelector('#exercise-title')?.textContent+document.body.innerText),{},{timeout:5000});
  await page.locator('#undo-pass').click();
  assert.equal(await page.evaluate(()=>window.__sutureHeroSandbox.session.freePass.rents.length),0,'Undo pass takes the tear back');
  assert.equal(await page.locator('#replay').isDisabled(),false,'replay available');
  await page.locator('#replay').click();
  await page.waitForFunction(()=>/Stop replay/.test(document.querySelector('#replay').textContent),{},{timeout:5000});
  await page.locator('#replay').click();
  await page.waitForFunction(()=>/Replay/.test(document.querySelector('#replay').textContent)&&!/Stop/.test(document.querySelector('#replay').textContent),{},{timeout:5000});
  assert.match(await page.locator('.sandbox-summary-line').textContent(),/1 pass · 0 torn/);
  // Results export (build 0.217): trainee name, saved progress and the CSV/JSON downloads.
  const panel=page.locator('.sandbox-summary');
  if(!await page.locator('#workspace-session-review').evaluate(e=>e.open))await page.locator('#workspace-session-review > summary').click();
  await panel.locator('input[name="trainee"]').fill('Resident, A');
  await panel.locator('input[name="trainee"]').dispatchEvent('change');
  await panel.getByRole('button',{name:'Save session to progress'}).click();
  const downloaded=async name=>{
   const [download]=await Promise.all([page.waitForEvent('download'),panel.getByRole('button',{name}).click()]);
   return {file:download.suggestedFilename(),text:await readFile(await download.path(),'utf8')};
  };
  const progress=await downloaded('Export progress CSV');
  assert.match(progress.file,/^suturehero-progress-Resident_A-.*\.csv$/);
  const progressRows=progress.text.trim().split('\r\n');
  assert.equal(progressRows[0].split(',')[1],'trainee');
  assert.match(progressRows.at(-1),/^[^,]+,"Resident, A",\d+,1,0,0,/);
  const stitches=await downloaded('Export stitches CSV');
  assert.match(stitches.text,/^trainee,build,stitch,completed_at/);
  const json=JSON.parse((await downloaded('Export session JSON')).text);
  assert.equal(json.trainee,'Resident, A');
  assert.ok(Number.isFinite(json.sessionSeconds));
  assert.ok(Array.isArray(json.stitchRecords));
  assert.equal(await page.evaluate(()=>localStorage.getItem('suturehero.trainee.v1')),'Resident, A');
  assert.deepEqual(errors,[]);
  console.log('Sandbox: free pass with feedback and marks, tear splits the skin, undo, replay and summary passed.');
}finally{await browser.close();}
