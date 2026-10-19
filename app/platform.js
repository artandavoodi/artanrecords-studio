export function bindPlatform({client}){
  const layout=document.querySelector('[data-platform-layout]'),toggle=document.querySelector('[data-platform-rail-toggle]');
  toggle?.addEventListener('click',()=>{const collapsed=layout.toggleAttribute('data-rail-collapsed');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.querySelector('img').src='/app/icons/'+(collapsed?'panel-collapsed':'panel')+'.svg';});
  const panels=[...document.querySelectorAll('[data-settings-panel]')];
  const select=()=>{const target=panels.find(panel=>panel.id===location.hash.slice(1));if(target)target.open=true;};
  addEventListener('hashchange',select);select();
  const themeButtons=[...document.querySelectorAll('[data-studio-theme]')];
  const update=()=>themeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.studioTheme===document.documentElement.dataset.themeEffective)));
  themeButtons.forEach(button=>button.addEventListener('click',()=>{const theme=button.dataset.studioTheme;document.documentElement.dataset.theme=theme;document.documentElement.dataset.themeEffective=theme;window.ArtanRecordsPreferences?.saveTheme(theme);update();}));document.addEventListener('studio-appearance-change',update);update();
  document.querySelector('[data-studio-preferences]')?.addEventListener('click',()=>document.querySelector('.privacy-preferences').showModal());
  const account=document.querySelector('[data-connection=account]');if(account)account.textContent=client?'Configured; sign in to verify access':'Not connected';
}
