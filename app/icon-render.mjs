import manifest from './icon-manifest.json' with {type:'json'};
export function renderIcon(name,e,classes='studio-icon'){
  const source=name;
  return `<img class="${e(classes)}" src="/app/icons/${e(source)}.svg" alt="">`;
}
export function renderMaskIcon(name,e,classes='studio-icon'){
 if(!Object.hasOwn(manifest.files,name))throw Error('Unregistered Studio icon: '+name);
 return `<span class="${e(classes)} studio-icon--mask" style="--studio-icon-source:url('/app/icons/${e(name)}.svg?v=${manifest.files[name]}')" aria-hidden="true"></span>`;
}
