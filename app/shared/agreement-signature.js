export function signatureInput(form){
 const file=form.elements.signature,label=file.closest('label'),tools=document.createElement('fieldset');tools.className='agreement-signature-tools';
 tools.innerHTML='<legend>Your signature</legend><div class="agreement-signature-modes"><label><input type="radio" name="signature_method" value="upload" checked>Upload</label><label><input type="radio" name="signature_method" value="draw">Draw</label></div><canvas width="1200" height="360" aria-label="Draw your signature" tabindex="0" hidden></canvas><button type="button" data-signature-clear hidden>Clear drawing</button><label><input type="checkbox" name="signature_cleanup">Remove light background</label><p>PNG, JPEG or WebP, up to 10 MB. Review the cropped image before recording. Cleanup happens on this device.</p><img alt="Signature preview" hidden><p role="status" data-signature-message></p>';
 label.before(tools);tools.append(label);file.accept='image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
 const canvas=tools.querySelector('canvas'),context=canvas.getContext('2d'),preview=tools.querySelector('img'),message=tools.querySelector('[data-signature-message]'),clear=tools.querySelector('button');let drawing=false,hasInk=false,prepared=null,source=null,generation=0;
 context.lineWidth=4;context.lineCap='round';context.lineJoin='round';context.strokeStyle='#111';
 const mode=()=>form.elements.signature_method.value;
 const invalidate=()=>{prepared=null;preview.hidden=true;};
 function point(event){const box=canvas.getBoundingClientRect();return [(event.clientX-box.left)*canvas.width/box.width,(event.clientY-box.top)*canvas.height/box.height];}
 canvas.onpointerdown=event=>{event.preventDefault();drawing=true;hasInk=true;invalidate();canvas.setPointerCapture(event.pointerId);context.beginPath();context.moveTo(...point(event));context.lineTo(...point(event).map(value=>value+.1));context.stroke();};
 canvas.onpointermove=event=>{if(!drawing)return;context.lineTo(...point(event));context.stroke();};
 canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;update();};
 clear.onclick=()=>{context.clearRect(0,0,canvas.width,canvas.height);hasInk=false;invalidate();message.textContent='Drawing cleared.';};
 for(const radio of tools.querySelectorAll('[name=signature_method]'))radio.onchange=()=>{const draw=mode()==='draw';canvas.hidden=clear.hidden=!draw;label.hidden=draw;file.required=!draw;invalidate();update();};
 file.onchange=async()=>{const current=++generation;source?.close();source=null;invalidate();message.textContent='';const image=file.files?.[0];if(!image)return;try{if(image.size>10485760||!['image/png','image/jpeg','image/webp'].includes(image.type))throw Error('Choose a PNG, JPEG or WebP image up to 10 MB.');const bitmap=await createImageBitmap(image);if(current!==generation){bitmap.close();return;}if(bitmap.width*bitmap.height>20000000){bitmap.close();throw Error('Choose an image smaller than 20 megapixels.');}source=bitmap;await update();}catch(error){message.textContent=error.message;}};
 tools.querySelector('[name=signature_cleanup]').onchange=update;
 async function update(){
  prepared=null;const original=mode()==='draw'?hasInk&&canvas:source;if(!original)return;
  try{const output=document.createElement('canvas'),scale=Math.min(1,1600/original.width,800/original.height);output.width=Math.max(1,Math.round(original.width*scale));output.height=Math.max(1,Math.round(original.height*scale));const ctx=output.getContext('2d',{willReadFrequently:true});ctx.drawImage(original,0,0,output.width,output.height);const data=ctx.getImageData(0,0,output.width,output.height),pixels=data.data,cleanup=form.elements.signature_cleanup.checked;let left=output.width,top=output.height,right=-1,bottom=-1;
   for(let y=0;y<output.height;y++)for(let x=0;x<output.width;x++){const i=(y*output.width+x)*4,light=(pixels[i]+pixels[i+1]+pixels[i+2])/3;if(cleanup&&light>225)pixels[i+3]=0;if(pixels[i+3]>32&&light<240){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
   if(right<left)throw Error('No signature ink was found. Draw or upload a clear signature.');ctx.putImageData(data,0,0);const cropped=document.createElement('canvas');cropped.width=right-left+17;cropped.height=bottom-top+17;cropped.getContext('2d').drawImage(output,left,top,right-left+1,bottom-top+1,8,8,right-left+1,bottom-top+1);
   let encoded=cropped.toDataURL('image/png');if(encoded.length>349000)throw Error('The cropped image is too detailed. Upload a smaller, clearer signature.');prepared=encoded.split(',')[1];preview.src=encoded;preview.hidden=false;message.textContent='Review your signature preview before recording.';
  }catch(error){message.textContent=error.message;}
 }
 return async()=>{await update();if(!prepared)throw Error('Draw or upload your signature and review its preview.');return prepared;};
}
