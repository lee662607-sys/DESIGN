(() => {
  'use strict';
  const data = window.LEE_PORTFOLIO;
  const hero = document.getElementById('intro');
  const dock = document.getElementById('folder-dock');
  if (!hero || !dock || !data || !Array.isArray(data.categories)) return;

  const colors = {
    editorial: { color: '#45ad43', ink: '#ffffff', english: 'Album Design' },
    exhibition: { color: '#ebe3b1', ink: '#847a42', english: 'Exhibition Design' },
    presentation: { color: '#ee603c', ink: '#ffffff', english: 'PPT Design' },
    brochure: { color: '#417dbf', ink: '#ffffff', english: 'Brochure Design' },
    other: { color: '#45ad43', ink: '#ffffff', english: 'Poster Design' }
  };
  const categories = data.categories.filter(category => category.id !== 'overview');
  const stack = document.createElement('div');
  stack.className = 'folder-stack';
  dock.append(stack);
  const folders = new Map();
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hint = document.getElementById('cover-hint');
  const updateHint = () => {
    if (hint) hint.textContent = hover.matches ? '移至文件夹，展开作品' : '点击文件夹，展开作品';
  };
  updateHint();
  hover.addEventListener('change', updateHint);
  let active = null, leaveTimer = 0, ignoreFocus = false, keyboard = false;

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const viewerOpen = () => Boolean(document.getElementById('project-dialog')?.open);

  function setActive(id) {
    clearTimeout(leaveTimer);
    if (id && !folders.has(id)) return;
    if (id === active) return;
    active = id;
    hero.classList.toggle('has-active-folder', Boolean(id));
    hero.dataset.activeFolder = id || '';
    folders.forEach((folder, key) => {
      const selected = key === id;
      folder.slot.classList.toggle('is-active', selected);
      folder.tab.setAttribute('aria-expanded', String(selected));
      folder.panel.inert = !selected;
      folder.panel.hidden = !selected;
      folder.panel.setAttribute('aria-hidden', String(!selected));
      if (selected) {
        // Establish the initial popup state before its entry transition.
        folder.panel.classList.remove('is-visible');
        void folder.panel.offsetWidth;
        folder.panel.classList.add('is-visible');
      } else folder.panel.classList.remove('is-visible');
    });
  }

  function dismiss(returnToTab) {
    if (viewerOpen()) return;
    const previous = active && folders.get(active);
    setActive(null);
    if (returnToTab && previous) {
      ignoreFocus = true;
      previous.tab.focus({ preventScroll: true });
      queueMicrotask(() => { ignoreFocus = false; });
    }
  }

  function scheduleDismiss() {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      if (viewerOpen()) return;
      if (keyboard && dock.contains(document.activeElement)) return;
      dismiss(dock.contains(document.activeElement));
    }, 160);
  }

  categories.forEach((category, index) => {
    const palette = colors[category.id] || colors.editorial;
    const pages = data.pages.filter(page => page.categoryId === category.id && page.kind === 'work');
    const slot = make('div', 'folder-slot');
    slot.dataset.categoryId = category.id;
    slot.style.setProperty('--folder-index', String(index));
    slot.style.setProperty('--folder-color', palette.color);
    slot.style.setProperty('--folder-ink', palette.ink);
    slot.style.setProperty('--folder-stagger', ['15px', '2px', '25px', '8px', '20px'][index] || '0px');

    const hit = make('div', 'folder-hit');
    hit.setAttribute('aria-hidden', 'true');
    const front = make('div', 'folder-front');
    front.append(make('span', 'folder-front-title', category.title));
    front.append(make('span', 'folder-front-mark', 'PORTFOLIO\nDESIGN.'));
    hit.append(front);

    const tab = make('button', 'folder-tab');
    tab.type = 'button';
    tab.id = 'folder-tab-' + category.id;
    tab.setAttribute('aria-expanded', 'false');
    tab.setAttribute('aria-controls', 'folder-panel-' + category.id);
    tab.setAttribute('aria-label', '展开' + category.title + '作品');
    tab.append(make('span', 'folder-tab-name', category.title));
    tab.append(make('span', 'folder-tab-english', palette.english));
    slot.append(hit, tab);
    stack.append(slot);

    const panel = make('section', 'folder-panel');
    panel.id = 'folder-panel-' + category.id;
    panel.dataset.categoryId = category.id;
    panel.style.setProperty('--folder-color', palette.color);
    panel.setAttribute('aria-labelledby', tab.id);
    panel.setAttribute('aria-hidden', 'true');
    panel.hidden = true;
    panel.inert = true;
    const heading = make('div', 'folder-panel-heading');
    const labels = make('div', 'folder-panel-labels');
    labels.append(make('h2', 'folder-panel-title', category.title));
    labels.append(make('span', 'folder-panel-count', pages.length + ' 页作品'));
    const close = make('button', 'folder-panel-close', '收起');
    close.type = 'button';
    close.setAttribute('aria-label', '收起' + category.title + '文件夹');
    close.addEventListener('click', () => dismiss(true));
    heading.append(labels, close);
    const grid = make('div', 'folder-preview-grid');
    pages.forEach(page => {
      const button = make('button', 'folder-preview');
      button.type = 'button';
      button.dataset.previewPage = String(page.number);
      button.setAttribute('aria-label', page.title + '，原稿第 ' + page.number + ' 页，点击放大');
      button.title = page.title;
      const image = make('img');
      image.src = page.thumb;
      image.alt = page.title;
      image.width = page.width;
      image.height = page.height;
      image.loading = 'lazy';
      image.decoding = 'async';
      button.append(image);
      button.addEventListener('click', () => {
        if (window.LeeGallery) window.LeeGallery.open(page.number, button);
      });
      grid.append(button);
    });
    const all = make('a', 'folder-view-all', '进入' + category.title);
    all.href = '#category-' + category.id;
    all.addEventListener('click', () => setActive(null));
    panel.append(heading, grid, all);
    slot.append(panel);
    folders.set(category.id, { slot, tab, panel });

    const enter = event => {
      if (event.pointerType === 'mouse' && hover.matches) setActive(category.id);
    };
    tab.addEventListener('pointerenter', enter);
    hit.addEventListener('pointerenter', enter);
    panel.addEventListener('pointerenter', () => clearTimeout(leaveTimer));
    tab.addEventListener('click', event => {
      if (!hover.matches || event.detail === 0) {
        if (active === category.id) dismiss(false); else setActive(category.id);
      } else setActive(category.id);
    });
    hit.addEventListener('click', () => setActive(category.id));
    tab.addEventListener('focus', () => {
      if (!ignoreFocus && keyboard) setActive(category.id);
    });
    panel.addEventListener('focusin', () => {
      if (!ignoreFocus && active !== category.id) setActive(category.id);
    });
  });

  dock.addEventListener('pointerenter', () => clearTimeout(leaveTimer));
  dock.addEventListener('pointerleave', scheduleDismiss);
  dock.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!dock.contains(document.activeElement) && !viewerOpen() && keyboard) dismiss(false);
    }, 0);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') keyboard = true;
    if (event.key === 'Escape' && active && !viewerOpen()) {
      event.preventDefault();
      dismiss(true);
    }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; }, { passive: true });
  document.addEventListener('pointerdown', event => {
    if (active && !dock.contains(event.target) && !viewerOpen()) dismiss(false);
  });
  window.LeeCover = Object.freeze({
    open: setActive,
    close: () => dismiss(true),
    get activeCategory() { return active; },
    counts: Object.freeze(Object.fromEntries(categories.map(category => [category.id, data.pages.filter(page => page.categoryId === category.id && page.kind === 'work').length])))
  });
})();
