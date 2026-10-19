import config from '../content/account.json';
export function bindPlatform({client}){
  const layout=document.querySelector('[data-platform-layout]'),toggle=document.querySelector('[data-platform-rail-toggle]');
  const rail=collapsed=>{if(!layout||!toggle)return;document.documentElement.dataset.studioRail=collapsed?'closed':'open';toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.querySelector('img').src='/app/icons/'+(collapsed?'panel-collapsed':'panel')+'.svg';};
  const storage=window.__NEURO_MAIN_RUNTIME__?.preferenceStorage;
  rail(storage?.getItem(config.preferences.railKey)==='closed');
  toggle?.addEventListener('click',()=>{const collapsed=document.documentElement.dataset.studioRail!=='closed';rail(collapsed);storage?.setItem(config.preferences.railKey,collapsed?'closed':'open');});
  const panels=[...document.querySelectorAll('[data-settings-panel]')];
  const tabs=[...document.querySelectorAll('[data-settings-tab]')];
  const select=()=>{const selected=tabs.find(tab=>tab.dataset.settingsTab===location.hash.slice(1))||tabs[0];tabs.forEach(tab=>{const active=tab===selected;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});panels.forEach(panel=>{panel.hidden=panel.dataset.settingsPanel!==selected?.dataset.settingsTab;});};
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>{history.replaceState(null,'','#'+tab.dataset.settingsTab);select();});tab.addEventListener('keydown',event=>{const direction={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];let target;if(direction)target=tabs[(index+direction+tabs.length)%tabs.length];else if(event.key==='Home')target=tabs[0];else if(event.key==='End')target=tabs.at(-1);if(target){event.preventDefault();target.click();target.focus();}});});
  addEventListener('hashchange',select);select();
  document.querySelectorAll('[data-home-platform-theme-section-toggle]').forEach(button=>button.addEventListener('click',()=>{const expanded=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(expanded));const section=button.closest('[data-home-platform-theme-section]');if(expanded)section.removeAttribute('data-home-platform-theme-section-collapsed');else section.setAttribute('data-home-platform-theme-section-collapsed','true');}));
  document.querySelector('[data-home-platform-theme-palette-select]')?.addEventListener('change',event=>window.NeuroartanTheme.setThemePalette(event.target.value));
  const syncAppearance=()=>{const state=window.NeuroartanTheme?.getCurrentThemeState();const surface=document.querySelector('.home-platform-theme');if(!state||!surface)return;surface.dataset.activeTheme=state.theme;surface.querySelectorAll('[data-theme-token],[data-home-platform-theme-palette-select]').forEach(field=>field.disabled=state.theme!=='custom');surface.querySelectorAll('[data-toggle-scope=homepage-theme]').forEach(button=>{button.disabled=true;window.NeuroartanToggle.syncToggleState(button,false,{persist:false,emit:false});});};
  document.addEventListener('neuroartan:theme-changed',syncAppearance);syncAppearance();
  const account=document.querySelector('[data-connection=account]');if(account)account.textContent=client?'Configured; sign in to verify access':'Not connected';
}
