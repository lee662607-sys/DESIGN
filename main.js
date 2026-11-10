(() => {
  'use strict';
  const root = document.documentElement;
  const sequence = document.getElementById('intro');
  const world = document.getElementById('card-world');
  const left = document.querySelector('.hero-caption-left');
  const right = document.querySelector('.hero-caption-right');
  const planeTitle = document.querySelector('.plane-caption');
  const toggle = document.getElementById('motion-toggle');
  const replay = document.getElementById('motion-replay');
  const indicators = [...document.querySelectorAll('.scene-indicator i')];
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const assets = ['assets/cover-portrait.png', 'assets/map.png', 'assets/timeline.png'];
  let reduced = preference.matches, paused = reduced, started = performance.now(), idleTime = 0;
  let last = performance.now(), lastDraw = -1, lastProgress = -1, dirty = true;
  let width = innerWidth, height = innerHeight, count = 0, cards = [];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function build() {
    width = innerWidth; height = innerHeight;
    const n = width < 760 ? 30 : 48;
    if (n !== count) {
      count = n; world.replaceChildren();
      cards = Array.from({ length: n }, (_, i) => {
        const el = document.createElement('div');
        el.className = 'art-card';
        const img = new Image(); img.src = assets[i % assets.length]; img.alt = ''; img.decoding = 'async';
        el.append(img); world.append(el);
        return { el, i, seed: random(i + 1), r2: random(i + 101), r3: random(i + 201) };
      });
    }
    dirty = true;
  }

  function positions(c, t) {
    const mobile = width < 760, i = c.i;
    const w = Math.min(width, 1800), h = Math.min(height, 1100);
    const scatter = {
      x: (c.seed - .5) * w * 1.1,
      y: (c.r2 - .5) * h * .91 + 20,
      z: (c.r3 - .5) * 310,
      rx: (c.r2 - .5) * 48,
      ry: (c.r3 - .5) * 95,
      rz: (c.seed - .5) * 60,
      scale: .67 + c.r3 * .6
    };
    const angle = (i / count) * Math.PI * 2 + t * .075;
    const radius = mobile ? Math.min(width * .34, 180) : Math.min(w * .225, 320);
    const ring = {
      x: Math.sin(angle) * radius,
      y: Math.cos(angle) * (mobile ? 12 : 25) + Math.sin(angle * 2) * 7 + 30,
      z: Math.cos(angle) * radius * .67,
      rx: -8 + Math.sin(angle) * 5,
      ry: angle * 180 / Math.PI + 90,
      rz: Math.sin(angle) * 3,
      scale: mobile ? 1.10 + c.r3 * .12 : 1.27 + c.r3 * .18
    };
    const columns = mobile ? 6 : 8;
    let px = (i % columns - (columns - 1) / 2) * (mobile ? 75 : 116);
    let py = (Math.floor(i / columns) - (Math.ceil(count / columns) - 1) / 2) * (mobile ? 101 : 155);
    const rz = -.32, rx = .91;
    const sx = px * Math.cos(rz) - py * Math.sin(rz);
    const sy = px * Math.sin(rz) + py * Math.cos(rz);
    const plane = {
      x: sx - (mobile ? width * .29 : width * .24),
      y: sy * Math.cos(rx) + (mobile ? 90 : 55),
      z: sy * Math.sin(rx) - 65,
      rx: 52,
      ry: 0,
      rz: -18,
      scale: mobile ? .98 : 1.04
    };
    if (!reduced) {
      scatter.x += Math.sin(t * .45 + i * 1.9) * (mobile ? 8 : 18);
      scatter.y += Math.cos(t * .4 + i * 1.3) * 13;
      scatter.ry += Math.sin(t * .35 + i * .7) * 16;
      scatter.rz += Math.sin(t * .3 + i) * 5;
    }
    return { scatter, ring, plane };
  }

  function update(now) {
    requestAnimationFrame(update);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    const total = Math.max(1, sequence.offsetHeight - height);
    const progress = clamp((scrollY - sequence.offsetTop) / total);
    const inView = scrollY < sequence.offsetTop + sequence.offsetHeight && !document.hidden;
    if (!paused && !reduced && inView) idleTime += dt;
    const entering = !reduced && !paused && (now - started) < 1550 && progress < .01;
    if (!dirty && !entering && ((!inView) || ((paused || reduced) && Math.abs(progress - lastProgress) < .0001))) return;
    if (now - lastDraw < 1000 / 45 && !dirty) return;
    lastDraw = now; lastProgress = progress; dirty = false;
    const ringBlend = smooth(progress / .37);
    const planeBlend = smooth((progress - .43) / .43);
    const introBlend = entering ? 1 - smooth((now - started) / 1500) : 0;
    const toRing = reduced ? 0 : Math.max(ringBlend, introBlend);
    const toPlane = reduced ? 0 : planeBlend;
    for (const card of cards) {
      const pos = positions(card, idleTime);
      const values = {};
      for (const key of ['x', 'y', 'z', 'rx', 'ry', 'rz', 'scale']) {
        values[key] = mix(mix(pos.scatter[key], pos.ring[key], toRing), pos.plane[key], toPlane);
      }
      card.el.style.transform = `translate(-50%,-50%) translate3d(${values.x.toFixed(2)}px,${values.y.toFixed(2)}px,${values.z.toFixed(2)}px) rotateX(${values.rx.toFixed(2)}deg) rotateY(${values.ry.toFixed(2)}deg) rotateZ(${values.rz.toFixed(2)}deg) scale(${values.scale.toFixed(3)})`;
    }
    const typeOpacity = 1 - smooth(toRing * 1.5);
    left.style.opacity = right.style.opacity = typeOpacity.toFixed(3);
    left.style.transform = `translateX(${-35 * (1 - typeOpacity)}px)`;
    right.style.transform = `translateX(${35 * (1 - typeOpacity)}px)`;
    planeTitle.style.opacity = smooth((toPlane - .25) / .7).toFixed(3);
    planeTitle.style.transform = `translateY(${20 * (1 - toPlane)}px)`;
    const phase = toPlane > .45 ? 2 : toRing > .6 ? 1 : 0;
    indicators.forEach((el, i) => el.classList.toggle('active', i === phase));
    sequence.dataset.phase = ['scatter', 'ring', 'plane'][phase];
    sequence.dataset.progress = progress.toFixed(3);
  }

  function setPause(value) {
    paused = value;
    toggle.setAttribute('aria-pressed', String(value));
    toggle.setAttribute('aria-label', value ? '继续漂浮动画' : '暂停漂浮动画');
    toggle.title = value ? '继续漂浮动画' : '暂停漂浮动画';
    dirty = true;
  }
  toggle.addEventListener('click', () => setPause(!paused));
  replay.addEventListener('click', () => {
    root.style.scrollBehavior = 'auto'; window.scrollTo(0, 0);
    root.style.removeProperty('scroll-behavior');
    started = performance.now(); idleTime = 0; setPause(reduced);
  });
  preference.addEventListener('change', event => { reduced = event.matches; setPause(reduced); });
  addEventListener('resize', build, { passive: true });
  addEventListener('scroll', () => { dirty = true; }, { passive: true });
  document.addEventListener('visibilitychange', () => { dirty = true; });
  build(); setPause(paused); requestAnimationFrame(update);
})();
