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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

export function installMobileHudController(): void {
  const media = window.matchMedia('(max-width: 760px)');
  const homes = new Map<HTMLElement, HomePosition>();

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'mobile-details-toggle';
  toggle.textContent = 'Details';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'mobile-details-drawer');

  const organisms = document.createElement('button');
  organisms.type = 'button';
  organisms.className = 'mobile-organisms-toggle';
  organisms.textContent = 'Organisms';
  organisms.setAttribute('aria-label', 'View evolved organisms on the planet surface');

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

  document.body.append(organisms, toggle, drawer);

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

  const waitForScaleChange = async (before: string): Promise<void> => {
    const deadline = performance.now() + 5_000;
    while (performance.now() < deadline) {
      await sleep(100);
      const scale = document.getElementById('scale');
      const current = scale?.textContent?.toLowerCase() ?? '';
      if (current && current !== before) return;
    }
  };

  const viewOrganisms = async (): Promise<void> => {
    setOpen(false);
    if (organisms.disabled) return;

    organisms.disabled = true;
    organisms.textContent = 'Finding…';

    try {
      const timeline = document.getElementById('cosmicTimeline') as HTMLInputElement | null;
      if (timeline) {
        timeline.value = '10000';
        timeline.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const previous = document.getElementById('scalePrev') as HTMLButtonElement | null;
      const next = document.getElementById('scaleNext') as HTMLButtonElement | null;
      const scale = document.getElementById('scale');
      if (!previous || !next || !scale) return;

      // The organism layer lives on the kilometer-scale generated planet.
      // Walk through adjacent physical scales until we get there, no matter
      // where the user currently is in the continuum.
      for (let attempts = 0; attempts < 6; attempts += 1) {
        const current = scale.textContent?.toLowerCase() ?? '';
        if (current.includes('generated planet')) break;

        if (current.includes('microscopic')) {
          if (!previous.disabled) {
            previous.click();
            await waitForScaleChange(current);
            await sleep(120);
            continue;
          }
        } else if (
          current.includes('cosmic web') ||
          current.includes('galaxy') ||
          current.includes('star-forming system') ||
          current.includes('planetary system')
        ) {
          if (!next.disabled) {
            next.click();
            await waitForScaleChange(current);
            await sleep(120);
            continue;
          }
        }

        // A transition may already be running. Wait briefly and retry rather
        // than making a tap silently do nothing.
        await sleep(350);
      }

      const status = document.getElementById('status');
      const arrived = (scale.textContent?.toLowerCase() ?? '').includes('generated planet');
      if (arrived) {
        organisms.textContent = 'Organisms ✓';
        if (status) status.textContent = 'Evolved planet surface • macroscopic organism view';
        await sleep(900);
      } else {
        organisms.textContent = 'Try again';
        if (status) status.textContent = 'Organism view could not finish the scale transition';
        await sleep(1_200);
      }
    } finally {
      organisms.disabled = false;
      organisms.textContent = 'Organisms';
    }
  };

  toggle.addEventListener('click', () => {
    const open = !document.body.classList.contains('mobile-details-open');
    if (open) movePanelsIntoDrawer();
    setOpen(open);
  });
  organisms.addEventListener('click', () => { void viewOrganisms(); });
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
