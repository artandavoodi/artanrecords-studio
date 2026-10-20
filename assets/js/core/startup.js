/* Pre-paint theme; readiness ends loading immediately, with native load as fallback. */
(() => {
  const root = document.documentElement;
  const config=window.ArtanRecordsPreferenceConfig;
  let record=null;
  try{record=JSON.parse(localStorage.getItem(config.choiceKey));if(record?.version!==config.version||!Number.isFinite(record.expires)||record.expires<Date.now()||!['allow','skip'].includes(record.choice))record=null;}catch{}
  window.ArtanRecordsPreferences={
    choice:()=>record?.choice||null,
    choose(choice){if(!['allow','skip'].includes(choice))return;record={choice,version:config.version,expires:Date.now()+config.validDays*86400000};try{localStorage.setItem(config.choiceKey,JSON.stringify(record));if(choice==='allow')localStorage.setItem(config.themeKey,root.dataset.themeEffective);else localStorage.removeItem(config.themeKey);}catch{}},
    saveTheme(value){if(record?.choice==='allow')try{localStorage.setItem(config.themeKey,value);}catch{}}
  };
  try {
    const theme = record?.choice==='allow'&&localStorage.getItem(config.themeKey)==='dark'?'dark':'light';
    root.dataset.theme = theme;
    root.dataset.themeEffective = theme;
  } catch { /* Storage is optional. */ }
  root.dataset.loading = 'true';
  const finish = () => {
    delete root.dataset.loading;
  };
  window.addEventListener('site:ready', finish, {once: true});
  window.addEventListener('load', finish, {once: true});
  window.addEventListener('pageshow', event => { if (event.persisted) finish(); });
})();
