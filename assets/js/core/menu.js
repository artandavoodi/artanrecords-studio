/* Shared menu lifecycle. CSS owns motion; native links retain their destinations. */
export function bindMenu({ openLabel, closeLabel, selectors = {}, persistentHeader = false }) {
  const toggle = document.querySelector(selectors.toggle || '[data-menu-toggle]');
  const menu = document.querySelector(selectors.menu || '[data-menu]');
  if (!toggle || !menu) return;
  const background = [...document.querySelectorAll(selectors.background || 'main, [data-fragment="footer"], [data-theme-toggle]')];
  const menuControls = selectors.menuControls ? [...document.querySelectorAll(selectors.menuControls)] : [];
  let isOpen = false;
  const root = document.documentElement;
  const navigation = document.querySelector(selectors.navigation || '[data-site-navigation], .site-navigation');
  const headerSection = selectors.headerSection ? document.querySelector(selectors.headerSection) : null;
  const drawerItems = selectors.drawerItems ? [...document.querySelectorAll(selectors.drawerItems)] : [];
  const measureDrawer = () => {
    if (persistentHeader && navigation) navigation.style.setProperty('--menu-drawer-distance', `${navigation.clientWidth - toggle.offsetWidth}px`);
  };
  measureDrawer();
  if (persistentHeader) window.addEventListener('resize', measureDrawer, { passive: true });
  let pending = false;
  let menuScrollY = window.scrollY;
  const revealHeader = () => root.removeAttribute('data-header-hidden');
  const updateHeader = () => {
    const firstSection = persistentHeader ? document.querySelector('main[data-fragment="home"] > section') : null;
    const initialSnapOffset = firstSection
      ? firstSection.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0)
      : 0;
    const scrolled = (isOpen ? menuScrollY : window.scrollY) > Math.max(8, initialSnapOffset + 8);
    const pastIntroduction = headerSection
      ? headerSection.getBoundingClientRect().bottom <= (navigation?.getBoundingClientRect().height || 0)
      : window.scrollY > 8;
    root.toggleAttribute('data-header-hidden', !persistentHeader && !isOpen && pastIntroduction && !navigation?.querySelector(':focus-visible'));
    if (persistentHeader) {
      root.toggleAttribute('data-header-drawer', scrolled);
      drawerItems.forEach(element => { element.inert = scrolled || isOpen; });
    }
  };
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
    if (value) menuScrollY = window.scrollY;
    isOpen = value;
    updateHeader();
    menu.inert = !value;
    menu.setAttribute('aria-hidden', String(!value));
    toggle.setAttribute('aria-expanded', String(value));
    toggle.setAttribute('aria-label', value ? closeLabel : openLabel);
    document.documentElement.toggleAttribute('data-menu-open', value);
    document.body.toggleAttribute('data-menu-locked', value);
    background.forEach(element => { element.inert = value; });
    menuControls.forEach(element => { element.hidden = false; element.inert = !value; });
    if (persistentHeader) updateHeader();
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
      const targets = [toggle, ...menuControls, ...menu.querySelectorAll('a[href]:not([hidden]), button:not([hidden])')];
      const index = targets.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); targets.at(-1).focus(); }
      else if (!event.shiftKey && (index === targets.length - 1 || index < 0)) { event.preventDefault(); toggle.focus(); }
    }
  });
}
