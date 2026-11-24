import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['app/shared/agreement-signature.js'],bundle:true,format:'esm',write:false});

test('signature editor reserves one stable layout across methods and successive drawing strokes',async({page})=>{
 await page.route('**/__signature-layout.js',route=>route.fulfill({contentType:'application/javascript',body:bundle.outputFiles[0].text}));await page.route('**/__signature-layout-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/css/core/00-orchestrator/style.css"><link rel="stylesheet" href="/app/dist/studio.css"><link rel="stylesheet" href="/app/dist/invitation.css">'}));await page.goto('/__signature-layout-fixture');
 await page.evaluate(async()=>{const {signatureInput}=await import('/__signature-layout.js');document.body.innerHTML='<main class="control-center-app control-center-operations"><form class="studio-account"><label>Signature<input type="file" name="signature"></label></form></main>';signatureInput(document.querySelector('form'));});
 await page.getByRole('button',{name:'Add signature',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Signature',exact:true});
 const geometry=()=>dialog.evaluate(el=>({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height,scroll:el.scrollTop,preview:el.querySelector('.agreement-signature-preview').getBoundingClientRect().height,footer:el.querySelector('footer').getBoundingClientRect().top}));
 const initial=await geometry();
 for(const mode of ['Type','Draw','Upload','Draw']){await page.getByRole('radio',{name:mode,exact:true}).check();const box=await geometry();expect(box.height).toBeCloseTo(initial.height,1);expect(box.top).toBeCloseTo(initial.top,1);expect(box.preview).toBeCloseTo(initial.preview,1);}
 const canvas=dialog.getByLabel('Draw your signature',{exact:true}),box=await canvas.boundingBox();
 for(let stroke=0;stroke<3;stroke++){
  await canvas.scrollIntoViewIfNeeded();const before=await geometry(),rect=await canvas.boundingBox();await page.mouse.move(rect.x+20,rect.y+20+stroke*8);await page.mouse.down();
  expect((await geometry()).height).toBeCloseTo(before.height,1);await page.mouse.move(rect.x+80,rect.y+40+stroke*8,{steps:4});await page.mouse.up();await expect(dialog.getByAltText('Signature preview')).toBeVisible();
  const after=await geometry();expect(after.height).toBeCloseTo(before.height,1);expect(after.scroll).toBeCloseTo(before.scroll,1);expect(after.footer).toBeCloseTo(before.footer,1);
 }
 await expect(dialog.locator('footer')).toHaveCSS('border-top-width','0px');expect(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(false);expect(box.width).toBeGreaterThan(0);
});

