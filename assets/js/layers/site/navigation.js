/* Same source controller; label routes remain native document links. */
import { bindMenu } from '../../core/menu.js';
export function bindNavigation(labels) {
  bindMenu({ openLabel: labels.menuOpen, closeLabel: labels.menuClose, persistentHeader: true, selectors: {background:'main, [data-fragment="footer"], .label-header-actions', menuControls: '.label-menu-theme', drawerItems: '.label-header-logo, .label-header-actions'} });
}
