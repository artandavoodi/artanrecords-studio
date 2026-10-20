import {artistMetadataEditor} from './metadata-render.mjs';
import {readFile} from 'node:fs/promises';
const artistAccount=JSON.parse(await readFile(new URL('../content/artist-account.json',import.meta.url),'utf8'));
export function profileMarkup({settings,e,icon}){
  return `<section class="studio-account" data-profile-view>
    <p role="status" data-profile-status>Checking your account...</p>
    <div data-profile-guest hidden><a class="ui-button" href="/account/">${icon('signin')}Sign in</a></div>
    <form data-profile-form hidden>
      <div class="studio-profile-header"><img data-header-image alt="Your artist header" hidden><span class="studio-section-label">${icon('image')}Header image</span><label class="studio-photo-action" aria-label="Change header image">${icon('camera')}<input name="header_photo" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose header image"></label></div>
      <div class="studio-avatar"><span data-avatar-placeholder>${icon('account')}</span><img data-avatar alt="Your profile photograph" referrerpolicy="no-referrer" hidden><label class="studio-photo-action" aria-label="Change profile photograph">${icon('camera')}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photograph"></label></div>
      ${settings.profileFields.map(field=>`<label><span>${e(field.label)}</span><input name="${e(field.name)}" type="${e(field.type||'text')}" autocomplete="${e(field.autocomplete)}" maxlength="${field.max}"></label>`).join('')}
      <label><span>Biography</span><textarea name="biography" maxlength="2000" rows="4"></textarea></label>
      <label><span>Account email (private)</span><input data-profile-email type="email" readonly autocomplete="email"></label><p data-verification></p>
      <label><span>Phone number (private)</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel"></label><button type="button" data-verify-phone>${icon('check')}Verify number</button><p data-phone-status role="status"></p>
      <button type="submit">${icon('check')}${e(settings.labels.save)}</button><button type="button" data-reset-password>${icon('password')}Reset password</button><button type="button" data-signout>${e(settings.labels.signout)}</button>
    </form>
  </section><section class="studio-account studio-identity" data-artist-identity hidden>
    <h2 class="studio-section-label">${icon('username')}Artist address</h2>
    <form data-username-form><label><span>Username</span><input class="ui-field" name="username" minlength="3" maxlength="32" autocomplete="username" autocapitalize="none" spellcheck="false" required aria-describedby="username-status"></label><button class="ui-button" type="submit">${icon('check')}Request username</button></form>
    <p id="username-status" role="status"></p><p data-handle-notice role="status"></p>
    <div class="studio-profile-actions"><button class="ui-button" type="button" data-publish-profile>${icon('visibility-on')}Publish selected fields</button><a class="ui-button" data-public-page hidden target="_blank" rel="noopener">${icon('globe')}View artist page</a><button class="ui-button" type="button" data-unpublish-profile>${icon('visibility-off')}Hide artist page</button></div>
    <details class="studio-profile-help"><summary class="studio-section-label">${icon('help')}About artist addresses</summary><p>Use 3–32 lowercase letters, numbers or internal dots. No dashes. Reserved names and names already in use cannot be requested. The label must approve your username before you can publish. Save your profile and catalogue choices before publishing. Account email, phone, billing and original images stay private. Custom domains require separate ownership verification and label setup.</p></details>
  </section>${artistMetadataEditor(e)}<section class="studio-account studio-identity" data-partnership-application hidden><h2 class="studio-section-label">${icon('contract')}${e(artistAccount.applicationTitle)}</h2><p>${e(artistAccount.applicationNotice)}</p><form><label>Preferred tier<select class="ui-field" name="tier">${artistAccount.tiers.map(tier=>`<option value="${e(tier.id)}">${e(tier.label)}</option>`).join('')}</select></label><label>About your project<textarea class="ui-field" name="note" maxlength="2000" rows="4"></textarea></label><button class="ui-button" type="submit">${icon('check')}Send application</button></form><p role="status"></p></section>`;
}
