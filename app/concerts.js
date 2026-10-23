import schema from '../content/concerts.json' with {type:'json'};
import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';
function eventTime(value,zone){
 if(!value)return null;
 const wall=Date.parse(value+'Z');if(!Number.isFinite(wall))throw Error('Enter a valid event time.');
 const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 let instant=wall;
 for(let i=0;i<4;i++){const rendered=Date.parse(formatter.format(new Date(instant)).replace(' ','T')+'Z');const correction=wall-rendered;if(!correction)return new Date(instant).toISOString();instant+=correction;}
 throw Error('This time does not exist in the event time zone. Choose another time.');
}
function localTime(value,zone){return value?new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)).replace(' ','T'):'';}
export function concertValues(form){
 const data=Object.fromEntries(schema.fields.map(field=>[field.name,String(form.get(field.name)||'').trim()]));
 for(const field of schema.fields){if(field.required&&!data[field.name])throw Error('Enter '+field.label.toLowerCase()+'.');if(field.max&&data[field.name].length>field.max)throw Error('Shorten '+field.label.toLowerCase()+'.');}
 new Intl.DateTimeFormat('en',{timeZone:data.timezone});
 data.starts_at=eventTime(data.starts_at,data.timezone);data.ends_at=eventTime(data.ends_at,data.timezone);
 if(data.ends_at&&data.ends_at<=data.starts_at)throw Error('The end must follow the start.');
 data.country=data.country.toUpperCase();data.currency=data.currency.toUpperCase();
 if(!/^[A-Z]{2}$/.test(data.country))throw Error('Use a two-letter country code.');
 if(data.currency&&!/^[A-Z]{3}$/.test(data.currency))throw Error('Use a three-letter currency code.');
 if(data.ticket_url){const url=new URL(data.ticket_url);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS ticket link without credentials.');}
 data.ticket_price=data.ticket_price===''?null:Number(data.ticket_price);
 if(data.ticket_price!==null&&(!Number.isFinite(data.ticket_price)||data.ticket_price<0||data.ticket_price>99999999.99||!data.currency))throw Error('Enter a valid price and currency, or leave the price blank.');
 return data;
}
export async function bindConcerts({client,resolveUser}){
 const root=document.querySelector('[data-concerts]');if(!root)return;
 const status=root.querySelector('[data-concert-status]'),controls=root.querySelector('[data-concert-controls]'),form=root.querySelector('form'),picker=root.querySelector('[data-concert-picker]');
 if(!client){status.textContent='Sign in to manage concerts.';return;}
 const user=await resolveUser(client).catch(()=>null);if(!user){status.textContent='Sign in to manage concerts.';return;}
 const zones=Intl.supportedValuesOf?.('timeZone')||[];root.querySelector('datalist').replaceChildren(...zones.map(zone=>new Option(zone,zone)));
 let records=[],current=null,dirty=false,busy=false;
 const buttons=[...root.querySelectorAll('[data-concert-publish],[data-concert-hide],[data-concert-cancel]')];
 const defaults=()=>({timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});
 function load(record){current=record?.id||null;for(const field of schema.fields){let value=record?.[field.name]??defaults()[field.name]??'';if(field.type==='datetime-local')value=localTime(value,record?.timezone||defaults().timezone);form.elements[field.name].value=value;}dirty=false;buttons.forEach(button=>button.disabled=!current);status.textContent=record?'Concert: '+record.status+'.':'New concert · private until published.';}
 async function owner(){if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed. Sign in again.');}
 async function list(){await owner();const result=await client.from('studio_concerts').select('*').eq('account_id',user.id).order('starts_at',{ascending:false}).limit(100);if(result.error)throw result.error;records=result.data;picker.replaceChildren(new Option('New concert',''),...records.map(row=>new Option(row.title+' · '+row.status,row.id)));picker.value=current||'';}
 async function run(action){if(busy)return;busy=true;controls.inert=true;try{await owner();await action();}catch(error){status.textContent=error.message||'Concert changes could not be saved.';}finally{busy=false;controls.inert=false;}}
 try{await list();controls.hidden=false;load();}catch{status.textContent='Concert storage is unavailable. No changes have been saved.';return;}
 form.addEventListener('input',()=>dirty=true);
 const canLeave=()=>!busy&&(!dirty||confirm('Discard unsaved concert changes?'));
 picker.addEventListener('change',()=>{if(!canLeave()){picker.value=current||'';return;}load(records.find(row=>row.id===picker.value));});
 root.querySelector('[data-new-concert]').addEventListener('click',()=>{if(canLeave()){picker.value='';load();}});
 addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 form.addEventListener('submit',event=>{event.preventDefault();run(async()=>{const data=concertValues(new FormData(form));const query=current?client.from('studio_concerts').update(data).eq('id',current).eq('account_id',user.id):client.from('studio_concerts').insert({...data,account_id:user.id});const result=await query.select('id').single();if(result.error)throw Error('Concert could not be saved. Please try again.');current=result.data.id;await list();load(records.find(row=>row.id===current));showSaveConfirmation('Concert saved.');});});
 for(const [selector,next,message] of [['publish','published','Concert published.'],['hide','draft','Concert returned to draft.'],['cancel','cancelled','Concert cancellation published.']])root.querySelector('[data-concert-'+selector+']').addEventListener('click',()=>run(async()=>{if(dirty)throw Error('Save your changes before changing publication.');if(!current)return;const result=await client.rpc('studio_set_concert_status',{concert:current,new_status:next});if(result.error)throw Error(next==='published'?'Concert could not be published. Make sure your approved artist page is public.':'Concert status could not be changed.');await list();load(records.find(row=>row.id===current));showSaveConfirmation(message);}));
}
