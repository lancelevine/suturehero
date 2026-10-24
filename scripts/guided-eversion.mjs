/** The initial guided click now opens tissue handling rather than loading a needle. */
export async function prepareEversion(page){
  await page.locator('#position-forceps').click();
  await page.keyboard.down('z');
  await page.waitForFunction(()=>/(?:Skin|Vessel) edge held/.test(document.querySelector('#exercise-title').textContent),{},{timeout:15000});
  await page.keyboard.up('z');await page.keyboard.down('Shift');await page.keyboard.down('e');
  await page.waitForFunction(()=>/(?:Skin|Vessel) edge everted/.test(document.querySelector('#exercise-title').textContent),{},{timeout:15000});
  await page.keyboard.up('e');await page.keyboard.up('Shift');
  if(process.env.SUTURE_EVERSION_SCREENSHOT)await page.screenshot({path:process.env.SUTURE_EVERSION_SCREENSHOT});
  await page.getByRole('button',{name:'Begin needle pass',exact:true}).click();
}

/** Advance the first side, support the opposite edge, then finish the needle arc. */
export async function advanceGuidedPass(page){
 await page.keyboard.down('u');
 await page.waitForFunction(()=>document.querySelector('#exercise-title').dataset.passSupport==='opposite'||document.querySelector('#exercise-title').textContent.includes('Needle emerged'),{},{timeout:45000});
 await page.keyboard.up('u');
 if(await page.locator('#exercise-title').getAttribute('data-pass-support')==='opposite'){
  await page.keyboard.down('x');
  await page.waitForFunction(()=>!document.querySelector('#position-forceps').disabled,{},{timeout:15000});
  await page.keyboard.up('x');await page.locator('#position-forceps').click();
  await page.keyboard.down('z');
  await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Opposite edge held'),{},{timeout:15000});
  await page.keyboard.up('z');await page.keyboard.down('Shift');await page.keyboard.down('e');
  await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Pull inward'),{},{timeout:15000});
  await page.keyboard.up('e');await page.keyboard.down('d');
  await page.waitForFunction(()=>document.querySelector('#exercise-title').dataset.passSupport==='aligned',{},{timeout:15000});
  await page.keyboard.up('d');await page.keyboard.up('Shift');await page.keyboard.down('u');
  await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Needle emerged'),{},{timeout:45000});await page.keyboard.up('u');
 }
}
