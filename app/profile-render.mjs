import {artistMetadataEditor} from './metadata-render.mjs';
export function profileMarkup({settings,e,icon}){
  return `<section class="studio-account" data-profile-view>
    <p role="status" data-profile-status>Checking your account...</p>
    <div data-profile-guest hidden><a class="ui-button" href="/account/">${icon('signin')}Sign in</a></div>
    <form data-profile-form hidden>
      <div class="studio-avatar"><span data-avatar-placeholder>${icon('account')}</span><img data-avatar alt="Your profile photograph" referrerpolicy="no-referrer" hidden><label class="studio-photo-action" aria-label="Change profile photograph">${icon('camera')}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photograph"></label></div>
      ${settings.profileFields.map(field=>`<label><span>${e(field.label)}</span><input name="${e(field.name)}" type="${e(field.type||'text')}" autocomplete="${e(field.autocomplete)}" maxlength="${field.max}"></label>`).join('')}
      <label><span>Biography</span><textarea name="biography" maxlength="2000" rows="4"></textarea></label>
      <label><span>Account email (private)</span><input data-profile-email type="email" readonly autocomplete="email"></label><p data-verification></p>
      <label><span>Phone number (private)</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel"></label><button type="button" data-verify-phone>${icon('check')}Verify number</button><p data-phone-status role="status"></p>
      <button type="submit">${icon('check')}${e(settings.labels.save)}</button><button type="button" data-reset-password>${icon('password')}Reset password</button><button type="button" data-signout>${e(settings.labels.signout)}</button>
    </form>
  </section>${artistMetadataEditor(e)}`;
}
