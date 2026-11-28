import {readFile} from 'node:fs/promises';
import {recordingReference} from '../foundation/partnerships.mjs';
import {agreementIntakeMarkup} from './agreement-intake-render.mjs';
const terms=JSON.parse(await readFile(new URL('../assets/data/partnerships.json',import.meta.url),'utf8'));
export function agreementsMarkup(e,icon){
 const reference=recordingReference(terms).map(section=>`<section><h3>${e(section.title)}</h3>${section.paragraphs.map(text=>`<p>${e(text)}</p>`).join('')}</section>`).join('');
 const panels={
  'contract-rehearsal':`<section data-signing-rehearsal data-embedded></section>`,
  'contract-details':agreementIntakeMarkup(e,icon,{toolbar:true}),
  'contract-collaboration':`<section class="surface-section studio-shares" data-agreement-drafts><h2>${icon('shares-agreement')}Proposed collaboration agreements</h2><p role="status" data-agreement-drafts-status>Sign in to see proposed terms shared with your account.</p><div data-agreement-drafts-list></div><a href="/shares/">${icon('shares')}Revenue Shares</a></section>`,
  'contract-help':agreementBody(e,icon)+`<details><summary><span>Default recording terms</span>${icon('chevron-down')}</summary>${reference}</details>`
 };
 return `<div class="studio-agreements"><nav class="studio-profile-tabs" role="tablist" aria-label="Agreements">${config.tabs.map((tab,index)=>`<button type="button" role="tab" id="tab-${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${index===0}" tabindex="${index===0?0:-1}" data-settings-tab="${tab.id}">${icon(tab.icon)}<span>${e(tab.label)}</span></button>`).join('')}</nav>${config.tabs.map((tab,index)=>`<section id="panel-${tab.id}" role="tabpanel" aria-labelledby="tab-${tab.id}" data-settings-panel="${tab.id}"${index?' hidden':''}>${panels[tab.id]}</section>`).join('')}</div>`;
}
const config=JSON.parse(await readFile(new URL('../content/agreements.json',import.meta.url),'utf8'));
if(config.signingEnabled)throw Error('Signing requires a verified provider integration');
function agreementBody(e,icon){return `<section aria-label="Agreement help"><h2 class="studio-section-label">${icon('help')}Help</h2><p>Your documents are in Review &amp; sign. Contact the label before signing if any legal details are incorrect.</p><div class="studio-hero-actions"><a class="ui-button" href="https://artanrecords.com/contact/">${icon('help')}Contact the label</a></div></section>`;}
