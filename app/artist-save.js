import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';
// The editor refreshes its public preview only after an owner save succeeds.
export function showArtistSaveConfirmation(text){
 showSaveConfirmation(text);
 document.dispatchEvent(new CustomEvent('studio:artist-saved'));
}
