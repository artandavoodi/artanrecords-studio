export function agreementSections(body,titles){
 if(typeof body!=='string'||!Array.isArray(titles)||titles.length<1||titles.length>30)throw Error('A fixed document with valid sections is required.');
 const text=String(body),starts=[];let offset=0;
 for(const title of titles){let index=text.indexOf(title,offset);while(index>=0&&index>0&&text[index-1]!=='\n')index=text.indexOf(title,index+1);if(index<0){if(titles.length===1)return {introduction:'',sections:[{title,text}]};throw Error('The document sections do not match the fixed version.');}starts.push(index);offset=index+title.length;}
 return {introduction:text.slice(0,starts[0]),sections:titles.map((title,index)=>({title,text:text.slice(starts[index]+title.length,starts[index+1]??text.length).trimStart()}))};
}

export function signingGuide({body,form,version,labels}){
 const document=body.ownerDocument,reader=body.querySelector('.agreement-rehearsal-document'),parsed=agreementSections(version.terms.body,version.terms.section_titles),inputs=parsed.sections.map((_,index)=>form.elements['initial-'+(index+1)]),panels=[];
 const controls=document.createElement('nav');controls.className='agreement-guide-controls';controls.setAttribute('aria-label',labels.navigation);
 const previous=document.createElement('button'),next=document.createElement('button'),full=document.createElement('button'),progress=document.createElement('progress'),message=document.createElement('p');
 for(const button of [previous,next,full]){button.type='button';button.className='ui-button';}previous.textContent=labels.previous;next.textContent=labels.next;full.textContent=labels.full;progress.max=parsed.sections.length+1;progress.setAttribute('aria-label',labels.progress);message.setAttribute('role','status');const header=document.createElement('div');header.className='agreement-guide-header';header.append(progress,message,full);controls.append(previous,next);
 const final=document.createElement('section');final.dataset.signatureStep='';
 for(const node of [...form.children])if(!inputs.some(input=>input.closest('label')===node))final.append(node);
 reader.replaceChildren();reader.classList.add('agreement-guided-document');
 if(parsed.introduction.trim()){const introduction=document.createElement('p');introduction.textContent=parsed.introduction;reader.append(introduction);}
 for(const [index,section] of parsed.sections.entries()){
  const panel=document.createElement('section'),heading=document.createElement('h4'),text=document.createElement('p');panel.dataset.guideSection=String(index+1);panel.tabIndex=-1;heading.textContent=section.title;text.textContent=section.text;panel.append(heading,text,inputs[index].closest('label'));reader.append(panel);panels.push(panel);
 }
 form.replaceChildren(header,reader,final,controls);let step=0;
 const valid=index=>inputs[index].checkValidity()&&inputs[index].value.trim().length>0;
 const firstMissing=()=>inputs.findIndex((_,index)=>!valid(index));
 function render(scroll=false){
  if(step===panels.length){const missing=firstMissing();if(missing>=0)step=missing;}
  panels.forEach((panel,index)=>{panel.hidden=false;panel.dataset.guideActive=String(step===index);});final.hidden=step!==panels.length;previous.disabled=step===0;next.hidden=step===panels.length;next.disabled=step<panels.length&&!valid(step);progress.value=step+1;
  message.textContent=step<panels.length?labels.section.replace('{current}',step+1).replace('{total}',panels.length):labels.final;
  if(scroll){const target=step<panels.length?panels[step]:final;target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});(step<panels.length?inputs[step]:form.elements.signer).focus({preventScroll:true});}
 }
 next.onclick=()=>{if(step<panels.length&&valid(step)){step++;render(true);}else inputs[step]?.reportValidity();};previous.onclick=()=>{if(step){step--;render(true);}};full.onclick=()=>reader.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 inputs.forEach(input=>{input.addEventListener('input',()=>render());input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();next.click();}});});
 body.querySelector('[data-document-read]').onclick=()=>{step=0;render(true);};body.querySelector('[data-document-initials]').onclick=()=>{step=Math.max(0,firstMissing());render(true);};body.querySelector('[data-document-sign]').onclick=()=>{const missing=firstMissing();step=missing<0?panels.length:missing;render(true);};render();
 return {complete:()=>step===panels.length&&firstMissing()<0};
}
