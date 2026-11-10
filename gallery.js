(function () {
  'use strict';

  const data = window.LEE_PORTFOLIO;
  const groupsRoot = document.getElementById('portfolio-groups');
  const catalogNav = document.getElementById('catalog-nav');
  const dialog = document.getElementById('project-dialog');
  if (!groupsRoot || !catalogNav || !dialog) return;
  if (!data || !Array.isArray(data.pages) || !data.pages.length) {
    const message = document.createElement('p');
    message.className = 'gallery-load-error';
    message.textContent = '作品目录暂时无法加载，请刷新页面，或打开完整 PDF。';
    groupsRoot.append(message);
    return;
  }

  const sourcePages = data.pages.slice().sort(function (a, b) { return a.number - b.number; });
  const pageByNumber = new Map(sourcePages.map(function (page) { return [page.number, page]; }));
  const physicalOrder = sourcePages.map(function (page) { return page.number; });
  const order = Array.isArray(data.readingOrder) ? data.readingOrder : physicalOrder;
  const validOrder = order.length === sourcePages.length && new Set(order).size === sourcePages.length && order.every(function (number) { return pageByNumber.has(number); });
  if (!validOrder) console.error('The reading order must contain every original PDF page exactly once.');
  const pages = (validOrder ? order : physicalOrder).map(function (number) { return pageByNumber.get(number); });
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const categoryById = new Map(categories.map(function (category) { return [category.id, category]; }));
  const projectById = new Map();
  categories.forEach(function (category) {
    (category.projects || []).forEach(function (project) { projectById.set(project.id, project); });
  });
  let currentIndex = 0;
  let returnFocus = null;
  let returnPageNumber = 1;
  let zoomed = false;
  let resizeFrame = 0;
  const grids = [];
  const gridWidths = new WeakMap();
  const adjacentCache = new Set();

  function make(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function titleForPage(page) {
    const project = projectById.get(page.projectId);
    const category = categoryById.get(page.categoryId);
    return project && project.title || page.title || category && category.title || '设计作品集';
  }

  function pageRange(numbers) {
    if (numbers.length === 1) return '第 ' + numbers[0] + ' 页';
    return '第 ' + numbers[0] + '–' + numbers[numbers.length - 1] + ' 页';
  }

  // Grid auto-placement remains sparse and row-first. The DOM and the visual
  // top-to-bottom order therefore both follow the original PDF sequence.
  function layoutGrid(grid) {
    const columns = window.innerWidth <= 340 ? 1 : window.innerWidth <= 700 ? 2 : 3;
    const width = grid.getBoundingClientRect().width;
    if (width <= 0) return;
    const previous = gridWidths.get(grid);
    if (previous && Math.abs(previous.width - width) < 0.5 && previous.columns === columns) return;
    gridWidths.set(grid, { width: width, columns: columns });
    grid.style.setProperty('--masonry-columns', String(columns));
    grid.dataset.columns = String(columns);
    const unit = 4;
    const gap = 4;
    const columnWidth = (width - gap * (columns - 1)) / columns;
    const tiles = Array.from(grid.children);
    tiles.forEach(function (tile, index) {
      const span = tiles.length === 1 ? columns : index === 0 ? Math.min(columns, 2) : 1;
      const ratio = Number(tile.dataset.ratio) || 16 / 9;
      const imageWidth = columnWidth * span + gap * (span - 1);
      const imageHeight = imageWidth / ratio;
      const rowSpan = Math.max(1, Math.ceil((imageHeight + gap) / (unit + gap)));
      tile.style.gridColumn = 'span ' + span;
      tile.style.gridRowEnd = 'span ' + rowSpan;
      const image = tile.querySelector('img');
      if (image) image.sizes = Math.ceil(imageWidth) + 'px';
    });
  }

  const observedSections = [];
  const fragment = document.createDocumentFragment();
  categories.forEach(function (category) {
    const categoryPages = pages.filter(function (page) { return page.categoryId === category.id; });
    if (!categoryPages.length) return;
    const section = make('section', 'portfolio-group');
    section.id = 'category-' + category.id;
    section.dataset.categoryId = category.id;
    const heading = make('header', 'portfolio-group__heading');
    const labels = make('div', 'portfolio-group__labels');
    const title = make('h3', 'portfolio-group__title', category.title);
    title.id = section.id + '-title';
    section.setAttribute('aria-labelledby', title.id);
    labels.append(title);
    if (category.english) labels.append(make('span', 'portfolio-group__english', category.english));
    const numbers = categoryPages.map(function (page) { return page.number; });
    heading.append(labels, make('p', 'portfolio-group__range', pageRange(numbers)));
    section.append(heading);

    const projects = (category.projects || []).filter(function (project) {
      return Array.isArray(project.pageNumbers) && project.pageNumbers.some(function (n) { return pageByNumber.has(n); });
    });
    if (projects.length) {
      const links = make('ul', 'portfolio-projects');
      links.setAttribute('aria-label', category.title + '项目');
      projects.forEach(function (project) {
        const start = project.pageNumbers.find(function (n) { return pageByNumber.has(n); });
        const item = make('li');
        const link = make('a', '', project.title);
        link.href = '#pdf-page-' + start;
        item.append(link);
        links.append(item);
      });
      section.append(links);
    }

    const grid = make('div', 'masonry');
    grid.dataset.categoryId = category.id;
    categoryPages.forEach(function (page) {
      const tile = make('button', 'masonry__item');
      tile.id = 'pdf-page-' + page.number;
      tile.type = 'button';
      tile.dataset.pageNumber = String(page.number);
      const ratio = Number(page.width) / Number(page.height);
      tile.dataset.ratio = String(Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9);
      const label = titleForPage(page) + '，PDF 第 ' + page.number + ' 页，点击放大';
      tile.setAttribute('aria-label', label);
      tile.title = label;
      const image = make('img', 'masonry__image');
      image.alt = (page.title || titleForPage(page)) + '，第 ' + page.number + ' 页';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = Math.round(Number(page.width) || 1065);
      image.height = Math.round(Number(page.height) || 600);
      image.src = page.thumb;
      image.srcset = page.thumb + ' ' + (Number(page.thumbWidth) || 768) + 'w, ' + page.image + ' ' + (Number(page.width) || 2560) + 'w';
      tile.append(image);
      tile.addEventListener('click', function () { openPage(page.number, tile); });
      grid.append(tile);
    });
    section.append(grid);
    grids.push(grid);
    fragment.append(section);
    observedSections.push(section);
    const link = make('a', 'catalog-nav__link', category.title);
    link.href = '#' + section.id;
    link.dataset.categoryId = category.id;
    catalogNav.append(link);
  });
  groupsRoot.append(fragment);

  // Every original page must appear exactly once. Do not silently hide a page
  // if the catalogue data and the page mapping diverge.
  const rendered = Array.from(groupsRoot.querySelectorAll('[data-page-number]')).map(function (tile) { return Number(tile.dataset.pageNumber); });
  const expected = pages.map(function (page) { return page.number; });
  if (rendered.length !== expected.length || rendered.some(function (number, index) { return number !== expected[index]; })) {
    console.error('The portfolio catalogue does not preserve every original PDF page in order.');
    groupsRoot.dataset.coverageError = 'true';
  }

  const sheet = make('div', 'project-dialog__sheet');
  const dialogHeading = make('header', 'project-dialog__heading');
  const titleGroup = make('div', 'project-dialog__title-group');
  const projectTitle = make('h3', 'project-dialog__title');
  projectTitle.id = 'project-dialog-title';
  const subtitle = make('p', 'project-dialog__subtitle');
  titleGroup.append(projectTitle, subtitle);
  const closeButton = make('button', 'project-dialog__close', '关闭');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '关闭作品查看');
  closeButton.autofocus = true;
  dialogHeading.append(titleGroup, closeButton);

  const figure = make('figure', 'project-dialog__figure');
  const viewport = make('div', 'project-dialog__viewport');
  const fullImage = make('img', 'project-dialog__image');
  fullImage.decoding = 'async';
  fullImage.fetchPriority = 'high';
  const error = make('p', 'project-dialog__error', '这页图片暂时无法加载，请稍后重试，或打开完整 PDF。');
  error.hidden = true;
  viewport.append(fullImage, error);
  const caption = make('figcaption', 'project-dialog__caption');
  figure.append(viewport, caption);

  const footer = make('div', 'project-dialog__footer');
  const previous = make('button', 'project-dialog__step', '上一页');
  previous.type = 'button';
  previous.setAttribute('aria-label', '查看上一页作品');
  const position = make('span', 'project-dialog__position');
  position.setAttribute('aria-live', 'polite');
  position.setAttribute('aria-atomic', 'true');
  const next = make('button', 'project-dialog__step', '下一页');
  next.type = 'button';
  next.setAttribute('aria-label', '查看下一页作品');
  const zoomButton = make('button', 'project-dialog__step project-dialog__zoom', '放大细节');
  zoomButton.type = 'button';
  zoomButton.setAttribute('aria-pressed', 'false');
  const originalLink = make('a', 'project-dialog__original', '新窗口查看');
  originalLink.target = '_blank';
  originalLink.rel = 'noopener';
  footer.append(previous, position, next, zoomButton, originalLink);
  sheet.append(dialogHeading, figure, footer);
  dialog.append(sheet);
  dialog.setAttribute('aria-labelledby', projectTitle.id);

  function setZoom(value) {
    zoomed = value;
    viewport.classList.toggle('is-zoomed', value);
    zoomButton.setAttribute('aria-pressed', String(value));
    zoomButton.textContent = value ? '适应窗口' : '放大细节';
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
  }

  function preloadAdjacent(index) {
    [index - 1, index + 1].forEach(function (nearby) {
      if (nearby < 0 || nearby >= pages.length) return;
      const source = pages[nearby].image;
      if (!source || adjacentCache.has(source)) return;
      adjacentCache.add(source);
      const image = new Image();
      image.decoding = 'async';
      image.src = source;
    });
  }

  function updateView(index) {
    currentIndex = Math.min(pages.length - 1, Math.max(0, index));
    const page = pages[currentIndex];
    const category = categoryById.get(page.categoryId);
    projectTitle.textContent = titleForPage(page);
    subtitle.textContent = (category ? category.title + ' · ' : '') + '原稿第 ' + page.number + ' 页';
    caption.textContent = (page.title || titleForPage(page)) + ' · PDF 第 ' + page.number + ' 页';
    error.hidden = true;
    fullImage.hidden = false;
    fullImage.src = page.image;
    fullImage.alt = (page.title || titleForPage(page)) + '，PDF 第 ' + page.number + ' 页';
    viewport.style.setProperty('--original-width', Math.round(Number(page.width) || 2560) + 'px');
    originalLink.href = page.image;
    position.textContent = (currentIndex + 1) + ' / ' + pages.length;
    previous.disabled = currentIndex === 0;
    next.disabled = currentIndex === pages.length - 1;
    dialog.dataset.pageNumber = String(page.number);
    dialog.dataset.view = String(page.number);
    setZoom(false);
    preloadAdjacent(currentIndex);
  }

  function openPage(number, trigger) {
    const index = pages.findIndex(function (page) { return page.number === number; });
    if (index < 0) return;
    returnPageNumber = number;
    returnFocus = trigger || (groupsRoot.contains(document.activeElement) ? document.activeElement : groupsRoot.querySelector('[data-page-number="' + number + '"]'));
    updateView(index);
    if (!dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add('gallery-dialog-open');
      closeButton.focus({ preventScroll: true });
    }
  }

  function closeView() {
    if (dialog.open) dialog.close();
  }

  fullImage.addEventListener('load', function () { error.hidden = true; });
  fullImage.addEventListener('error', function () { error.hidden = false; fullImage.hidden = true; });
  closeButton.addEventListener('click', closeView);
  previous.addEventListener('click', function () { updateView(currentIndex - 1); });
  next.addEventListener('click', function () { updateView(currentIndex + 1); });
  zoomButton.addEventListener('click', function () { setZoom(!zoomed); });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault(); updateView(currentIndex - 1);
    } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault(); updateView(currentIndex + 1);
    } else if (event.key === 'Home') {
      event.preventDefault(); updateView(0);
    } else if (event.key === 'End') {
      event.preventDefault(); updateView(pages.length - 1);
    }
  });
  dialog.addEventListener('click', function (event) {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeView();
  });
  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('gallery-dialog-open');
    setZoom(false);
    fullImage.removeAttribute('src');
    const replacement = groupsRoot.querySelector('[data-page-number="' + returnPageNumber + '"]');
    const target = returnFocus && returnFocus.isConnected ? returnFocus : replacement;
    if (target && target !== document.body) target.focus({ preventScroll: true });
  });

  function layoutAll() {
    resizeFrame = 0;
    grids.forEach(layoutGrid);
  }
  function scheduleLayout() {
    if (!resizeFrame) resizeFrame = window.requestAnimationFrame(layoutAll);
  }
  addEventListener('resize', scheduleLayout, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleLayout);
    grids.forEach(function (grid) { observer.observe(grid); });
  }
  let navigationFrame = 0;
  function updateNavigation() {
    navigationFrame = 0;
    const line = catalogNav.getBoundingClientRect().bottom + 100;
    let current = observedSections[0];
    observedSections.forEach(function (section) {
      const heading = section.querySelector('.portfolio-group__heading');
      if (heading && heading.getBoundingClientRect().top <= line) current = section;
    });
    if (!current) return;
    catalogNav.querySelectorAll('a').forEach(function (link) {
      if (link.dataset.categoryId === current.dataset.categoryId) {
        link.setAttribute('aria-current', 'location');
        const navBounds = catalogNav.getBoundingClientRect();
        const linkBounds = link.getBoundingClientRect();
        const edge = 16;
        if (linkBounds.left < navBounds.left + edge) {
          catalogNav.scrollLeft += linkBounds.left - navBounds.left - edge;
        } else if (linkBounds.right > navBounds.right - edge) {
          catalogNav.scrollLeft += linkBounds.right - navBounds.right + edge;
        }
      } else link.removeAttribute('aria-current');
    });
  }
  function scheduleNavigation() {
    if (!navigationFrame) navigationFrame = window.requestAnimationFrame(updateNavigation);
  }
  addEventListener('scroll', scheduleNavigation, { passive: true });
  addEventListener('resize', scheduleNavigation, { passive: true });
  updateNavigation();
  layoutAll();
  const work = document.getElementById('work');
  if (work) work.dataset.galleryReady = 'true';
  window.LeeGallery = Object.freeze({
    open: function (pageNumber) { openPage(Number.isInteger(pageNumber) ? pageNumber : 1); },
    close: closeView,
    viewCount: pages.length,
    pageCount: pages.length
  });
}());
