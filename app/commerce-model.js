import contract from '../assets/data/commerce.json' with {type:'json'};
import config from '../content/commerce.json' with {type:'json'};
export {creatorPath,creatorShopRoute} from '../assets/js/layers/site/creator-routes.js';
export {contract};
export function domainHostname(value){
 const input=String(value||'').trim().replace(/\.$/,'');
 if(!input||/[\s/:?#@*]/.test(input))throw Error('Enter a domain only, such as shop.yourname.com.');
 let hostname;try{hostname=new URL('https://'+input).hostname;}catch{throw Error('Enter a valid domain.');}
 if(hostname.length>253||!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(hostname)||/\.(localhost|local|internal|invalid|test|example)$/.test(hostname)||config.protectedHosts.some(host=>hostname===host||hostname.endsWith('.'+host)))throw Error('Use a public custom domain outside the platform domains.');
 return hostname;
}
export function draftPrice(value,currency){
 if(!value&&!currency)return {price_minor:null,currency:null};
 const rule=contract.currencies.find(item=>item.id===currency);
 if(!rule||!/^\d+(\.\d+)?$/.test(value))throw Error('Choose a currency and enter a valid price.');
 const [whole,fraction='']=value.split('.');if(fraction.length>rule.minorUnits)throw Error('Use no more than '+rule.minorUnits+' decimal places.');
 const minor=Number(whole+fraction.padEnd(rule.minorUnits,'0'));
 if(!Number.isSafeInteger(minor)||minor>contract.limits.maxPriceMinor)throw Error('The price is too large.');
 return {price_minor:minor,currency};
}
export function priceInput(record){
 if(record.price_minor==null)return '';
 const units=contract.currencies.find(item=>item.id===record.currency)?.minorUnits;
 if(units==null)throw Error('This currency needs review before editing.');
 return (record.price_minor/10**units).toFixed(units);
}
export function draftValues(form,kind,previous={schemaVersion:1,variants:[],media:[]}){
 const fields=kind==='product'?config.productFields:config.collectionFields,data={};
 for(const field of fields){const value=String(form.get(field.name)||'').trim();if(field.required&&!value)throw Error('Enter '+field.label.toLowerCase()+'.');if(value.length>field.max)throw Error('Shorten '+field.label.toLowerCase()+'.');data[field.name]=value;}
 if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug))throw Error('Use lowercase letters, numbers and single hyphens for the address.');
 if(kind==='collection')return data;
 const productKind=String(form.get('kind')||'');if(!contract.productKinds.some(item=>item.id===productKind))throw Error('Choose a product type.');
 if(data.image_url){let url;try{url=new URL(data.image_url);}catch{throw Error('Enter an HTTPS reference image URL.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS image URL without credentials.');}
 const price=draftPrice(data.price,String(form.get('currency')||''));
 if(previous.schemaVersion!==1)throw Error('This product contract needs review before editing.');
 return {title:data.title,slug:data.slug,description:data.description,category:data.category,kind:productKind,collection_id:String(form.get('collection_id')||'')||null,...price,details:{...previous,schemaVersion:1,sku:data.sku,variants:previous.variants||[],media:[...(data.image_url?[{url:data.image_url,alt:data.title}]:[]),...(previous.media||[]).slice(1)],shipping:{...previous.shipping,required:['physical','hybrid'].includes(productKind)},inventory:previous.inventory||{policy:'untracked'}}};
}
// User-controlled form fields never choose an owner or a target store.
export function ownDraft(values,store){
 if(!store?.id||!store.creator_id)throw Error('Prepare your private store first.');
 const {id,account_id,creator_id,store_id,status,...safe}=values;
 return {...safe,creator_id:store.creator_id,store_id:store.id};
}
