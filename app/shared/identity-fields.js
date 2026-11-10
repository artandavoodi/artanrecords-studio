import isoCountries from 'i18n-iso-countries';
import english from 'i18n-iso-countries/langs/en.json' with {type:'json'};
import {parsePhoneNumberFromString,getCountries,getCountryCallingCode} from 'libphonenumber-js';

isoCountries.registerLocale(english);
export const countries=Object.entries(isoCountries.getNames('en',{select:'official'})).map(([code,name])=>({code,name,flag:String.fromCodePoint(...[...code].map(letter=>127397+letter.charCodeAt(0)))})).sort((a,b)=>a.name.localeCompare(b.name,'en'));
const callingRegions=new Set(getCountries());
export const phoneCountries=countries.filter(country=>callingRegions.has(country.code)).map(country=>({...country,callingCode:'+'+getCountryCallingCode(country.code)}));
export function bindPhoneFields(form){
 const field=form.elements.phone,region=form.elements.phone_country;
 if(!field||!region)return {sync(){}};
 const detect=()=>{if(field.value.trim().startsWith('+')){const number=parsePhoneNumberFromString(field.value);if(number?.country)region.value=number.country;}};
 field.addEventListener('input',detect);
 form.elements.country_code?.addEventListener('change',()=>{if(!region.value&&callingRegions.has(form.elements.country_code.value))region.value=form.elements.country_code.value;});
 return {sync(){region.value='';detect();region.disabled=field.disabled||field.readOnly;region.required=field.required;}};
}
export function normalizedPhone(value,country){
 if(!value.trim())return '';
 const number=parsePhoneNumberFromString(value,country);
 if(!number?.isValid())throw Error('Enter a valid phone number, including its country calling code.');
 return number.number;
}
export function bindBirthDate(form){
 const field=form.elements.date_of_birth,parts=['month','day','year'].map(name=>form.querySelector('[data-birth-'+name+']'));
 if(!field||parts.some(part=>!part))return {sync(){}};
 const [month,day,year]=parts,now=new Date();
 for(let value=1;value<=12;value++)month.add(new Option(new Intl.DateTimeFormat('en',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,value-1,1))),String(value)));
 for(let value=now.getFullYear();value>=now.getFullYear()-120;value--)year.add(new Option(String(value),String(value)));
 function days(){const previous=day.value,max=new Date(Number(year.value)||2000,Number(month.value)||1,0).getDate();day.replaceChildren(new Option('Day',''));for(let value=1;value<=max;value++)day.add(new Option(String(value),String(value)));day.value=previous;}
 function update(){days();const values=[year.value,month.value,day.value];field.value=values.every(Boolean)?`${values[0]}-${values[1].padStart(2,'0')}-${values[2].padStart(2,'0')}`:'';const partial=values.some(Boolean)&&!values.every(Boolean),future=field.value&&new Date(field.value+'T00:00:00')>now;year.setCustomValidity(partial?'Choose the complete date of birth.':future?'Date of birth cannot be in the future.':'');}
 for(const part of parts)part.addEventListener('change',update);
 return {sync(){const values=field.value.split('-');year.value=values[0]||'';month.value=values[1]?String(Number(values[1])):'';days();day.value=values[2]?String(Number(values[2])):'';for(const part of parts){part.disabled=field.disabled||field.readOnly;part.required=field.required;}update();}};
}
