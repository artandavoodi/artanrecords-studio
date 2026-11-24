import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
test('compact signing saves privately, reuses account assets and keeps replacement available',async({page})=>{
 await page.route('**/__signature-layout.js',route=>route.fulfill({contentType:'application/javascript',body:bundle.outputFiles[0].text}));
 await page.goto('/');
 await page.evaluate(async()=>{
  const {signatureInput}=await import('/__signature-layout.js');
  const labels={title:'My signatures',notice:'Saved privately.',choose:'Saved signature',preview:'Saved signature image',name:'Signature name',save:'Save prepared signature',use:'Use selected signature',default:'Make default',archive:'Remove from library',defaultTag:'Default',unavailable:'Library unavailable.',failed:'Not saved.',saved:'Signature saved privately.',prepared:'Signature prepared.',defaultSaved:'Default saved.',archived:'Removed.'};
  window.assets=[];window.writes=[];window.failSave=false;
  const client={rpc:async(name,args)=>{
   if(name==='signature_library_list')return {data:window.assets.map(row=>({...row}))};
   window.writes.push(name);
   if(name==='signature_library_save'){if(window.failSave)return {error:{message:'Unavailable'}};const id='asset-'+(window.assets.length+1);window.assets.push({id,title:args.asset_title,image_base64:args.png_base64,is_default:!window.assets.length});return {data:id};}
   if(name==='signature_library_default'){window.assets.forEach(row=>row.is_default=row.id===args.asset);return {data:null};}
   if(name==='signature_library_archive'){window.assets=window.assets.filter(row=>row.id!==args.asset);return {data:null};}
   throw Error('Unexpected write: '+name);
  }};
  window.remountSignature=()=>{document.body.innerHTML='<main class="control-center-app control-center-operations"><form class="studio-account"><label>Signature<input name="signature" type="file"></label></form></main>';window.signature=signatureInput(document.querySelector('form'),{client,libraryLabels:labels,selectionOnly:true});};
  window.remountSignature();
 });
 await page.getByRole('button',{name:'Add signature',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Signature',exact:true}),use=dialog.getByRole('button',{name:'Use signature',exact:true});
 await expect(use).toHaveCSS('color','rgb(255, 255, 255)');
 await dialog.getByRole('radio',{name:'Type',exact:true}).check();await dialog.getByLabel('Type your signature',{exact:true}).fill('FIRST SAMPLE');
 await use.click();await expect(dialog).toBeHidden();await expect(page.getByRole('button',{name:'Edit signature',exact:true})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Saved signature',exact:true})).toHaveValue('asset-1');
 const first=await page.getByAltText('Prepared signature',{exact:true}).getAttribute('src');
 await page.getByRole('button',{name:'Edit signature',exact:true}).click();await dialog.getByLabel('Type your signature',{exact:true}).fill('SECOND SAMPLE');
 await page.evaluate(()=>{window.failSave=true;});await use.click();await expect(dialog).toBeVisible();await expect(dialog.getByRole('status')).toHaveText('Not saved.');
 expect(await page.evaluate(()=>window.signature.prepared())).toBe(first.split(',')[1]);
 await page.evaluate(()=>{window.failSave=false;});await use.click();await expect(dialog).toBeHidden();
 await expect(page.getByRole('combobox',{name:'Saved signature',exact:true})).toHaveValue('asset-2');
 await page.getByRole('button',{name:'Make default',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Default saved.');
 await page.evaluate(()=>window.remountSignature());await expect(page.getByRole('combobox',{name:'Saved signature',exact:true})).toHaveValue('asset-2');
 await page.getByRole('combobox',{name:'Saved signature',exact:true}).selectOption('asset-1');await expect(page.getByAltText('Prepared signature',{exact:true})).toHaveAttribute('src',first);
 await page.getByRole('button',{name:'Remove from library',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Removed.');
 expect(await page.evaluate(()=>window.writes.every(name=>name.startsWith('signature_library_')))).toBe(true);
 expect(await page.evaluate(()=>window.assets.length)).toBe(1);
});
const bundle=await build({entryPoints:['app/shared/agreement-signature.js'],bundle:true,format:'esm',write:false});

test('signature editor reserves one stable layout across methods and successive drawing strokes',async({page})=>{
 await page.route('**/__signature-layout.js',route=>route.fulfill({contentType:'application/javascript',body:bundle.outputFiles[0].text}));await page.route('**/__signature-layout-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/css/core/00-orchestrator/style.css"><link rel="stylesheet" href="/app/dist/studio.css"><link rel="stylesheet" href="/app/dist/invitation.css">'}));await page.goto('/__signature-layout-fixture');
 await page.evaluate(async()=>{const {signatureInput}=await import('/__signature-layout.js');document.body.innerHTML='<main class="control-center-app control-center-operations"><form class="studio-account"><label>Signature<input type="file" name="signature"></label></form></main>';signatureInput(document.querySelector('form'));});
 await page.getByRole('button',{name:'Add signature',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Signature',exact:true});
 const geometry=()=>dialog.evaluate(el=>({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height,scroll:el.scrollTop,preview:el.querySelector('.agreement-signature-preview').getBoundingClientRect().height,footer:el.querySelector('footer').getBoundingClientRect().top}));
 const initial=await geometry();
 for(const mode of ['Type','Draw','Upload','Draw']){await page.getByRole('radio',{name:mode,exact:true}).check();const box=await geometry();expect(box.height).toBeCloseTo(initial.height,1);expect(box.top).toBeCloseTo(initial.top,1);expect(box.preview).toBeCloseTo(initial.preview,1);}
 const canvas=dialog.getByLabel('Draw your signature',{exact:true}),box=await canvas.boundingBox(),clearBox=await dialog.getByRole('button',{name:'Clear drawing',exact:true}).boundingBox();
 expect(box.x).toBeCloseTo(clearBox.x,1);expect(box.width).toBeCloseTo(clearBox.width,1);
 for(let stroke=0;stroke<3;stroke++){
  await canvas.scrollIntoViewIfNeeded();const before=await geometry(),rect=await canvas.boundingBox();await page.mouse.move(rect.x+20,rect.y+20+stroke*8);await page.mouse.down();
  expect((await geometry()).height).toBeCloseTo(before.height,1);await page.mouse.move(rect.x+80,rect.y+40+stroke*8,{steps:4});await page.mouse.up();await expect(dialog.getByAltText('Signature preview')).toBeVisible();
  const after=await geometry();expect(after.height).toBeCloseTo(before.height,1);expect(after.scroll).toBeCloseTo(before.scroll,1);expect(after.footer).toBeCloseTo(before.footer,1);
 }
 await expect(dialog.locator('footer')).toHaveCSS('border-top-width','0px');expect(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(false);expect(box.width).toBeGreaterThan(0);
});

