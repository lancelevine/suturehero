// Locked running stitch (2026-11-28): two Sandbox passes on one thread with the needle passed
// down through the loop at the first exit between them; the instruction line reports the lock.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__sutureHeroSandbox,{},{timeout:20000});
  // Same wrist-turn drive as check-sandbox: one free pass at z.
  const drive=(z)=>page.evaluate(async(z)=>{
    const {session,needle,tools,grasp,heldDisplay}=window.__sutureHeroSandbox,right=tools[1],T=needle.root.position.constructor,Q=needle.root.quaternion.constructor;
    const centre=new T(0,.41+.2,z);
    heldDisplay.restore();grasp.release();
    needle.root.position.copy(centre);needle.root.quaternion.setFromAxisAngle(new T(1,0,0),-Math.PI/2);needle.root.updateWorldMatrix(true,false);
    right.root.position.set(.5,1,z);right.root.quaternion.identity();right.root.updateWorldMatrix(true,false);right.openness=.1;
    grasp.attach(right);
    const step=new Q().setFromAxisAngle(new T(0,0,1),.02);
    const before=session.freePass.passes.length;
    for(let i=0;i<400&&session.freePass.passes.length===before;i++){
      heldDisplay.restore();right.root.position.sub(centre).applyQuaternion(step).add(centre);right.root.quaternion.premultiply(step);right.root.updateWorldMatrix(true,false);
      await new Promise(r=>requestAnimationFrame(r));
    }
    return session.freePass.passes.length;
  },z);
  assert.equal(await drive(.25),1,'first pass completes');
  // Lock: bring the needle tip above the first exit, then down through the loop beside it.
  const locked=await page.evaluate(async()=>{
    const {session,needle,grasp,heldDisplay}=window.__sutureHeroSandbox;
    heldDisplay.restore();grasp.release();
    const exit=session.freePass.passes.at(-1).exit;
    const place=async(dy)=>{const tip=needle.getTipPose().position;needle.root.position.add(exit.clone().setY(exit.y+dy).sub(tip));needle.root.updateWorldMatrix(true,false);for(let i=0;i<4;i++)await new Promise(r=>requestAnimationFrame(r));};
    await place(.3);await place(.02);await place(.3);
    return true;
  });
  assert.ok(locked);
  assert.equal(await drive(-.25),2,'second pass completes');
  await page.waitForFunction(()=>/Locked running: 1\/1 stitches locked/.test(document.querySelector('#exercise-readout').textContent),{},{timeout:10000});
  assert.equal(await page.evaluate(()=>window.__sutureHeroSandbox.scene.getObjectByName('running-lock-marks').children.length),1,'the lock is drawn as a loop at the exit');
  // Without the lock gesture the next stitch is reported unlocked.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__sutureHeroSandbox,{},{timeout:20000});
  assert.equal(await drive(.25),1);
  assert.equal(await drive(-.25),2);
  await page.waitForFunction(()=>/Running stitch: 0\/1 stitches locked/.test(document.querySelector('#exercise-readout').textContent),{},{timeout:10000});
  // Tie off the running line: the tie-off is graded from the loop slack when the knot starts.
  assert.ok(await page.evaluate(()=>window.__sutureHeroSandbox.session.tieFreePass()));
  await page.waitForFunction(()=>/Running tie-off: last loop left [\d.]+ mm/.test(document.querySelector('#exercise-readout').textContent),{},{timeout:10000});
  assert.deepEqual(errors,[]);
  console.log('Running lock: needle through the loop between two passes is reported as a locked running stitch; without it, as unlocked; tying off grades the last loop.');
}finally{await browser.close();}
