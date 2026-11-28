import {readFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('./icon-manifest.json',import.meta.url),'utf8'));
export function renderIcon(name,e,classes='studio-icon'){
  const source=name;
  return `<img class="${e(classes)}" src="/app/icons/${e(source)}.svg" alt="">`;
}
export function renderMaskIcon(name,e,classes='studio-icon'){
 if(!Object.hasOwn(manifest.files,name))throw Error('Unregistered Studio icon: '+name);
 return `<span class="${e(classes)} studio-icon--mask" style="--studio-icon-source:url('/app/icons/${e(name)}.svg')" aria-hidden="true"></span>`;
}
