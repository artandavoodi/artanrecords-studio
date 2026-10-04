/* Shared menu lifecycle. CSS owns motion; native links retain their destinations. */
export function bindMenu({ openLabel, closeLabel, selectors = {} }) {
  const toggle = document.querySelector(selectors.toggle || '[data-menu-toggle]');
  const menu = document.querySelector(selectors.menu || '[data-menu]');
  if (!toggle || !menu) return;
  const background = [...document.querySelectorAll(selectors.background || 'main, [data-fragment="footer"], [data-theme-toggle]')];
  let isOpen = false;
  const root = document.documentElement;
  const navigation = document.querySelector(selectors.navigation || '[data-site-navigation], .site-navigation');
  let pending = false;
  const revealHeader = () => root.removeAttribute('data-header-hidden');
  const updateHeader = () => root.toggleAttribute('data-header-hidden', !isOpen && window.scrollY > 8 && !navigation?.querySelector(':focus-visible'));
  navigation?.addEventListener('focusin', revealHeader);
  window.addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      updateHeader();
    });
  }, { passive: true });
  window.addEventListener('pageshow', updateHeader);
  navigation?.addEventListener('focusout', () => requestAnimationFrame(updateHeader));
  const setOpen = value => {
    isOpen = value;
    updateHeader();
    menu.inert = !value;
    menu.setAttribute('aria-hidden', String(!value));
    toggle.setAttribute('aria-expanded', String(value));
    toggle.setAttribute('aria-label', value ? closeLabel : openLabel);
    document.documentElement.toggleAttribute('data-menu-open', value);
    document.body.toggleAttribute('data-menu-locked', value);
    background.forEach(element => { element.inert = value; });
  };
  const links = [...menu.querySelectorAll('a[href]:not([hidden])')];
  links.forEach((link, index) => link.style.setProperty('--site-menu-item-index', index));
  setOpen(false);
  document.documentElement.setAttribute('data-menu-ready', '');
  menu.hidden = false;
  toggle.hidden = false;
  toggle.addEventListener('click', () => setOpen(!isOpen));
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) { setOpen(false); if (event.detail === 0) toggle.focus(); }
  });
  document.addEventListener('keydown', event => {
    if (!isOpen) return;
    if (event.key === 'Escape') { setOpen(false); toggle.focus(); }
    if (event.key === 'Tab') {
      const targets = [toggle, ...links];
      const index = targets.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); targets.at(-1).focus(); }
      else if (!event.shiftKey && (index === targets.length - 1 || index < 0)) { event.preventDefault(); toggle.focus(); }
    }
  });
}
