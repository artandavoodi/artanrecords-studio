import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerSource from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

let workerUrl;
export async function renderAgreementPdf(container,url){
 if(!workerUrl){workerUrl=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));GlobalWorkerOptions.workerSrc=workerUrl;}
 const task=getDocument({url,isEvalSupported:false});let pdf;
 try{
  pdf=await task.promise;
  if(pdf.numPages>100)throw Error('This document is too long for the inline viewer. Download the PDF to read it.');
  const fragment=document.createDocumentFragment();
  for(let index=1;index<=pdf.numPages;index++){
   const page=await pdf.getPage(index),base=page.getViewport({scale:1}),scale=Math.min(2,Math.sqrt(2000000/(base.width*base.height))),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');
   canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.setAttribute('role','img');canvas.setAttribute('aria-label','PDF page '+index+' of '+pdf.numPages);
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const text=await page.getTextContent();canvas.textContent=text.items.map(item=>item.str||'').join(' ');fragment.append(canvas);page.cleanup();
  }
  if(!container.isConnected)return;container.replaceChildren(fragment);
 }finally{await task.destroy();}
}
