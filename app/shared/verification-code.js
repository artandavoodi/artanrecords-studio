export function bindVerificationCode(input,{length,label,digitLabel,onChange=()=>{}}){
 const document=input.ownerDocument,group=document.createElement('fieldset'),legend=document.createElement('legend'),row=document.createElement('div');
 group.className='ui-verification-code';legend.textContent=label;row.className='ui-verification-code__digits';row.style.setProperty('--verification-code-length',length);
 input.closest('label').replaceWith(group);input.type='hidden';input.removeAttribute('pattern');input.removeAttribute('required');input.removeAttribute('class');
 const digits=Array.from({length},(_,index)=>{const digit=document.createElement('input');digit.type='text';digit.inputMode='numeric';digit.autocomplete=index===0?'one-time-code':'off';digit.maxLength=index===0?length*2:1;digit.className='ui-field';digit.setAttribute('aria-label',digitLabel.replace('{digit}',index+1).replace('{length}',length));row.append(digit);return digit;});
 const sync=()=>{input.value=digits.map(digit=>digit.value).join('');onChange(input.value);};
 const distribute=(value,start)=>{const clean=value.replace(/[^0-9]/g,'').slice(0,length-start);for(let i=0;i<clean.length;i++)digits[start+i].value=clean[i];sync();digits[Math.min(start+clean.length,length-1)].focus();};
 digits.forEach((digit,index)=>{
  digit.addEventListener('input',()=>{const value=digit.value.replace(/[^0-9]/g,'');digit.value='';if(value)distribute(value,index);else sync();});
  digit.addEventListener('paste',event=>{event.preventDefault();distribute(event.clipboardData?.getData('text')||'',index);});
  digit.addEventListener('focus',()=>digit.select());
  digit.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!digit.value&&index>0){event.preventDefault();digits[index-1].value='';sync();digits[index-1].focus();}else if(event.key==='ArrowLeft'&&index>0){event.preventDefault();digits[index-1].focus();}else if(event.key==='ArrowRight'&&index<length-1){event.preventDefault();digits[index+1].focus();}});
 });
 group.append(legend,row,input);
 return {focus(){digits.find(digit=>!digit.value)?.focus();},clear(){digits.forEach(digit=>digit.value='');sync();},disable(){digits.forEach(digit=>digit.disabled=true);},complete:()=>digits.every(digit=>/^[0-9]$/.test(digit.value))};
}
