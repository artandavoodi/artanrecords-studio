let stripeScript;
function loadStripe(){
 if(window.Stripe)return Promise.resolve(window.Stripe);
 if(!stripeScript)stripeScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://js.stripe.com/v3/';script.onload=()=>window.Stripe?resolve(window.Stripe):reject(Error());script.onerror=()=>{stripeScript=null;script.remove();reject(Error('Secure payment fields could not be loaded.'));};document.head.append(script);});
 return stripeScript;
}
export async function bindSubscriptionPayments({client,config,resolveUser}){
 const root=document.querySelector('[data-card-setup]');if(!root)return;
 if(!client)return;const owner=await resolveUser(client).catch(()=>null);if(!owner)return;
 const status=root.querySelector('[data-card-status]'),consent=root.querySelector('[data-card-consent-form]'),elementForm=root.querySelector('[data-card-element-form]'),open=root.querySelector('[data-card-open]');let stripe,elements;
 const call=async body=>{
  if((await resolveUser(client))?.id!==owner.id)throw Error('Your session changed. Sign in again.');const session=await client.auth.getSession();const token=session.data.session?.access_token;if(!token)throw Error('Sign in again.');
  const response=await fetch(config.supabase.url+'/functions/v1/studio-billing',{method:'POST',headers:{Authorization:'Bearer '+token,apikey:config.supabase.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',credentials:'omit'}).catch(()=>{throw Error('Secure card setup could not connect. Please try again later. No card details were collected.');});const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Secure card setup is unavailable. No card details were collected.');return result;
 };
 open.disabled=false;status.textContent='Add a test payment method here. Live card billing and subscriptions remain unavailable.';
 consent.onsubmit=async event=>{event.preventDefault();if(!consent.reportValidity())return;open.disabled=true;status.textContent='Checking secure card setup...';
  try{const setup=await call({action:'setup',consent:consent.elements.consent.checked});if(setup.mode!=='sandbox'||setup.chargesEnabled!==false||!/^pk_test_[A-Za-z0-9]+$/.test(setup.publishableKey)||typeof setup.clientSecret!=='string'||!/^seti_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(setup.clientSecret))throw Error('The payment connection could not be verified.');
   const Stripe=await loadStripe();stripe=Stripe(setup.publishableKey);elements=stripe.elements({clientSecret:setup.clientSecret});elements.create('payment').mount(root.querySelector('[data-card-element]'));elementForm.hidden=false;consent.hidden=true;status.textContent='Enter a Stripe test card in the secure fields. No charge will be made.';
  }catch(problem){status.textContent=problem.message;}finally{open.disabled=false;}
 };
 elementForm.onsubmit=async event=>{event.preventDefault();const save=elementForm.querySelector('button');save.disabled=true;
  try{const current=await resolveUser(client);if(current?.id!==owner.id)throw Error('Your session changed.');const result=await stripe.confirmSetup({elements,redirect:'if_required'});if(result.error)throw Error(result.error.message||'Check the payment fields.');const response=await call({action:'complete',intent:result.setupIntent.id});if(!response.saved)throw Error('Payment setup was not confirmed.');status.textContent='Test card saved: '+response.card.brand+' ending '+response.card.last4+'. No subscription or renewal is active.';elementForm.hidden=true;elements.getElement('payment')?.destroy();consent.hidden=false;consent.reset();open.lastChild.textContent='Replace payment method';}
  catch(problem){status.textContent=problem.message;}finally{save.disabled=false;}
 };
}
