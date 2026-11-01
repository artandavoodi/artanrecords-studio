import {percentageLabel} from './share-values.js';
const node=(tag,text)=>{const item=document.createElement(tag);if(text!=null)item.textContent=text;return item;};
export async function bindAgreementDrafts({client,resolveUser}){
 const root=document.querySelector('[data-agreement-drafts]');if(!root)return;
 const status=root.querySelector('[data-agreement-drafts-status]'),list=root.querySelector('[data-agreement-drafts-list]');
 if(!client)return;const user=await resolveUser(client).catch(()=>null);if(!user)return;
 try{
  const result=await client.from('studio_agreement_versions').select('id,agreement_id,version_number,terms,terms_digest,created_at').order('created_at',{ascending:false});if(result.error)throw result.error;
  if((await resolveUser(client))?.id!==user.id)return;list.replaceChildren();
  for(const record of result.data||[]){if(record.terms?.kind!=='non_binding_revenue_share_proposal')continue;const details=node('details'),summary=node('summary','Revenue share proposal · version '+record.version_number);details.append(summary,node('p',percentageLabel(record.terms.percentage_bps)+' of the Project Artist Pool'),node('p','Effective from '+record.terms.effective_start+(record.terms.effective_end?' through '+record.terms.effective_end:'')),node('p','Scope: '+record.terms.scope),node('p','Non-binding terms. Not executed; no active financial entitlement.'),node('p','Terms reference: '+record.id),node('code',record.terms_digest));list.append(details);}
  status.textContent=list.childElementCount?'Private proposed terms linked from Revenue Shares.':'No revenue-share terms have been shared with this account.';
 }catch{status.textContent='Proposed agreement records could not be loaded. No agreement status has changed.';}
}
