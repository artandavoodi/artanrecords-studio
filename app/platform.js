export function bindPlatform({client}){
  const layout=document.querySelector('[data-platform-layout]'),toggle=document.querySelector('[data-platform-rail-toggle]');
  toggle?.addEventListener('click',()=>{const collapsed=layout.toggleAttribute('data-rail-collapsed');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.querySelector('img').src='/app/icons/'+(collapsed?'panel-collapsed':'panel')+'.svg';});
  const panels=[...document.querySelectorAll('[data-settings-panel]')];
  const tabs=[...document.querySelectorAll('[data-settings-tab]')];
  const select=()=>{const selected=tabs.find(tab=>tab.dataset.settingsTab===location.hash.slice(1))||tabs[0];tabs.forEach(tab=>{const active=tab===selected;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});panels.forEach(panel=>{panel.hidden=panel.dataset.settingsPanel!==selected?.dataset.settingsTab;});};
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>{history.replaceState(null,'','#'+tab.dataset.settingsTab);select();});tab.addEventListener('keydown',event=>{const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];let target;if(direction)target=tabs[(index+direction+tabs.length)%tabs.length];else if(event.key==='Home')target=tabs[0];else if(event.key==='End')target=tabs.at(-1);if(target){event.preventDefault();target.click();target.focus();}});});
  addEventListener('hashchange',select);select();
  const themeButtons=[...document.querySelectorAll('[data-studio-theme]')];
  const update=()=>themeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.studioTheme===document.documentElement.dataset.themeEffective)));
  themeButtons.forEach(button=>button.addEventListener('click',()=>{const theme=button.dataset.studioTheme;document.documentElement.dataset.theme=theme;document.documentElement.dataset.themeEffective=theme;window.ArtanRecordsPreferences?.saveTheme(theme);update();}));document.addEventListener('studio-appearance-change',update);update();
  document.querySelector('[data-studio-preferences]')?.addEventListener('click',()=>document.querySelector('.privacy-preferences').showModal());
  const account=document.querySelector('[data-connection=account]');if(account)account.textContent=client?'Configured; sign in to verify access':'Not connected';
}
