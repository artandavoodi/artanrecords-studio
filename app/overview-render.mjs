import {readFile} from 'node:fs/promises';
import {renderIcon} from './icon-render.mjs';
const read=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
const config=(await read('../content/platform.json')).overview;
const appearance=await read('../content/appearance.json');
export function partnershipThemesMarkup(e){return `<section class="studio-partnership-themes"><h2 class="home-platform-theme__section-title">${e(appearance.title)}</h2><div class="studio-hero-actions">${appearance.presets.map(theme=>`<button class="ui-button" type="button" data-partnership-theme="${e(theme.id)}" aria-pressed="false">${renderIcon('theme-'+theme.id,e)}${e(theme.label)}</button>`).join('')}</div></section>`;}
export function overviewMarkup(e,icon){
 return `<section class="studio-overview" data-studio-overview><header><h2>${e(config.title)}</h2><p>${e(config.introduction)}</p></header><section class="studio-overview-membership" aria-label="Your partnership and access"><div><span>${icon('contract',e)}Partnership</span><strong data-overview-tier>Sign in to view your partnership</strong><p data-overview-partnership></p></div><div><span>${icon('account',e)}Studio access</span><strong data-overview-access>Not verified</strong><p data-overview-entitlement></p></div></section><div class="studio-platform-features">${config.actions.map(action=>`<article class="surface-card">${icon(action.icon,e)}<h3><a href="${e(action.href)}">${e(action.label)}</a></h3><p>${e(action.detail)}</p></article>`).join('')}</div><p role="status" data-overview-status></p></section>`;
}
