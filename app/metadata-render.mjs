import {readFile} from 'node:fs/promises';
import {renderIcon} from './icon-render.mjs';
const schema=JSON.parse(await readFile(new URL('../content/metadata.json',import.meta.url),'utf8'));
export function metadataField(field,e,share=false){
  const common=`name="${e(field.name)}"${field.required?' required':''}${field.maxLength?` maxlength="${field.maxLength}"`:''}`;
  let control;
  if(field.type==='textarea')control=`<textarea class="ui-field" ${common} rows="4"></textarea>`;
  else if(field.type==='select')control=`<select class="ui-field" ${common}>${field.options.map(value=>`<option value="${e(value)}">${e(value)}</option>`).join('')}</select>`;
  else control=`<input ${field.type==='checkbox'?'':'class="ui-field"'} type="${field.type||'text'}" ${common}${field.type==='number'?` min="${field.min}" max="${field.max}"`:''}>`;
  const label=`<label>${field.type==='checkbox'?control+'<span>'+e(field.label)+'</span>':'<span>'+e(field.label)+'</span>'+control}</label>`;
  return share?`<div>${label}<label class="studio-sharing"><input type="checkbox" data-visibility-key="${e(field.name)}"><span>Public after approval</span></label></div>`:label;
}
const summary=(title,e,icon)=>`<summary><span class="studio-section-label">${icon?renderIcon(icon,e):''}${e(title)}</span><img class="studio-icon studio-chevron" src="/assets/icons/navigation/chevron-right.svg" alt=""></summary>`;
export function artistMetadataEditor(e){
  return `<section class="studio-account studio-metadata" data-artist-metadata hidden><h2>${e(schema.artist.title)}</h2><details class="studio-profile-help">${summary('About visibility',e,'help')}<p>${e(schema.artist.notice)}</p></details><form><details>${summary('Profile visibility',e,'visibility-on')}<p>Account email, phone and billing details stay private. Select which catalogue fields may be public after approval.</p>${schema.publication.artistBaseFields.map(key=>`<label class="studio-sharing"><input type="checkbox" data-visibility-key="${key}"><span>${e(key.replaceAll('_',' '))}: public after approval</span></label>`).join('')}</details>${schema.artist.groups.map(group=>`<details>${summary(group.title,e,group.icon)}<div class="studio-metadata-fields">${group.fields.map(field=>metadataField(field,e,!schema.publication.artistPrivateFields.includes(field.name))).join('')}</div></details>`).join('')}<button class="ui-button" type="submit">${renderIcon('check',e)}Save catalogue information</button></form><p role="status" data-metadata-status></p></section>`;
}
function track(e){
  return `<fieldset data-track><legend data-track-heading>Track</legend><div class="studio-metadata-fields">${schema.release.trackFields.map(field=>metadataField(field,e)).join('')}<h3>Contributors</h3><p>Use the correct credited names. Songwriter and composer legal names stay in the private review record; they are not automatically published.</p><div data-contributors></div><button type="button" class="ui-button" data-add-contributor>Add contributor</button><button type="button" class="ui-button" data-remove-track>Remove track</button></div></fieldset>`;
}
export function releaseMetadataEditor(e){
  const publicFields=schema.publication.releaseFields;
  const sharing=publicFields.map(key=>`<label class="studio-sharing"><input type="checkbox" data-visibility-key="${key}"><span>${e(schema.release.fields.find(field=>field.name===key)?.label||key)}: public after approval</span></label>`).join('');
  return `<section class="studio-account studio-metadata" data-release-metadata>
    <p>${e(schema.release.notice)}</p><p role="status" data-metadata-status>Checking your account...</p>
    <div data-release-controls hidden><label>Saved drafts<select class="ui-field" data-draft-picker><option value="">New release</option></select></label><button type="button" class="ui-button" data-new-draft>New release</button>
      <form>${schema.release.groups.map((group,index)=>`<details${index===0?' open':''}>${summary(group.title,e)}<div class="studio-metadata-fields">${group.fields.map(name=>metadataField(schema.release.fields.find(field=>field.name===name),e)).join('')}</div></details>`).join('')}
        <h2>Tracks</h2><div data-tracks>${track(e)}</div><button type="button" class="ui-button" data-add-track>Add track</button>
        <details>${summary('Existing release links',e)}<div class="studio-metadata-fields" data-release-links>${schema.release.linkFields.map(field=>metadataField(field,e)).join('')}</div></details>
        <details>${summary('Publication choices',e)}<p>Choose which catalogue fields may appear after release approval. Private reference links and contributor legal-name records are never published by these choices. Track sharing covers titles, versions, public artist names, language, explicit status, duration, stories and lyrics only.</p>${sharing}</details>
        <p>Human-made music only. Fully AI-generated masters are not accepted. Disclose assistive tools and artwork provenance; rights, assets and delivery are reviewed separately.</p><button type="submit" class="ui-button">${renderIcon('check',e)}Save release draft</button>
      </form>
    </div><div data-release-guest hidden><a class="ui-button" href="/account/">${renderIcon('signin',e)}Sign in</a></div>
    <template data-track-template>${track(e)}</template><template data-contributor-template><div class="studio-contributor"><label><span>Contributor name</span><input class="ui-field" name="contributor_name" maxlength="200" required autocomplete="off"></label><label><span>Role</span><select class="ui-field" name="contributor_role">${schema.release.roles.map(role=>`<option>${e(role)}</option>`).join('')}</select></label><button type="button" class="ui-button" data-remove-contributor>Remove contributor</button></div></template>
  </section>`;
}
