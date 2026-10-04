/* Same source controller; label routes remain native document links. */
import { bindMenu } from '../../core/menu.js';
export function bindNavigation(labels) {
  bindMenu({ openLabel: labels.menuOpen, closeLabel: labels.menuClose });
}
