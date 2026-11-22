export function agreementSections(body,titles){
 if(typeof body!=='string'||!Array.isArray(titles)||titles.length<1||titles.length>30)throw Error('A fixed document with valid sections is required.');
 const text=String(body),starts=[];let offset=0;
 for(const title of titles){let index=text.indexOf(title,offset);while(index>=0&&index>0&&text[index-1]!=='\n')index=text.indexOf(title,index+1);if(index<0){if(titles.length===1)return {introduction:'',sections:[{title,text}]};throw Error('The document sections do not match the fixed version.');}starts.push(index);offset=index+title.length;}
 return {introduction:text.slice(0,starts[0]),sections:titles.map((title,index)=>({title,text:text.slice(starts[index]+title.length,starts[index+1]??text.length).trimStart()}))};
}

export function signingGuide({body,form,version,labels,arrow=''}){
 const document=body.ownerDocument,reader=body.querySelector('.agreement-rehearsal-document'),parsed=agreementSections(version.terms.body,version.terms.section_titles),inputs=parsed.sections.map((_,index)=>form.elements['initial-'+(index+1)]),panels=[];
 const controls=document.createElement('nav');controls.className='agreement-guide-controls';controls.setAttribute('aria-label',labels.navigation);
 const previous=document.createElement('button'),next=document.createElement('button'),full=document.createElement('button'),message=document.createElement('p'),initialsLabel=document.createElement('label'),initials=document.createElement('input');
 next.dataset.guideNext='';
 for(const button of [previous,next,full]){button.type='button';button.className='ui-button';}previous.textContent=labels.previous;next.textContent=labels.next;message.setAttribute('role','status');initialsLabel.className='agreement-initials-entry';initialsLabel.textContent=labels.initials;initials.name='review_initials';initials.className='ui-field';initials.maxLength=8;initials.pattern='[A-Za-z]{1,8}';initials.autocomplete='off';initialsLabel.append(initials);
 full.className='agreement-guide-follow ui-icon-button ui-hover-tooltip';full.dataset.tooltipPosition='top';full.style.setProperty('--hover-tooltip-left','100%');full.style.setProperty('--hover-tooltip-hidden-transform','translate(-100%,var(--spacing-xs))');full.style.setProperty('--hover-tooltip-visible-transform','translate(-100%,0)');const graphic=document.createElement('span');graphic.className='agreement-guide-arrow';graphic.setAttribute('aria-hidden','true');graphic.innerHTML=arrow;const image=graphic.querySelector('img');graphic.hidden=!image;if(image){graphic.style.maskImage='url("'+image.src+'")';graphic.style.webkitMaskImage=graphic.style.maskImage;graphic.replaceChildren();}full.append(graphic);
 const header=document.createElement('div');header.className='agreement-guide-header';header.append(message,full);controls.append(initialsLabel,previous,next);
 const final=document.createElement('section');final.dataset.signatureStep='';
 for(const node of [...form.children])if(!inputs.some(input=>input.closest('label')===node))final.append(node);
 reader.replaceChildren();reader.classList.add('agreement-guided-document');
 if(parsed.introduction.trim()){const introduction=document.createElement('p');introduction.textContent=parsed.introduction;reader.append(introduction);}
 for(const [index,section] of parsed.sections.entries()){
  const panel=document.createElement('section'),heading=document.createElement('h4'),text=document.createElement('p'),stamp=document.createElement('p');panel.dataset.guideSection=String(index+1);panel.tabIndex=-1;heading.textContent=section.title;text.textContent=section.text;stamp.className='agreement-section-initials';const originalLabel=inputs[index].closest('label');originalLabel.remove();inputs[index].type='hidden';inputs[index].required=false;panel.append(heading,text,stamp,inputs[index]);reader.append(panel);panels.push(panel);
 }
 form.replaceChildren(header,reader,final,controls);let step=0,alignedStep=-1;
 const scrollRoot=body.closest('dialog')||document.scrollingElement;
 const valid=index=>/^[A-Za-z]{1,8}$/.test(inputs[index].value.trim());
 const firstMissing=()=>inputs.findIndex((_,index)=>!valid(index));
 const viewLine=()=>header.getBoundingClientRect().bottom+2*parseFloat(getComputedStyle(header).paddingBlockEnd||0);
 const arrowTarget=()=>step===panels.length?panels.length-1:alignedStep===step?Math.min(step+1,panels.length):step;
 function render(scroll=false){
  if(scroll)alignedStep=step;
  panels.forEach((panel,index)=>{panel.hidden=false;panel.dataset.guideActive=String(step===index);const stamp=panel.querySelector('.agreement-section-initials');stamp.hidden=!valid(index);stamp.textContent=valid(index)?labels.initialed.replace('{initials}',inputs[index].value):'';});final.hidden=false;previous.disabled=step===0;next.hidden=step===panels.length;next.disabled=step<panels.length&&!/^[A-Za-z]{1,8}$/.test(initials.value.trim());
  message.textContent=step<panels.length?labels.section.replace('{current}',step+1).replace('{total}',panels.length):firstMissing()<0?labels.final:labels.signature||labels.navigation;
  const target=arrowTarget(),destination=target===panels.length?final:panels[target],targetLabel=target===panels.length?labels.signature||labels.navigation:labels.section.replace('{current}',target+1).replace('{total}',panels.length);
  full.dataset.direction=destination.getBoundingClientRect().top<header.getBoundingClientRect().bottom?'up':'down';full.dataset.label=(target>step?labels.nextMove:target<step?labels.previousMove:labels.currentMove)?.replace('{step}',targetLabel)||targetLabel;full.setAttribute('aria-label',full.dataset.label);
  if(scroll){const target=step<panels.length?panels[step]:final;target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});(step<panels.length?target:form.elements.signer).focus({preventScroll:true});}
 }
 next.onclick=()=>{if(step<panels.length&&/^[A-Za-z]{1,8}$/.test(initials.value.trim())){inputs[step].value=initials.value.trim();step++;if(step===panels.length&&firstMissing()>=0)step=firstMissing();render(true);}else initials.reportValidity();};previous.onclick=()=>{if(step){step--;render(true);}};
 const focusPending=()=>{step=firstMissing()<0?panels.length:firstMissing();render(true);};full.onclick=()=>{step=arrowTarget();render(true);};
 full.addEventListener('pointerenter',()=>render());full.addEventListener('focus',()=>render());
 initials.addEventListener('input',()=>render());initials.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();next.click();}});
 let frame=0;const syncScroll=()=>{if(!form.isConnected){scrollRoot?.removeEventListener('scroll',syncScroll);return;}if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const line=viewLine();let visible=0;for(const [index,panel]of panels.entries())if(Math.round(panel.getBoundingClientRect().top)<=Math.round(line))visible=index;const atEnd=Math.ceil(scrollRoot.scrollTop+scrollRoot.clientHeight)>=scrollRoot.scrollHeight;step=final.getBoundingClientRect().top<=line||atEnd?panels.length:visible;alignedStep=step===panels.length||Math.round(panels[step].getBoundingClientRect().top)<=Math.round(line)?step:-1;render();});};
 scrollRoot?.addEventListener('scroll',syncScroll,{passive:true});
 const size=()=>{const viewerHeader=body.closest('dialog')?.querySelector(':scope > header');form.style.setProperty('--agreement-viewer-header-height',(viewerHeader?.getBoundingClientRect().height||0)+'px');form.style.setProperty('--agreement-guide-header-height',header.getBoundingClientRect().height+'px');};
 const observer=new ResizeObserver(()=>{if(!form.isConnected){observer.disconnect();scrollRoot?.removeEventListener('scroll',syncScroll);return;}size();});observer.observe(header);const viewerHeader=body.closest('dialog')?.querySelector(':scope > header');if(viewerHeader)observer.observe(viewerHeader);size();render();
 return {complete:()=>firstMissing()<0,focusPending};
}
