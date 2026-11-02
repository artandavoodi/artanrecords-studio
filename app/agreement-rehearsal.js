import {mountSigningRehearsals} from './shared/agreement-rehearsal.js';
import labels from '../content/agreement-rehearsal.json' with {type:'json'};
import manifest from './icon-manifest.json' with {type:'json'};
export async function bindSigningRehearsals({client,resolveUser}){
 const root=document.querySelector('[data-signing-rehearsal]');if(!root||!client)return;
 const user=await resolveUser(client).catch(()=>null);if(!user)return;
 const icon=name=>`<img class="studio-icon" src="/app/icons/${name}.svg?v=${manifest.files[name]}" alt="">`;
 await mountSigningRehearsals({root,client,role:'artist',accountId:user.id,labels,icons:{refresh:icon('refresh'),sign:icon('signature'),review:icon('check'),archive:icon('shares-archive'),download:icon('download')}});
}
