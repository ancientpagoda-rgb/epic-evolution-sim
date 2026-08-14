const DETAIL_SELECTOR = [
  '.cosmology-panel',
  '.phase4-panel',
  '.phase5-panel',
  '.phase6-panel',
  '.phase7-panel',
  '.phase8-panel',
  '.phase9-runtime-panel',
].join(',');

type HomePosition = {
  parent: Node;
  nextSibling: ChildNode | null;
};

export function installMobileHudController(): void {
  const media = window.matchMedia('(max-width: 760px)');
  const homes = new Map<HTMLElement, HomePosition>();

  // The V3 timeline is logarithmic: the old 75% default is only a few hundred
  // million years after the Big Bang, before the selected star/planet/life exist.
  // Phones now open at the evolved present so the mature world is immediately
  // inspectable; the full cosmic-time scrubber remains available in Details.
  if (media.matches) {
    const timeline = document.getElementById('cosmicTimeline') as HTMLInputElement | null;
    if (timeline?.value === '7500') timeline.value = '10000';
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mobile-details-toggle';
  toggle.textContent = 'Details';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'mobile-details-drawer');

  const drawer = document.createElement('section');
  drawer.id = 'mobile-details-drawer';
  drawer.className = 'mobile-details-drawer';
  drawer.setAttribute('aria-label', 'Simulation details');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = `
    <div class="mobile-details-bar">
      <strong>Simulation details</strong>
      <button type="button" class="mobile-details-close" aria-label="Close simulation details">×</button>
    </div>
    <div class="mobile-details-scroll"></div>
  `;

  const scroll = drawer.querySelector<HTMLElement>('.mobile-details-scroll');
  const close = drawer.querySelector<HTMLButtonElement>('.mobile-details-close');
  if (!scroll || !close) return;

  document.body.append(toggle, drawer);

  const setOpen = (open: boolean): void => {
    document.body.classList.toggle('mobile-details-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    toggle.textContent = open ? 'Hide' : 'Details';
  };

  const movePanelsIntoDrawer = (): void => {
    if (!media.matches) return;
    const panels = Array.from(document.querySelectorAll<HTMLElement>(DETAIL_SELECTOR));
    for (const panel of panels) {
      if (drawer.contains(panel)) continue;
      if (!homes.has(panel) && panel.parentNode) {
        homes.set(panel, { parent: panel.parentNode, nextSibling: panel.nextSibling });
      }
      scroll.appendChild(panel);
    }
  };

  const restorePanels = (): void => {
    for (const [panel, home] of homes) {
      if (!panel.isConnected) continue;
      if (home.nextSibling?.parentNode === home.parent) home.parent.insertBefore(panel, home.nextSibling);
      else home.parent.appendChild(panel);
    }
    homes.clear();
  };

  const syncMode = (): void => {
    if (media.matches) {
      movePanelsIntoDrawer();
    } else {
      setOpen(false);
      restorePanels();
    }
  };

  toggle.addEventListener('click', () => {
    const open = !document.body.classList.contains('mobile-details-open');
    if (open) movePanelsIntoDrawer();
    setOpen(open);
  });
  close.addEventListener('click', () => setOpen(false));
  drawer.addEventListener('click', event => {
    if (event.target === drawer) setOpen(false);
  });

  media.addEventListener('change', syncMode);

  const observer = new MutationObserver(() => {
    if (media.matches) queueMicrotask(movePanelsIntoDrawer);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  syncMode();
}
