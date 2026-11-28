import {mountSigningRehearsals} from './shared/agreement-rehearsal.js';
import labels from '../content/agreement-rehearsal.json' with {type:'json'};
import config from '../content/account.json' with {type:'json'};
import {bindRecordOptions} from './shared/record-options.js';
import {renderIcon,renderMaskIcon} from './icon-render.mjs';
export async function bindSigningRehearsals({client,resolveUser}){
 const root=document.querySelector('[data-signing-rehearsal]');if(!root||!client)return;
 const user=await resolveUser(client).catch(()=>null);if(!user)return;
 const icon=name=>name==='guide-scroll'?renderIcon(name,String):renderMaskIcon(name,String);
 const recordOptions=({toolbar,host})=>{
  const buttons=[...toolbar.querySelectorAll('button')],download=buttons.find(button=>button.getAttribute('aria-label')===labels.download),print=buttons.find(button=>button.getAttribute('aria-label')===labels.print);
  const paths=Object.fromEntries(Object.entries(config.icons).map(([name,path])=>[path,name]));
  const menu=bindRecordOptions({host,before:toolbar.lastElementChild,title:'Document options',triggerLabel:'More',icon:path=>icon(paths[path]),actions:[{label:labels.download,icon:config.icons.download,run:()=>download.click()},{label:labels.print,icon:config.icons.print,run:()=>print.click()}]});
  menu.panel.classList.add('studio-content-dialog');menu.trigger.dataset.documentOptions='';toolbar.append(menu.trigger);
 };
 await mountSigningRehearsals({root,client,role:'artist',accountId:user.id,onRecordOptions:recordOptions,labels,icons:{confirmation:icon('help'),close:icon('close'),clear:icon('reset'),guide:icon('guide-scroll'),add:icon('plus'),edit:icon('edit'),save:icon('editor-save'),use:icon('signature'),default:icon('signature-default'),remove:icon('signature-remove'),open:icon('document-open'),refresh:icon('refresh'),sign:icon('signature'),review:icon('check'),archive:icon('shares-archive'),download:icon('download'),print:icon('print')}});
 if(root.closest('.studio-agreements')){const refresh=root.querySelector('[data-rehearsal-refresh]'),header=document.createElement('header'),title=document.createElement('h2');header.className='studio-agreement-toolbar';title.textContent=labels.title;refresh.classList.add('studio-header-control');refresh.before(header);header.append(title,refresh);}
}
