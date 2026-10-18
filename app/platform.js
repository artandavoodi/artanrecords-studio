export function bindPlatform({client}){
  const layout=document.querySelector('[data-platform-layout]'),toggle=document.querySelector('[data-platform-rail-toggle]');
  toggle?.addEventListener('click',()=>{const collapsed=layout.toggleAttribute('data-rail-collapsed');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.querySelector('img').src='/app/icons/'+(collapsed?'panel-collapsed':'panel')+'.svg';});
  const tabs=[...document.querySelectorAll('[data-settings-tab]')],panels=[...document.querySelectorAll('[data-settings-panel]')];
  const select=()=>{const target=tabs.find(tab=>tab.hash===location.hash)||tabs[0];if(!target)return;for(const tab of tabs){if(tab===target)tab.setAttribute('aria-current','true');else tab.removeAttribute('aria-current');}for(const panel of panels)panel.hidden=panel.id!==target.hash.slice(1);};
  tabs.forEach(tab=>tab.addEventListener('click',()=>requestAnimationFrame(select)));addEventListener('hashchange',select);select();
  const themeButtons=[...document.querySelectorAll('[data-studio-theme]')];
  const update=()=>themeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.studioTheme===document.documentElement.dataset.themeEffective)));
  themeButtons.forEach(button=>button.addEventListener('click',()=>{const theme=button.dataset.studioTheme;document.documentElement.dataset.theme=theme;document.documentElement.dataset.themeEffective=theme;window.ArtanRecordsPreferences?.saveTheme(theme);update();}));update();
  document.querySelector('[data-studio-preferences]')?.addEventListener('click',()=>document.querySelector('.privacy-preferences').showModal());
  const account=document.querySelector('[data-connection=account]');if(account)account.textContent=client?'Configured; sign in to verify access':'Not connected';
}
