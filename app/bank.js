export function bankSnapshot(value){
  if(value?.mode!=='test'||typeof value.linked!=='boolean')throw Error('Invalid payout response');
  if(!value.linked){if(!Array.isArray(value.countries)||!value.countries.length||value.countries.some(code=>typeof code!=='string'||!/^[A-Z]{2}$/.test(code)))throw Error('Invalid country response');return value;}
  const status=value.status;
  if(!status||['detailsSubmitted','payoutsEnabled','transfersActive','restricted'].some(key=>typeof status[key]!=='boolean')||!Number.isSafeInteger(status.informationDue)||status.informationDue<0)throw Error('Invalid payout status');
  for(const key of ['available','pending'])if(!Array.isArray(value.balances?.[key])||value.balances[key].length>100||value.balances[key].some(item=>!Number.isSafeInteger(item.amount)||!/^[a-z]{3}$/.test(item.currency)))throw Error('Invalid payout balance');
  return value;
}
export function onboardingDestination(value){
  if(value?.mode!=='test')throw Error('Unexpected payment environment');
  const url=new URL(value.url);
  if(url.origin!=='https://connect.stripe.com'||url.username||url.password)throw Error('Untrusted payout destination');
  return url.href;
}
export function bankAmount(item){
  if(['eur','usd','gbp'].includes(item.currency))return new Intl.NumberFormat(undefined,{style:'currency',currency:item.currency.toUpperCase()}).format(item.amount/100);
  return `${item.amount} minor units (${item.currency.toUpperCase()})`;
}
export async function bindBank({client,resolveUser}){
  const surface=document.querySelector('[data-bank-service]');if(!surface)return;
  const status=surface.querySelector('[data-bank-status]'),mode=surface.querySelector('[data-bank-mode]'),onboard=surface.querySelector('[data-bank-onboard]'),refresh=surface.querySelector('[data-bank-refresh]');
  const country=surface.querySelector('[data-bank-country]'),countryField=surface.querySelector('[data-bank-country-field]');
  let owner=null,busy=false;
  const total=document.querySelector('[data-bank-total]');
  const clear=()=>{mode.hidden=true;onboard.disabled=true;countryField.hidden=true;if(total)total.textContent='—';document.querySelectorAll('[data-bank-balance]').forEach(item=>item.textContent='Unavailable');};
  const invoke=async(action,countryCode)=>{
    const current=client&&await resolveUser(client);
    if(!current||(owner&&current.id!==owner))throw Error('Sign in required');
    owner=current.id;
    const {data,error}=await client.functions.invoke('studio-connect',{body:{action,...(countryCode?{country:countryCode}:{})}});
    if(error||data?.error){console.error('[studio] Payout connection failed',error?.context?.status||'network');throw Error('Payout connection unavailable');}
    if((await resolveUser(client))?.id!==owner)throw Error('Payout connection unavailable');return data;
  };
  async function load(){
    if(busy)return;busy=true;refresh.disabled=true;clear();status.textContent='Checking payout connection...';
    try{
      const data=bankSnapshot(await invoke('status'));mode.hidden=false;onboard.disabled=false;
      if(!data.linked){status.textContent='No payout account connected. Choose your country, then enter bank and tax information securely with Stripe.';onboard.querySelector('span').textContent='Set up payout account';const selected=country.value,names=new Intl.DisplayNames([navigator.language||'en'],{type:'region'});country.replaceChildren(new Option('Choose your country',''),...data.countries.map(code=>new Option(names.of(code)||code,code)).sort((a,b)=>a.text.localeCompare(b.text)));country.value=data.countries.includes(selected)?selected:'';countryField.hidden=false;}
      else{
        onboard.querySelector('span').textContent='Update payout information';
        status.textContent=data.status.restricted?'Stripe requires attention. Review your payout information.':data.status.informationDue?'Stripe requires more information before payouts are ready.':data.status.payoutsEnabled&&data.status.transfersActive?'Sandbox payout capabilities enabled. Live withdrawals remain unavailable.':'Stripe is reviewing payout capabilities. Withdrawals are unavailable.';
        document.querySelectorAll('[data-bank-balance]').forEach(item=>{const entries=data.balances[item.dataset.bankBalance];item.textContent=entries.length?entries.map(bankAmount).join(' · '):'No test funds in this balance';});
        if(total)total.textContent=data.balances.available.length?data.balances.available.map(bankAmount).join(' · '):'0 test funds';
      }
    }catch{clear();status.textContent='Payout setup is not connected yet. No bank details were collected or withdrawal made.';}
    finally{busy=false;refresh.disabled=false;}
  }
  refresh.addEventListener('click',load);
  onboard.addEventListener('click',async()=>{
    if(busy)return;if(!countryField.hidden&&!country.reportValidity())return;busy=true;onboard.disabled=true;refresh.disabled=true;
    try{location.assign(onboardingDestination(await invoke('onboard',countryField.hidden?null:country.value)));}catch{status.textContent='Payout setup could not be opened. Refresh the connection and try again.';busy=false;refresh.disabled=false;}
  });
  // Provider return parameters are never proof of verification; load fresh server status.
  await load();
}
