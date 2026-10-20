import publication from '../assets/data/studio-legal.json';
import {requestGoogleSignIn} from './account.js';
const noticeUrl=path=>publication.domain+publication.notices.find(notice=>notice.legacyPath===path).path;
export async function bindAccount({client,config,resolveUser}){
  const view=document.querySelector('[data-account-view]');if(!view)return;
  const status=view.querySelector('[data-account-status]'),form=view.querySelector('[data-auth-form]'),submit=view.querySelector('[data-auth-submit]'),recovery=view.querySelector('[data-recovery-form]');
  const google=document.createElement('button');google.type='button';google.className='ui-button studio-provider';google.disabled=!client||!config.providers.google;
  const googleIcon=document.createElement('img');googleIcon.className='studio-icon';googleIcon.src='/app/icons/google.svg';googleIcon.alt='';google.append(googleIcon,document.createTextNode('Continue with Google'));form.before(google);
  google.addEventListener('click',async()=>{
    if(!client||!config.providers.google)return;
    google.disabled=true;
    try{await requestGoogleSignIn(client,config,location.origin+'/account/');}
    catch{status.textContent='Google sign-in could not be opened. Try again.';google.disabled=false;}
  });
  if(google.disabled)google.title='Google sign-in will be available when Studio account services are connected.';
  view.querySelectorAll('input[type=password]').forEach(input=>{
    const label=input.closest('label'),wrapper=document.createElement('div');wrapper.className='ui-password-field';input.before(wrapper);wrapper.append(input);input.classList.add('ui-password-field__input');
    const button=document.createElement('button');button.type='button';button.className='ui-password-field__toggle';button.setAttribute('aria-label','Show password');button.setAttribute('aria-pressed','false');
    const icon=document.createElement('img');icon.className='ui-password-field__toggle-icon';icon.src='/app/icons/visibility-on.svg';icon.alt='';button.append(icon);wrapper.append(button);
    // Keep the button outside the implicit label so the input's accessible name stays "Password".
    input.id=input.closest('[data-recovery-form]')?'studio-new-password':'studio-password';label.htmlFor=input.id;label.after(wrapper);
    const update=()=>{wrapper.dataset.passwordHasValue=String(Boolean(input.value));};input.addEventListener('input',update);update();
    button.addEventListener('click',()=>{const showing=input.type==='password';input.type=showing?'text':'password';button.setAttribute('aria-label',showing?'Hide password':'Show password');button.setAttribute('aria-pressed',String(showing));icon.src=showing?'/app/icons/visibility-off.svg':'/app/icons/visibility-on.svg';});
  });
  let action='signin',busy=false;
  const actions=view.querySelector('.studio-auth-tabs');form.after(actions);actions.querySelector('[data-auth-action=signin]').hidden=true;
  const acknowledgement=document.createElement('label');acknowledgement.hidden=true;const accepted=document.createElement('input');accepted.type='checkbox';accepted.name='terms';acknowledgement.append(accepted,document.createTextNode('I agree to the Studio terms and have read the privacy notice.'));form.insertBefore(acknowledgement,submit);
  const notices=document.createElement('p');notices.className='studio-account-notices';for(const [href,label]of[['/terms/','Studio terms'],['/privacy/','Privacy notice']]){const a=document.createElement('a');a.href=noticeUrl(href);a.textContent=label;notices.append(a);}view.append(notices);
  view.addEventListener('click',event=>{if(event.target.closest('[data-auth-action]')){const signup=event.target.closest('[data-auth-action]').dataset.authAction==='signup';acknowledgement.hidden=!signup;accepted.required=signup;}});
  view.querySelectorAll('[data-auth-action]').forEach(button=>button.addEventListener('click',()=>{if(busy)return;action=button.dataset.authAction;document.getElementById('account-title').textContent=config.labels[action];google.hidden=action==='recover';view.querySelectorAll('[data-auth-action]').forEach(item=>{item.hidden=item===button;item.setAttribute('aria-pressed',String(item===button));});const password=form.elements.password;password.required=action!=='recover';password.autocomplete=action==='signup'?'new-password':'current-password';password.closest('.ui-password-field').hidden=action==='recover';view.querySelector('[data-password-label]').hidden=action==='recover';const icon=document.createElement('img');icon.className='studio-icon';icon.src=`/app/icons/${action==='recover'?'password':action==='signin'?'signin':'account'}.svg`;icon.alt='';submit.replaceChildren(icon,document.createTextNode(config.labels[action]));form.elements.email.focus();}));
  if(new URLSearchParams(location.search).get('mode')==='signup')view.querySelector('[data-auth-action=signup]').click();
  if(!client){status.textContent=config.unavailable;return;}
  try{
    const params=new URLSearchParams(location.search),code=params.get('code'),token=params.get('token_hash'),type=params.get('type');
    if(code||token){history.replaceState(null,'','/account/');let result;if(token){if(!['signup','recovery','invite','email_change','email'].includes(type))throw Error('Unsupported confirmation link');result=await client.auth.verifyOtp({token_hash:token,type});}else result=await client.auth.exchangeCodeForSession(code);if(result.error)throw result.error;const user=await resolveUser(client);if(!user)throw Error('The link could not be confirmed.');form.hidden=true;view.querySelector('.studio-auth-tabs').hidden=true;if(params.get('flow')==='recovery'||type==='recovery'){recovery.hidden=false;status.textContent='Choose a new password.';}else{status.textContent='Email confirmed. Your account is ready.';view.querySelector('[data-authenticated]').hidden=false;}}
    else if(await resolveUser(client)){form.hidden=true;view.querySelector('[data-authenticated]').hidden=false;status.textContent='You are signed in.';}else status.textContent='Use your email to access Studio.';
    if(form.hidden){google.hidden=true;view.querySelector('.studio-auth-tabs').hidden=true;}
    submit.disabled=false;
  }catch{status.textContent='We could not confirm your session or link. Request a new link or try again.';submit.disabled=false;}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;busy=true;submit.disabled=true;status.textContent='Please wait...';
    const email=form.elements.email.value.trim(),password=form.elements.password.value,redirect=location.origin+'/account/';
    try{let result;if(action==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect}});else if(action==='recover')result=await client.auth.resetPasswordForEmail(email,{redirectTo:redirect+'?flow=recovery'});else result=await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(action==='signin'){if(!await resolveUser(client))throw Error('Session unavailable');location.assign('/profile/');return;}status.textContent=action==='recover'?'If an account matches, a reset link will arrive by email.':'Check your email to confirm your account.';form.elements.password.value='';}catch{status.textContent='The request could not be completed. Check your details or try again later.';}finally{busy=false;submit.disabled=false;}
  });
  recovery.addEventListener('submit',async event=>{event.preventDefault();const button=recovery.querySelector('button');button.disabled=true;try{const result=await client.auth.updateUser({password:recovery.elements.password.value});if(result.error)throw result.error;recovery.reset();recovery.hidden=true;status.textContent='Password updated.';view.querySelector('[data-authenticated]').hidden=false;}catch{status.textContent='Password could not be updated. Request a new recovery link.';}finally{button.disabled=false;}});
}
