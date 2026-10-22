import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
const source='../website';
const files=[
  'assets/js/layers/website/ui/profile-media-editor.js',
  'assets/css/layers/website/ui/profile-media-editor.css',
  'assets/css/core/01-tokens/editor.tokens.css',
  'assets/css/core/03-primitives/icons.css',
  'assets/css/core/03-primitives/slider.css',
  'assets/fragments/layers/website/profile/private/media/profile-media-editor.html',
  'assets/data/account/username/username-policy.json',
  'assets/data/account/username/reserved-usernames.json',
  'assets/js/layers/website/system/account/username/account-username-policy.js',
  'assets/data/platform/home-platform-shell.json',
  'registry/icons/public/assets/layers/website/home/platform-menu/settings/platform-menue-settings-appearance.svg',
  'registry/icons/public/assets/layers/website/home/platform-menu/settings/platform-menue-settings-privacy.svg',
  'registry/icons/public/assets/layers/website/home/platform-menu/settings/platform-menue-settings-security.svg',
  'assets/js/core/02-systems/theme.js','assets/js/core/01-foundation/toggle.js',
  'assets/js/layers/website/overlays/cookie/cookie-consent.js',
  'assets/css/core/03-primitives/radio-list.css','assets/css/core/03-primitives/toggle.css',
  'assets/css/core/03-primitives/dropdown.css','assets/css/core/03-primitives/pickers.css',
  'assets/css/layers/website/home/platform-menu/settings/_shared/settings-category.css',
  'assets/css/layers/website/overlays/cookie/cookie-consent.css',
  'assets/css/layers/website/overlays/cookie/cookie-learning-overlay.css',
  'assets/css/layers/website/home/platform-menu/settings/appearance/index.css',
  'assets/fragments/layers/website/cookie/cookie-consent.html',
  'assets/fragments/layers/website/cookie/cookie-learning-overlay.html',
  'assets/fragments/layers/website/home/platform-menu/settings/appearance/index.html'
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(process.argv.includes('--sync')){
  const revision=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const manifest={source:'artandavoodi/website',revision,files:{}};
  for(let index=0;index<files.length;index++){
    const path=files[index];
    const bytes=execFileSync('git',['-C',source,'show',`${revision}:docs/${path}`]);
    for(const match of bytes.toString().matchAll(/(?:src|href)="\/(registry\/icons\/public\/assets\/[^"?#]+)"/g))if(!files.includes(match[1]))files.push(match[1]);
    await mkdir(dirname(`app/neuroartan/${path}`),{recursive:true});
    await writeFile(`app/neuroartan/${path}`,bytes);manifest.files[path]=hash(bytes);
  }
  await writeFile('app/platform-manifest.json',JSON.stringify(manifest,null,2)+'\n');
}else{
  const manifest=JSON.parse(await readFile('app/platform-manifest.json','utf8'));
  for(const [path,expected]of Object.entries(manifest.files))if(hash(await readFile(`app/neuroartan/${path}`))!==expected)throw Error('Platform source drift: '+path);
}
