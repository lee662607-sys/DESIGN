(function () {
  'use strict';

  const masonry = document.getElementById('masonry');
  const dialog = document.getElementById('project-dialog');
  if (!masonry || !dialog) return;

  // Every view belongs to the same publication. Assets are reused for the
  // initial layout preview; these are not six separate portfolio projects.
  const views = [
    { image: 'assets/cover-portrait.png', title: '封面与装帧', ratio: 0.75 },
    { image: 'assets/map.png', title: '地图跨页', ratio: 1.48 },
    { image: 'assets/timeline.png', title: '时间线跨页', ratio: 1.16 },
    { image: 'assets/timeline.png', title: '时间线跨页', ratio: 1.62 },
    { image: 'assets/cover.png', title: '封面与装帧', ratio: 1.48 },
    { image: 'assets/map.png', title: '地图跨页', ratio: 1.52 }
  ];

  let columnCount = 0;
  let currentView = 0;
  let returnFocus = null;
  let returnIndex = 0;

  const make = function (tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };

  const sheet = make('div', 'project-dialog__sheet');
  const heading = make('header', 'project-dialog__heading');
  const titleGroup = make('div', 'project-dialog__title-group');
  const projectTitle = make('h3', 'project-dialog__title', '图鉴湘江');
  projectTitle.id = 'project-dialog-title';
  const subtitle = make('p', 'project-dialog__subtitle', '湖南湘江新区成立十周年纪念画册');
  titleGroup.append(projectTitle, subtitle);

  const closeButton = make('button', 'project-dialog__close', '关闭');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '关闭作品预览');
  closeButton.autofocus = true;
  heading.append(titleGroup, closeButton);

  const figure = make('figure', 'project-dialog__figure');
  const fullImage = make('img', 'project-dialog__image');
  fullImage.decoding = 'async';
  const caption = make('figcaption', 'project-dialog__caption');
  figure.append(fullImage, caption);

  const footer = make('div', 'project-dialog__footer');
  const previous = make('button', 'project-dialog__step', '上一张');
  previous.type = 'button';
  previous.setAttribute('aria-label', '查看上一张作品图片');
  const position = make('span', 'project-dialog__position');
  position.setAttribute('aria-live', 'polite');
  position.setAttribute('aria-atomic', 'true');
  const next = make('button', 'project-dialog__step', '下一张');
  next.type = 'button';
  next.setAttribute('aria-label', '查看下一张作品图片');
  footer.append(previous, position, next);
  sheet.append(heading, figure, footer);
  dialog.append(sheet);
  dialog.setAttribute('aria-labelledby', projectTitle.id);

  function updateView(index) {
    currentView = (index + views.length) % views.length;
    const view = views[currentView];
    fullImage.src = view.image;
    fullImage.alt = '图鉴湘江纪念画册，' + view.title + '，版式预览素材';
    caption.textContent = view.title;
    position.textContent = (currentView + 1) + ' / ' + views.length;
    dialog.dataset.view = String(currentView);
  }

  function openView(index, trigger) {
    returnIndex = index;
    returnFocus = trigger || document.activeElement;
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

  closeButton.addEventListener('click', closeView);
  previous.addEventListener('click', function () { updateView(currentView - 1); });
  next.addEventListener('click', function () { updateView(currentView + 1); });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateView(currentView - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateView(currentView + 1);
    }
    // Escape is handled by the native dialog cancel/close interaction.
  });
  dialog.addEventListener('click', function (event) {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) closeView();
  });
  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('gallery-dialog-open');
    const replacement = masonry.querySelector('[data-view-index="' + returnIndex + '"]');
    const target = returnFocus && returnFocus.isConnected ? returnFocus : replacement;
    if (target) target.focus({ preventScroll: true });
  });

  function columnsForWidth() {
    return window.innerWidth <= 340 ? 1 : window.innerWidth <= 700 ? 2 : 3;
  }

  function renderMasonry() {
    const count = columnsForWidth();
    if (count === columnCount) return;
    columnCount = count;
    const focused = document.activeElement;
    const focusedIndex = focused && focused.dataset ? focused.dataset.viewIndex : undefined;
    const restoreTileFocus = focusedIndex !== undefined && masonry.contains(focused);
    const columns = [];
    const heights = Array(count).fill(0);
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < count; index += 1) {
      const column = make('div', 'masonry__column');
      columns.push(column);
      fragment.append(column);
    }

    views.forEach(function (view, index) {
      const columnIndex = heights.indexOf(Math.min.apply(null, heights));
      const tile = make('button', 'masonry__item');
      tile.type = 'button';
      tile.dataset.viewIndex = String(index);
      tile.style.setProperty('--tile-ratio', String(view.ratio));
      const label = '图鉴湘江 · ' + view.title + '，打开视图 ' + (index + 1);
      tile.setAttribute('aria-label', label);
      tile.title = label;
      const image = make('img', 'masonry__image');
      image.src = view.image;
      image.alt = '图鉴湘江纪念画册，' + view.title + '，版式预览素材';
      image.loading = 'lazy';
      image.decoding = 'async';
      tile.append(image);
      tile.addEventListener('click', function () { openView(index, tile); });
      columns[columnIndex].append(tile);
      heights[columnIndex] += 1 / view.ratio + 0.008;
    });

    masonry.replaceChildren(fragment);
    masonry.style.setProperty('--masonry-columns', String(count));
    masonry.dataset.columns = String(count);
    if (restoreTileFocus) {
      const replacement = masonry.querySelector('[data-view-index="' + focusedIndex + '"]');
      if (replacement) replacement.focus({ preventScroll: true });
    }
  }

  let resizeScheduled = false;
  window.addEventListener('resize', function () {
    if (resizeScheduled) return;
    resizeScheduled = true;
    window.requestAnimationFrame(function () {
      resizeScheduled = false;
      renderMasonry();
    });
  }, { passive: true });

  renderMasonry();
  const work = document.getElementById('work');
  if (work) work.dataset.galleryReady = 'true';

  window.LeeGallery = Object.freeze({
    open: function (index) { openView(Number.isInteger(index) ? index : 0); },
    close: closeView,
    viewCount: views.length
  });
}());
