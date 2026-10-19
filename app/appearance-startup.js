import config from '../content/account.json';
import {restoreAppearance,applyAppearance} from './appearance.js';
try{applyAppearance(restoreAppearance(localStorage,config.preferences));}catch{}
