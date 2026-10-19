export function openDialog(dialog){
  if(dialog.open)return;
  const opener=document.activeElement;
  const scrollY=window.scrollY;
  const previous=document.body.getAttribute('style');
  Object.assign(document.body.style,{position:'fixed',top:`-${scrollY}px`,width:'100%',overflow:'hidden'});
  dialog.addEventListener('close',()=>{
    if(previous===null)document.body.removeAttribute('style');
    else document.body.setAttribute('style',previous);
    window.scrollTo({top:scrollY,behavior:'instant'});
    opener?.focus({preventScroll:true});
  },{once:true});
  dialog.showModal();
}
