/* 04 · Five recorded runs: an at-a-glance verdict overview that doubles as the case selector,
   and a one-screen player (stage, answer comparison, run chain) that plays on its own. */
(() => {
  const root = document.getElementById('sc-root');
  const RUNS = window.SW_RUNS || [];
  const SW = window.SW;
  if (!root || !RUNS.length || !SW) return;
  const { BENCH, BB, reduced, anim, fmt } = SW;
  const SOL = BB[0];
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------------- helpers ---------------- */
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const sv = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const plain = s => String(s).replace(/<[^>]+>/g, '');
  const nwords = s => plain(s).trim().split(/\s+/).length;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const still = () => reduced.matches;
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ICON = {
    x: '<svg class="sc-ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg>',
    v: '<svg class="sc-ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.4 6.3l2.4 2.4 4.8-5.1"/></svg>',
    bang: '<svg class="sc-ic" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.6"/><path d="M6 3.6v2.9M6 8.4v.1"/></svg>',
    play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>',
    pause: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>',
  };
  const FLOWS = new Set(['camera_motion', 'measure_pair', 'relation_readout']);
  const TOOLS = new Set(['reconstruct_scene', 'detect_objects', 'estimate_depth', 'inspect_image', 'query_points', 'relative_position', 'segment_region', 'measure_distance', 'box_depth', 'turn_sequence', 'answer_check', 'near_touch_guard']);
  const kindOf = name => FLOWS.has(name) ? 'sc-flow' : TOOLS.has(name) ? 'sc-tool' : '';
  /* colour tool and workflow names by kind inside trusted caption HTML */
  const tint = html => html.replace(/<code>([^<]+)<\/code>/g, (m, t) => `<code class="${kindOf(t)}">${t}</code>`);
  const codeify = text => esc(text).replace(/\b[a-z]+(?:_[a-z]+)+\b/g, t => `<code class="${kindOf(t)}">${t}</code>`);
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  /* 'Workflow · camera_motion' -> kind in small caps, the part's own name as written (code names in mono) */
  const compHTML = c => { const [kind, name = ''] = c.label.split(' · '); return `<span class="sc-ckind">${esc(kind)}</span>${name ? ` <span class="sc-cname${/_/.test(name) ? ' sc-cmono' : ''}">${esc(name)}</span>` : ''}`; };

  /* ---------------- skeleton ---------------- */
  root.innerHTML = '';
  const bar = el('div', 'sc-bar');
  bar.innerHTML = `<span class="sc-model">Same frozen ${esc(SOL.name)}</span><span class="sc-keys"><span class="sc-key sc-key-x">${ICON.x}Base model alone</span><span class="sc-key sc-key-v">${ICON.v}With SpatialWeave</span></span>`;
  const playBtn = el('button', 'sc-play'); playBtn.type = 'button';
  bar.appendChild(playBtn);

  const list = el('div', 'sc-cases');
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Recorded runs: base model alone versus with SpatialWeave');
  const tiles = RUNS.map((r, i) => {
    const b = el('button', 'sc-case');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<img class="sc-thumb" src="${r.dir + r.thumb}" alt="" decoding="async"><span class="sc-cbody"><span class="sc-cbench sc-ck-${r.comp ? r.comp.k : 'tool'}">${r.comp ? compHTML(r.comp) : esc(r.bench)}</span><span class="sc-ctask">${esc(r.task).replace(/ (\S+)$/, '\u00a0$1')}</span></span>` +
      `<span class="sc-verdict"><span class="sc-vb">${ICON.x}<span>${esc(r.vb)}</span></span><span class="sc-to" aria-hidden="true">→</span><span class="sc-vs">${ICON.v}<span>${esc(r.vs)}</span></span></span>` +
      `<span class="sc-prog" aria-hidden="true"><i></i></span>`;
    b.setAttribute('aria-label', `${r.comp ? r.comp.label + '. ' : ''}${r.bench}. ${r.task} Base model alone: ${r.vb}, wrong. With SpatialWeave: ${r.vs}, correct.`);
    b.addEventListener('click', () => { manual(); select(i, still() ? RUNS[i].steps.length - 1 : 0, true); });
    list.appendChild(b);
    return b;
  });

  const th = el('div', 'sc-theater');
  th.innerHTML = `
    <figure class="sc-fig">
      <div class="sc-stage">
        <div class="sc-layer"></div><div class="sc-layer"></div>
        <div class="sc-layer sc-gl"><canvas class="sc-canvas" tabindex="-1" role="img" aria-label="Interactive 3D reconstruction"></canvas></div>
        <span class="sc-badge" hidden></span>
        <span class="sc-hint" hidden></span>
      </div>
      <figcaption class="sc-scap"></figcaption>
      <div class="sc-photos" role="group" aria-label="Input photos"></div>
    </figure>
    <div class="sc-head"><p class="sc-meta"></p><p class="sc-q"></p><details class="sc-full"><summary>Full question</summary><p class="sc-fullq"></p></details></div>
    <div class="sc-cmp"></div>
    <div class="sc-wo"></div>
    <div class="sc-why"><div class="sc-whyl"><p class="sc-lab">Why it worked</p><p class="sc-whyt"></p></div><figure class="sc-rule"></figure></div>
    <p class="sc-ctx"></p>
    <div class="sc-foot"><p class="sc-foothead"><span class="sc-lab">The run</span><span class="sc-kinds"></span></p><div class="sc-chainwrap"><ol class="sc-chain" aria-label="Steps of this run"></ol></div><p class="sc-caption"><span class="sc-stepno"></span><span class="sc-ctext"></span></p></div>`;
  root.append(bar, list, th);

  const $ = s => th.querySelector(s);
  const stage = $('.sc-stage'), scap = $('.sc-scap'), badge = $('.sc-badge'), hint = $('.sc-hint');
  const [layA, layB] = th.querySelectorAll('.sc-layer:not(.sc-gl)');
  const layGL = $('.sc-gl'), canvas = $('.sc-canvas');
  const metaEl = $('.sc-meta'), qEl = $('.sc-q'), full = $('.sc-full'), fullq = $('.sc-fullq');
  const cmp = $('.sc-cmp'), why = $('.sc-why'), whyT = $('.sc-whyt'), ctx = $('.sc-ctx');
  const chain = $('.sc-chain'), caption = $('.sc-caption'), stepNo = $('.sc-stepno'), ctext = $('.sc-ctext');
  const head = $('.sc-head'), kindsEl = $('.sc-kinds');
  const wo = $('.sc-wo'), ruleEl = $('.sc-rule'), photosEl = $('.sc-photos');

  /* ---------------- state ---------------- */
  let manifest = null;
  const cur = { c: -1, s: 0 };
  /* autoplay: on = the reader's choice (Play/Pause); holds = temporary pauses; clock = the progress-bar
     animation of the current step, which doubles as its timer */
  const A = { on: !still(), holds: new Set(document.hidden ? ['offscreen', 'hidden'] : ['offscreen']), clock: null, fill: null };

  /* per-step dwell: the decisive step holds longest (its diagram is the point), then the answer; others by caption length */
  function dwell(c, s) {
    const r = RUNS[c], st = r.steps[s];
    if (st.key) return 5200;                        // the decisive step: time to read its diagram
    if (s === r.steps.length - 1) return 4400;      // the answer, next to the base model's ghost
    return clamp(2000 + nwords(st.text) * 70, 2800, 3600);
  }

  /* ---------------- answer comparison ---------------- */
  function buildChoice(r) {
    const rows = r.options.filter(([L]) => L === r.pick.base || L === r.pick.sw || L === r.pick.truth).map(([L, t]) => {
      const b = L === r.pick.base, w = L === r.pick.sw;
      const tag = b ? `<span class="sc-tag sc-t-bad">${ICON.x}<span class="sc-tagtxt">Base model</span><span class="sc-vh">, wrong</span></span>` : w ? `<span class="sc-tag sc-t-ok">${ICON.v}<span class="sc-tagtxt">SpatialWeave</span><span class="sc-vh">, correct</span></span>` : '<span></span>';
      return `<li class="sc-opt${b ? ' sc-base' : ''}${w ? ' sc-sw' : ''}"><span class="sc-letter">${L}</span><span class="sc-otext">${esc(t)}</span>${tag}</li>`;
    }).join('');
    return `<p class="sc-lab">Answers</p><ol class="sc-opts">${rows}</ol>`;
  }
  function buildNumber(r) {
    const m = r.num, pc = v => ((v - m.min) / (m.max - m.min) * 100).toFixed(2) + '%';
    const span = (a, b) => `left:${pc(Math.min(a, b))};width:${(Math.abs(b - a) / (m.max - m.min) * 100).toFixed(2)}%`;
    const grid = m.ticks.slice(1, -1).map(t => `<i class="sc-ngrid" style="left:${pc(t)}"></i>`).join('');
    const row = (name, v, text, note, icon, sr) => `<span class="sc-nname">${name}</span>` +
      `<div class="sc-ntrack">${grid}<i class="sc-nerr" style="${span(v, m.truth)}"></i><i class="sc-ntruth" style="left:${pc(m.truth)}"></i><b class="sc-ndot" style="left:${pc(v)}"></b></div>` +
      `<span class="sc-nval"><b>${icon}${esc(text)}<span class="sc-vh">, ${sr}</span></b>${note ? `<small>${esc(note)}</small>` : ''}</span>`;
    return `<p class="sc-lab">Answers, in ${m.unit === 'm' ? 'meters' : 'centimeters'}</p><div class="sc-num">` +
      `<span></span><div class="sc-ntrack sc-nticks">${m.ticks.map(t => `<span class="sc-ntick" style="left:${pc(t)}">${t}</span>`).join('')}</div><span></span>` +
      `<div class="sc-nrow sc-nbase">${row('Base model', m.base, m.baseText, m.baseNote, ICON.x, 'wrong')}</div>` +
      `<div class="sc-nrow sc-nsw">${row('SpatialWeave', m.sw, m.swText, m.swNote, ICON.v, 'correct')}</div>` +
      `<span></span><div class="sc-ntrack sc-nfoot"><span class="sc-ntlab" style="left:${pc(m.truth)}">truth ${esc(m.truthText)}</span></div><span></span></div>`;
  }
  function animateCmp() {
    if (still()) return;
    cmp.querySelectorAll('.sc-opt').forEach((o, i) => anim(o, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 60 + i * 55 }));
    cmp.querySelectorAll('.sc-tag').forEach(t => anim(t, [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: t.closest('.sc-sw') ? 520 : 300 }));
    cmp.querySelectorAll('.sc-ndot').forEach((d, i) => {
      const track = d.parentElement, w = track.getBoundingClientRect().width, x = parseFloat(d.style.left) / 100 * w;
      anim(d, [{ transform: `translateX(${-x}px)`, opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: 820, delay: 120 + i * 160 });
    });
    cmp.querySelectorAll('.sc-nerr').forEach((e, i) => anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 700 + i * 160 }));
  }

  /* ---------------- run chain ---------------- */
  function buildChain(r) {
    chain.innerHTML = '';
    const n = r.steps.length;
    r.steps.forEach((st, i) => {
      const li = el('li');
      const b = el('button', `sc-step sc-k-${st.k}${st.key ? ' sc-keyed' : ''}`);
      b.type = 'button';
      b.dataset.i = i;
      const pre = st.k === 'ans' ? ICON.v : st.k === 'bad' ? ICON.bang : '';
      b.innerHTML = `${pre}<span>${esc(st.chip)}</span><i class="sc-sfill" aria-hidden="true"></i>`;
      const used = st.chips.map(x => x[1]);
      b.title = used.length ? used.join(', ') : st.label;
      b.setAttribute('aria-label', `${st.chip}: step ${i + 1} of ${n}, ${st.label}${used.length ? ' (' + used.join(', ') + ')' : ''}${st.key ? ', the decisive step' : ''}`);
      b.addEventListener('click', () => { manual(); setStep(i, true); });
      b.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const j = clamp(i + d, 0, n - 1);
        manual(); setStep(j, true);
        chain.querySelectorAll('.sc-step')[j].focus({ preventScroll: true });
      });
      li.appendChild(b);
      chain.appendChild(li);
    });
    markRowEnds();
  }
  /* a wrapped chain drops the connector after the last chip of each row */
  function markRowEnds() {
    const items = [...chain.children];
    /* compare vertical centres: chips of different heights share a row but not a top edge */
    const mid = n => n.offsetTop + n.offsetHeight / 2;
    items.forEach((li, i) => { const next = items[i + 1]; li.classList.toggle('sc-rowend', !!next && mid(next) > mid(li) + 8); });
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => markRowEnds()).observe(chain);
  /* the growing chip can move a wrap point: re-mark the rows once it has settled */
  chain.addEventListener('transitionend', e => { if (e.propertyName === 'font-size') markRowEnds(); });
  const chainWrap = () => chain.parentElement;
  function chainEdges() {
    const over = chain.scrollWidth > chain.clientWidth + 1;
    chainWrap().classList.toggle('sc-fade-r', over && chain.scrollLeft + chain.clientWidth < chain.scrollWidth - 2);
    chainWrap().classList.toggle('sc-fade-l', over && chain.scrollLeft > 2);
  }
  chain.addEventListener('scroll', chainEdges, { passive: true });
  function keepChipVisible(btn) {
    chainEdges();
    if (chain.scrollWidth <= chain.clientWidth + 1) return;
    const li = btn.parentElement;
    const left = li.offsetLeft - (chain.clientWidth - li.offsetWidth) / 2;
    chain.scrollTo({ left: clamp(left, 0, chain.scrollWidth - chain.clientWidth), behavior: still() ? 'auto' : 'smooth' });
  }

  /* ---------------- stage ---------------- */
  let curLayer = null, token = 0;
  const hasCloud = r => !!(manifest && manifest[r.id] && manifest[r.id].cloud);
  const fallbackKey = r => Object.keys(r.media).find(k => k.startsWith('pi3x')) || r.thumb;
  function resolveKey(r, key) {
    if (key === '3d' && !(hasCloud(r) && Viewer.ok())) return fallbackKey(r);
    return key;
  }
  function loadImg(src, alt) {
    const img = new Image();
    img.decoding = 'async';
    img.alt = alt || '';
    img.src = src;
    const ready = img.decode ? img.decode().catch(() => new Promise(res => { if (img.complete) res(); else { img.onload = res; img.onerror = res; } })) : new Promise(res => { img.onload = res; img.onerror = res; });
    return { img, ready };
  }
  function shotFor(img) {
    const shot = el('div', 'sc-shot');
    const w = img.naturalWidth || 4, hgt = img.naturalHeight || 3;
    shot.style.setProperty('--ar', (w / hgt).toFixed(4));
    shot.dataset.w = w; shot.dataset.h = hgt;
    shot.appendChild(img);
    return shot;
  }
  /* load everything a layer needs, then hand back a commit() that fills it synchronously */
  async function prepare(r, key, st) {
    const id = r.id + '/' + key;
    if (key.startsWith('@')) return layer => { layer.dataset.key = id; layer._diagram = { r, key }; drawDiagram(layer); };
    if (key.includes('|')) {
      const parts = key.split('|').map(k => ({ k, ...loadImg(r.dir + k, plain(r.media[k] || '')) }));
      await Promise.all(parts.map(p => p.ready));
      return layer => {
        const pair = el('div', 'sc-pair');
        pair.style.setProperty('--n', parts.length);
        parts.forEach(p => {
          const shot = shotFor(p.img);
          const label = plain(r.media[p.k] || '').split(/[:.]/)[0];
          if (label) shot.appendChild(el('span', 'sc-ftag', esc(label)));
          pair.appendChild(shot);
        });
        layer.dataset.key = id; layer._diagram = null;
        layer.replaceChildren(pair);
      };
    }
    const { img, ready } = loadImg(r.dir + key, plain(r.media[key] || ''));
    await ready;
    return layer => {
      layer.dataset.key = id; layer._diagram = null;
      layer.replaceChildren(shotFor(img));
      drawMarks(layer, st, false);
    };
  }
  function drawMarks(layer, st, animate) {
    const shot = layer.querySelector('.sc-shot');
    if (!shot) return;
    const old = shot.querySelector('.sc-marks');
    if (old) old.remove();
    if (!st || !st.marks) return;
    const W = Number(shot.dataset.w), H = Number(shot.dataset.h), m = st.marks, [x0, y0, x1, y1] = m.frame;
    const P = p => [(p[0] - x0) / (x1 - x0) * W, (p[1] - y0) / (y1 - y0) * H];
    const pct = (x, y) => `left:${(x / W * 100).toFixed(2)}%;top:${(y / H * 100).toFixed(2)}%`;
    const box = el('div', 'sc-marks');
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' }, box);
    let html = '';
    (m.lines || []).forEach(L => {
      const [ax, ay] = P(L.a), [bx, by] = P(L.b), t = L.tone ? ' sc-t-' + L.tone : '';
      sv('line', { x1: ax, y1: ay, x2: bx, y2: by, class: 'sc-mhalo', 'vector-effect': 'non-scaling-stroke' }, svg);
      sv('line', { x1: ax, y1: ay, x2: bx, y2: by, class: 'sc-mline' + t, 'vector-effect': 'non-scaling-stroke' }, svg);
      html += `<span class="sc-mdot${t}" style="${pct(ax, ay)}"></span><span class="sc-mdot${t}" style="${pct(bx, by)}"></span>`;
      const vertical = Math.abs(bx - ax) < Math.abs(by - ay);
      html += `<span class="sc-mlab${vertical ? ' sc-v' : ''}${t}" style="${pct((ax + bx) / 2, (ay + by) / 2)}">${L.tone === 'bad' ? ICON.x : L.tone === 'ok' ? ICON.v : ''}${esc(L.label)}</span>`;
      if (L.ends) html += `<span class="sc-mlab sc-end" style="${pct(ax, ay)}">${esc(L.ends[0])}</span><span class="sc-mlab sc-end" style="${pct(bx, by)}">${esc(L.ends[1])}</span>`;
    });
    (m.dots || []).forEach(p => { const [x, y] = P(p); html += `<span class="sc-mdot" style="${pct(x, y)}"></span>`; });
    box.insertAdjacentHTML('beforeend', html);
    shot.appendChild(box);
    if (animate && !still()) anim(box, [{ opacity: 0 }, { opacity: 1 }], { duration: 420 });
  }
  function swapTo(target) {
    [layA, layB, layGL].forEach(l => l.classList.toggle('sc-on', l === target));
    if (curLayer === layGL && target !== layGL) Viewer.hide();
    curLayer = target;
    canvas.tabIndex = target === layGL ? 0 : -1;
    hint.hidden = target !== layGL;
    if (target === layGL) hint.textContent = hintText();
  }
  const hintText = () => fine.matches ? `Drag to orbit · ${isMac ? '⌘' : 'Ctrl'} + scroll to zoom` : 'Drag sideways to orbit';
  function setStageCaption(r, key, animate) {
    const text = r.media[key] || '';
    if (scap.dataset.text === text) return;
    scap.dataset.text = text;
    scap.innerHTML = codeify(text);
    if (animate && !still() && text) anim(scap, [{ opacity: 0 }, { opacity: 1 }], { duration: 360 });
  }
  async function showMedia(r, st, animate) {
    const my = ++token;
    let key = resolveKey(r, st.media);
    const id = r.id + '/' + key;
    badge.hidden = !st.badge;
    if (st.badge) {
      badge.innerHTML = `${ICON.bang}${esc(st.badge)}`;
      if (animate && !still()) anim(badge, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 380 });
    }
    if (key === '3d') {
      if (curLayer === layGL && Viewer.current() === r.id) { setStageCaption(r, key, animate); return; }
      try {
        await Viewer.show(r, manifest[r.id].cloud);
      } catch (e) {
        if (my !== token) return;
        key = fallbackKey(r);
        return showMedia(r, Object.assign({}, st, { media: key }), animate);
      }
      if (my !== token) { if (curLayer !== layGL) Viewer.hide(); return; }
      swapTo(layGL);
      setStageCaption(r, key, animate);
      return;
    }
    if (curLayer && curLayer !== layGL && curLayer.dataset.key === id) {
      drawMarks(curLayer, st, animate);
      setStageCaption(r, key, animate);
      return;
    }
    const commit = await prepare(r, key, st);
    if (my !== token) return;
    const target = curLayer === layA ? layB : layA;
    commit(target);
    swapTo(target);
    setStageCaption(r, key, animate);
  }

  /* ---------------- readout diagrams, drawn in stage pixels ---------------- */
  function arrowHead(g, x, y, ang, cls, size = 8) {
    const a1 = ang + Math.PI * 0.84, a2 = ang - Math.PI * 0.84;
    sv('path', { d: `M${x} ${y} L${x + size * Math.cos(a1)} ${y + size * Math.sin(a1)} L${x + size * Math.cos(a2)} ${y + size * Math.sin(a2)}Z`, class: cls }, g);
  }
  function text(g, x, y, str, cls, anchor = 'start') { const t = sv('text', { x, y, class: cls || '', 'text-anchor': anchor }, g); t.textContent = str; return t; }
  function camGlyph(g, x, y, ang, fovLen) {
    /* ang: facing direction in screen radians; a wedge for the field of view and a small body */
    const half = 0.42;
    sv('path', { d: `M${x} ${y} L${x + fovLen * Math.cos(ang - half)} ${y + fovLen * Math.sin(ang - half)} A${fovLen} ${fovLen} 0 0 1 ${x + fovLen * Math.cos(ang + half)} ${y + fovLen * Math.sin(ang + half)}Z`, class: 'sc-dfov' }, g);
    const deg = ang * 180 / Math.PI + 90;
    const b = sv('g', { transform: `translate(${x} ${y}) rotate(${deg})` }, g);
    sv('rect', { x: -9, y: -3, width: 18, height: 12, rx: 2.5, class: 'sc-dcam' }, b);
    sv('path', { d: 'M-5 -3 L-3 -8 H3 L5 -3', class: 'sc-dcam' }, b);
  }
  function drawDiagram(layer) {
    const d = layer._diagram;
    if (!d) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const svg = sv('svg', { class: 'sc-diagram', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': plain((d.r.alt && d.r.alt[d.key]) || d.r.media[d.key] || '') });
    const k = Math.min(W / 400, H / 320), ox = (W - 400 * k) / 2, oy = (H - 320 * k) / 2;
    const X = x => ox + x * k, Y = y => oy + y * k;
    const dots = sv('g', {}, svg);
    const step = Math.max(18, 22 * k);
    for (let x = step / 2; x < W; x += step) for (let y = step / 2; y < H; y += step) sv('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: .9, class: 'sc-dgrid' }, dots);
    const g = sv('g', {}, svg);
    const answer = d.key.endsWith(':answer');
    /* drawers in assets/dg/*.js register on window.SWD[type]; a failing drawer leaves the stage blank, never the player broken */
    const [type, phase = ''] = d.key.slice(1).split(':');
    const ext = window.SWD && window.SWD[type];
    if (ext) {
      try { ext(g, d.r.diagram || {}, { W, H, k, X, Y, phase, answer, dir: d.r.dir, r: d.r, still: still(), sv, text, arrowHead, camGlyph }); }
      catch (e) { if (window.console) console.warn('diagram', type, e); }
    }
    else {
      try { if (type === 'motion') drawMotion(g, d.r.motion, X, Y, k, answer); else if (type === 'route') drawRoute(g, d.r.route, X, Y, k, answer); }
      catch (e) { if (window.console) console.warn('diagram', type, e); }
    }
    if (k < 1) svg.classList.add('sc-dsmall');
    layer.replaceChildren(svg);
    /* keep every label inside the stage */
    svg.querySelectorAll('text').forEach(t => {
      let b;
      try { b = t.getBBox(); } catch (e) { return; }
      if (!b.width) return;
      const dx = b.x < 6 ? 6 - b.x : b.x + b.width > W - 6 ? W - 6 - b.x - b.width : 0;
      if (dx) t.setAttribute('x', Number(t.getAttribute('x')) + dx);
    });
  }
  function drawMotion(g, m, X, Y, k, answer) {
    /* top view: frame 1 at the bottom facing up (forward); +x is right */
    const u = 125;
    const c1 = [200, 214], obj = [200, 214 - m.depth * u], c2 = [200 + m.lateral * u, 214 - m.forward * u];
    const R = Math.hypot(c1[0] - obj[0], c1[1] - obj[1]);
    sv('circle', { cx: X(obj[0]), cy: Y(obj[1]), r: R * k, class: 'sc-dfaint' }, g);
    const tiny = k < 0.8;
    text(g, X(16), Y(26), tiny ? '↑ forward' : '↑ forward (frame 1)', 'sc-dt-mono');
    if (!tiny) text(g, X(16), Y(44), 'seen from above', 'sc-dt-mono');
    /* the object */
    sv('rect', { x: X(obj[0]) - 7, y: Y(obj[1]) - 10, width: 14, height: 20, rx: 4, class: 'sc-dobj' }, g);
    text(g, X(obj[0]) + 14, Y(obj[1]) + 4, 'object');
    /* turn: straight-ahead reference and the yaw arc at frame 2 */
    const up = -Math.PI / 2, yaw = m.yaw * Math.PI / 180, face = up + yaw;
    const turnG = sv('g', { class: answer ? 'sc-dim' : '' }, g);
    const refLen = 52 * k;
    sv('line', { x1: X(c2[0]), y1: Y(c2[1]), x2: X(c2[0]), y2: Y(c2[1]) - refLen, class: 'sc-dfaint' }, turnG);
    const ar = 34 * k, a0 = up, a1 = face;
    const p0 = [X(c2[0]) + ar * Math.cos(a0), Y(c2[1]) + ar * Math.sin(a0)], p1 = [X(c2[0]) + ar * Math.cos(a1), Y(c2[1]) + ar * Math.sin(a1)];
    sv('path', { d: `M${p0[0]} ${p0[1]} A${ar} ${ar} 0 0 0 ${p1[0]} ${p1[1]}`, class: 'sc-dmuted' }, turnG);
    arrowHead(turnG, p1[0], p1[1], a1 - Math.PI / 2, 'sc-dhead-muted', 7);
    /* the turn readout sits outside the orbit so the dashed circle never crosses it */
    const tl = [Math.max(X(c2[0]) + 14, X(obj[0]) + R * k + 10), Y(c2[1]) - refLen + 4];
    text(turnG, tl[0], tl[1], 'turn: left', 'sc-dt-strong');
    text(turnG, tl[0], tl[1] + 16, `yaw ${m.yaw > 0 ? '+' : '−'}${Math.abs(m.yaw).toFixed(1)}°`);
    /* cameras */
    camGlyph(g, X(c1[0]), Y(c1[1]), up, 40 * k);
    camGlyph(g, X(c2[0]), Y(c2[1]), face, 40 * k);
    text(g, X(c1[0]) - 16, Y(c1[1]) + 18, 'frame 1', '', 'end');
    text(g, X(c2[0]) + 16, Y(c2[1]) + 20, 'frame 2');
    /* translation */
    const tcls = answer ? 'sc-dok' : 'sc-dbrand';
    const sx = X(c1[0]) + 10 * k, sy = Y(c1[1]) - 2 * k, ex = X(c2[0]) - 12 * k, ey = Y(c2[1]) + 3 * k;
    sv('line', { x1: sx, y1: sy, x2: ex, y2: ey, class: tcls }, g);
    arrowHead(g, ex, ey, Math.atan2(ey - sy, ex - sx), answer ? 'sc-dhead-ok' : 'sc-dhead-brand', 9);
    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    text(g, mx - 4, my + 30, answer ? 'moved right → (B) right' : 'translation: right', answer ? 'sc-dt-ok' : 'sc-dt-brand');
    text(g, mx - 4, my + 46, `bearing +${m.bearing.toFixed(1)}°${k < 1 ? '' : ' (forward-right)'}`);
  }
  function drawRoute(g, rt, X, Y, k, answer) {
    /* walk the legs from the recorded turns; north (upstairs) is up */
    let hd = 0, p = [0, 0];
    const pts = [p];
    rt.legs.forEach(L => { hd += L.turn; const a = hd * Math.PI / 180; p = [p[0] + L.len * Math.sin(a), p[1] + L.len * Math.cos(a)]; pts.push(p); });
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const s = Math.min(236 / (maxx - minx || 1), 196 / (maxy - miny || 1));
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    const S = pts.map(q => [X(200 + (q[0] - cx) * s), Y(126 - (q[1] - cy) * s)]);
    const L = rt.legs, tiny = k < 0.8;
    const deg = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}°`;
    /* compass */
    const nx = X(30), ny = Y(222);
    sv('line', { x1: nx, y1: ny + 12, x2: nx, y2: ny - 14, class: 'sc-dmuted' }, g);
    arrowHead(g, nx, ny - 16, -Math.PI / 2, 'sc-dhead-muted', 7);
    text(g, nx, ny - 24, 'N', 'sc-dt-strong', 'middle');
    if (!tiny) text(g, nx + 12, ny + 6, 'north = upstairs', 'sc-dt-mono');
    /* leg 1: the stairs define north; drawn beside the return leg so the two do not overlap */
    const dim = answer ? ' sc-dim' : '';
    const off = 11;
    const [bx, by] = S[0], [tx, ty] = S[1];
    sv('line', { x1: bx + off, y1: by, x2: tx + off, y2: ty + 7, class: 'sc-dtool' + dim }, g);
    arrowHead(g, tx + off, ty + 5, -Math.PI / 2, 'sc-dhead-tool' + dim, 7);
    text(g, tx + off + 9, (by + ty) / 2 + 9, 'upstairs', 'sc-dt-tool' + dim);
    /* legs 2 and 3 */
    [1, 2].forEach(i => {
      const [ax, ay] = S[i], [ex, ey] = S[i + 1];
      const last = i === L.length - 1;
      const cls = answer ? (last ? 'sc-dok' : 'sc-dtool sc-dim') : 'sc-dtool';
      const len = Math.hypot(ex - ax, ey - ay), ux = (ex - ax) / len, uy = (ey - ay) / len, trim = 8;
      sv('line', { x1: ax + ux * trim, y1: ay + uy * trim, x2: ex - ux * trim, y2: ey - uy * trim, class: cls }, g);
      arrowHead(g, ex - ux * trim, ey - uy * trim, Math.atan2(uy, ux), answer ? (last ? 'sc-dhead-ok' : 'sc-dhead-tool sc-dim') : 'sc-dhead-tool', 8);
    });
    const mid = i => [(S[i][0] + S[i + 1][0]) / 2, (S[i][1] + S[i + 1][1]) / 2];
    const [m2x, m2y] = mid(1), [m3x, m3y] = mid(2);
    const l2 = sv('g', { class: answer ? 'sc-dim' : '' }, g);
    /* scaled down, the leg-2 label moves up (above where the return leg to the fireplace can reach) and drops its second line */
    const small = k < 1, w2 = (`${L[1].word} (${deg(L[1].turn)})`).length * 6.6;
    const leg3X = y => { const [ax, ay] = S[2], [bx3, by3] = S[3]; return by3 === ay ? -1e9 : ax + (y - ay) * (bx3 - ax) / (by3 - ay); };
    let l2y = small ? m2y - 18 : m2y + 4;
    if (small) while (l2y - 14 > S[1][1] + 10 && l2y > S[3][1] - 6 && leg3X(l2y - 10) > m2x - 12 - w2 - 8) l2y -= 6;
    text(l2, m2x - 12, l2y, `${L[1].word} (${deg(L[1].turn)})`, 'sc-dt-tool', 'end');
    if (!small) text(l2, m2x - 12, m2y + 20, 'to the front door', '', 'end');
    if (answer) {
      text(g, m3x - 14, m3y + 24, 'northwest (D)', 'sc-dt-ok', 'end');
      if (!tiny) text(g, m3x - 14, m3y + 40, `${Math.abs(rt.net)}° left of north`, '', 'end');
    } else {
      text(g, m3x - 14, m3y + 24, `${L[2].word} (${deg(L[2].turn)})`, 'sc-dt-tool', 'end');
      if (!tiny) text(g, m3x - 14, m3y + 40, 'to the fireplace', '', 'end');
    }
    /* waypoints */
    [1, 2, 3].forEach(i => sv('circle', { cx: S[i][0], cy: S[i][1], r: 5, class: 'sc-dnode' }, g));
    text(g, S[1][0] - 10, S[1][1] - 2, 'stair top', 'sc-dt-strong', 'end');
    text(g, S[2][0] + 12, S[2][1] + 5, 'front door', 'sc-dt-strong');
    text(g, S[3][0], S[3][1] - 13, 'fireplace', 'sc-dt-strong', 'middle');
    if (answer) {
      /* the base model's pick, drawn from the door: southwest */
      const [dx, dy] = S[2], a = 135 * Math.PI / 180, len = 44 * k;
      const ex = dx + len * Math.cos(a), ey = dy + len * Math.sin(a);
      sv('line', { x1: dx - 6, y1: dy + 6, x2: ex, y2: ey, class: 'sc-dbad' }, g);
      arrowHead(g, ex, ey, a, 'sc-dhead-bad', 8);
      text(g, ex - 8, ey + 2, 'southwest (A): base', 'sc-dt-bad', 'end');
    }
  }

  /* ---------------- point-cloud viewer (three.js) ---------------- */
  const Viewer = (() => {
    let renderer = null, scene = null, cam = null, group = null, currentId = null, raf = 0, last = 0, okFlag = null;
    let active = false, onScreen = false, drag = null, auto = true;
    const view = { theta: 0, phi: .95, radius: 2.7 };
    const cache = {}, loading = {}, mats = [];
    function ok() {
      if (okFlag !== null) return okFlag;
      if (!window.THREE) return (okFlag = false);
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        okFlag = !!gl;
        const lose = gl && gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      } catch (e) { okFlag = false; }
      return okFlag;
    }
    function init() {
      if (renderer) return true;
      if (!ok()) return false;
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' }); }
      catch (e) { okFlag = false; return false; }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      scene = new THREE.Scene();
      cam = new THREE.PerspectiveCamera(40, 4 / 3, 0.01, 100);
      bind();
      return true;
    }
    function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function build(meta, buf) {
      const n = meta.n;
      const src = new Float32Array(buf, 0, n * 3), rgb = new Uint8Array(buf, n * 12, n * 3);
      /* upright frame from the recorded cameras: up = -(mean camera y), back = -(mean camera z) */
      let down = [0, 0, 0], fwd = [0, 0, 0];
      meta.cams.forEach(c => { for (let a = 0; a < 3; a++) { down[a] += c.R[a][1]; fwd[a] += c.R[a][2]; } });
      const up = norm(down.map(v => -v));
      let back = fwd.map(v => -v);
      const d = dot(back, up);
      back = back.map((v, a) => v - d * up[a]);
      if (Math.hypot(...back) < 1e-3) { const c = meta.cams[0]; back = [-c.R[0][2], -c.R[1][2], -c.R[2][2]]; const e = dot(back, up); back = back.map((v, a) => v - e * up[a]); }
      back = norm(back);
      const right = cross(up, back);
      const T = p => [dot(p, right), dot(p, up), dot(p, back)];
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const q = T([src[i * 3], src[i * 3 + 1], src[i * 3 + 2]]);
        pos[i * 3] = q[0]; pos[i * 3 + 1] = q[1]; pos[i * 3 + 2] = q[2];
        col[i * 3] = rgb[i * 3] / 255; col[i * 3 + 1] = rgb[i * 3 + 1] / 255; col[i * 3 + 2] = rgb[i * 3 + 2] / 255;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const grp = new THREE.Group();
      grp.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.02, vertexColors: true, sizeAttenuation: true })));
      const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(cssVar('--brand') || '#7151c6') });
      const dotMat = new THREE.MeshBasicMaterial({ color: lineMat.color.clone() });
      mats.push(lineMat, dotMat);
      meta.cams.forEach(c => {
        const R = c.R, p = c.pos;
        const w = (v) => T([R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2] + p[0], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2] + p[1], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2] + p[2]]);
        const s = 0.1, dz = 0.18;
        const o = w([0, 0, 0]), cs = [[-s * 1.3, -s, dz], [s * 1.3, -s, dz], [s * 1.3, s, dz], [-s * 1.3, s, dz]].map(w);
        const seg = [];
        cs.forEach(q => seg.push(o, q));
        for (let a = 0; a < 4; a++) seg.push(cs[a], cs[(a + 1) % 4]);
        const lg = new THREE.BufferGeometry().setFromPoints(seg.map(q => new THREE.Vector3(q[0], q[1], q[2])));
        grp.add(new THREE.LineSegments(lg, lineMat));
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), dotMat);
        m.position.set(o[0], o[1], o[2]);
        grp.add(m);
      });
      grp.userData.view = { theta: 0, phi: .95, radius: 2.7 };
      return grp;
    }
    function load(r, meta) {
      if (cache[r.id]) return Promise.resolve(cache[r.id]);
      if (!loading[r.id]) {
        loading[r.id] = fetch(r.dir + 'cloud.bin')
          .then(res => { if (!res.ok) throw new Error('cloud ' + res.status); return res.arrayBuffer(); })
          .then(buf => (cache[r.id] = build(meta, buf)));
        loading[r.id].catch(() => { delete loading[r.id]; });
      }
      return loading[r.id];
    }
    function colors() {
      if (!scene) return;
      scene.background = new THREE.Color(cssVar('--surface') || '#f3f0f9');
      const b = new THREE.Color(cssVar('--brand') || '#7151c6');
      mats.forEach(m => m.color.copy(b));
    }
    function resize() {
      if (!renderer) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    function place() {
      const { theta, phi, radius } = view;
      cam.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
      cam.lookAt(0, 0, 0);
    }
    const running = () => active && onScreen && !document.hidden;
    const spinning = () => auto && A.on && !still() && !drag;
    function frame(now) {
      raf = 0;
      if (!running()) { last = 0; return; }
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (spinning()) view.theta += dt * 0.00011;
      place();
      renderer.render(scene, cam);
      if (spinning() || drag) raf = requestAnimationFrame(frame); else last = 0;
    }
    function kick() { if (!raf && running()) raf = requestAnimationFrame(frame); }
    async function show(r, meta) {
      if (!init()) throw new Error('webgl');
      const grp = await load(r, meta);
      if (group !== grp) {
        if (group) scene.remove(group);
        scene.add(grp);
        group = grp;
        currentId = r.id;
        Object.assign(view, grp.userData.view);
        auto = true;
      }
      colors();
      active = true;
      resize();
      place();
      renderer.render(scene, cam);
      kick();
    }
    function hide() { active = false; drag = null; if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
    function setOnScreen(v) { onScreen = v; if (v) kick(); }
    let hintTimer = 0;
    function flashHint(msg) {
      if (curLayer !== layGL) return;
      hint.hidden = false;
      hint.textContent = msg;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => { hint.textContent = hintText(); }, 1500);
    }
    function bind() {
      canvas.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: view.theta, p: view.phi };
        auto = false;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
        hint.hidden = true;
        manual();
        kick();
      });
      canvas.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        view.theta = drag.t - (e.clientX - drag.x) * 0.008;
        view.phi = clamp(drag.p - (e.clientY - drag.y) * 0.008, 0.12, 1.5);
        kick();
      });
      const end = e => { if (drag && e.pointerId === drag.id) drag = null; };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('lostpointercapture', end);
      canvas.addEventListener('wheel', e => {
        if (!(e.ctrlKey || e.metaKey)) { flashHint(`Hold ${isMac ? '⌘' : 'Ctrl'} and scroll to zoom`); return; }
        e.preventDefault();
        view.radius = clamp(view.radius * Math.exp(e.deltaY * 0.0015), 1.1, 6);
        auto = false;
        kick();
      }, { passive: false });
      canvas.addEventListener('keydown', e => {
        const m = { ArrowLeft: ['theta', -0.18], ArrowRight: ['theta', 0.18], ArrowUp: ['phi', -0.12], ArrowDown: ['phi', 0.12], '+': ['radius', 0.9], '=': ['radius', 0.9], '-': ['radius', 1.1] }[e.key];
        if (!m) return;
        e.preventDefault();
        auto = false;
        if (m[0] === 'radius') view.radius = clamp(view.radius * m[1], 1.1, 6);
        else if (m[0] === 'phi') view.phi = clamp(view.phi + m[1], 0.12, 1.5);
        else view.theta += m[1];
        kick();
      });
    }
    const preload = (r, meta) => { if (ok()) load(r, meta).catch(() => {}); };
    return { ok, show, hide, preload, resize: () => { resize(); if (active && renderer) { place(); renderer.render(scene, cam); } }, setOnScreen, kick, colors, current: () => (active ? currentId : null) };
  })();

  /* ---------------- case + step ---------------- */
  const metaText = r => `${r.bench} · ${r.calls} tool call${r.calls === 1 ? '' : 's'} · ${r.views} ${r.views > 1 ? 'views' : 'view'}`;
  const captionHTML = (r, i) => `<span class="sc-stepno">Step ${i + 1} of ${r.steps.length}</span><span class="sc-ctext">${tint(r.steps[i].text)}</span>`;
  function context(r) {
    const b = BENCH[r.bi];
    return `<span class="sc-ctx-lab">Benchmark-wide</span>Sol ${fmt(SOL.base[r.bi])} → <b>${fmt(SOL.ours[r.bi])}</b>, all ${b.n.toLocaleString('en-US')} questions`;
  }
  function preload(r) {
    r.steps.forEach(st => {
      const k = st.media;
      if (k === '3d' || k.startsWith('@')) return;
      k.split('|').forEach(f => { const i = new Image(); i.decoding = 'async'; i.src = r.dir + f; });
    });
  }
  /* 'without it': recorded answers to the same question with the part missing */
  const woHTML = r => !(r.without && r.without.length) ? '' : `<p class="sc-lab">Without it</p><ul class="sc-wo-list">${r.without.map(([what, ans, ok]) =>
    `<li class="sc-wo-row ${ok ? 'sc-wo-ok' : 'sc-wo-bad'}">${ok ? ICON.v : ICON.x}<span class="sc-wo-what">${esc(what)}</span><span class="sc-wo-ans">${esc(ans)}<span class="sc-vh">${ok ? ', correct' : ', wrong'}</span></span></li>`).join('')}</ul>`;
  /* a number never wraps away from its unit ("0.08 m") */
  const keepUnits = h => String(h).replace(/(\d) (m|px|cm)(?![\w-])/g, '$1\u00a0$2');
  /* the skill lines the run read, verbatim; a SKILL.md keeps its skill's folder name so it is not ambiguous */
  const ruleFile = f => { const parts = f.split('/'), base = parts.pop(); return base === 'SKILL.md' && parts.length ? parts.pop() + '/' + base : base; };
  const ruleHTML = r => !r.rule ? '' : `<figcaption><span class="sc-rule-lab">${esc(r.rule.lab || 'The skill it read')}</span><span class="sc-rule-file">${esc(ruleFile(r.rule.file))} · ${esc(r.rule.lines)}</span></figcaption>` +
    `<blockquote cite="${esc(r.rule.file)}">${esc(r.rule.text).replace(/`([^`]+)`/g, '<code>$1</code>')}</blockquote>` + (r.rule.applied ? `<p class="sc-rule-applied">${keepUnits(esc(r.rule.applied))}</p>` : '');
  /* one harness, four frozen models: alone vs with the harness */
  const mcell = (v, ok) => `<span class="sc-mv ${ok === true ? 'sc-mv-ok' : ok === false ? 'sc-mv-bad' : 'sc-mv-part'}">${ok === true ? ICON.v : ok === false ? ICON.x : ''}${esc(v)}${typeof ok === 'number' ? `<small>${ok} credit</small>` : ''}<span class="sc-vh">${ok === true ? ', correct' : ok === false ? ', wrong' : ', partial credit'}</span></span>`;
  const shortName = n => n.replace(/^GPT-\S+ /, '').replace(/[-\d.]+B$/, '').replace(/-[\d-]+B?$/, '').trim();
  const modelsHTML = r => !(r.models && r.models.length) ? '' : `<p class="sc-lab">Same harness, four frozen models <span class="sc-mh">alone → with SpatialWeave</span></p><div class="sc-models">` +
    r.models.map(([name, a, aok, w, wok]) => `<span class="sc-mchip" title="${esc(name)}"><span class="sc-mname">${esc(shortName(name))}</span>${mcell(a, aok)}<span class="sc-mto" aria-hidden="true">→</span>${mcell(w, wok)}</span>`).join('') + '</div>';
  /* the run chain's key: only the kinds this run uses */
  const KINDS = [['skill', 'Skills'], ['tool', 'Tools'], ['flow', 'Workflows'], ['bad', 'Caught an error']];
  const kindsHTML = r => KINDS.filter(([k]) => r.steps.some(st => st.k === k))
    .map(([k, t]) => `<span class="sc-kind sc-k-${k}"><i aria-hidden="true"></i>${t}</span>`).join('');
  /* the per-case text around the stage (also used, synchronously, to measure every case) */
  function fillText(r) {
    metaEl.innerHTML = (r.comp ? `<span class="sc-comp sc-ck-${r.comp.k}">${compHTML(r.comp)}</span>` : '') + `<span>${esc(metaText(r))}</span>`;
    qEl.textContent = r.short;
    cmp.innerHTML = r.kind === 'number' ? buildNumber(r) : buildChoice(r);
    wo.innerHTML = woHTML(r);
    whyT.innerHTML = keepUnits(r.why);
    ruleEl.innerHTML = ruleHTML(r);
    ruleEl.hidden = !r.rule;
    ctx.innerHTML = modelsHTML(r);
    kindsEl.innerHTML = kindsHTML(r);
  }
  /* the input photos, small, under the stage; a click shows one on the stage */
  function buildPhotos(r) {
    photosEl.textContent = '';
    (r.photos || []).forEach(f => {
      const b = el('button', 'sc-photo'); b.type = 'button'; b.dataset.f = f;
      b.innerHTML = `<img src="${r.dir + f}" alt="" decoding="async" loading="lazy">`;
      b.setAttribute('aria-label', `Show input photo: ${plain(r.media[f] || f)}`);
      b.addEventListener('click', () => { manual(); showMedia(r, { media: f }, true); markPhoto(f); });
      photosEl.appendChild(b);
    });
  }
  const markPhoto = key => photosEl.querySelectorAll('.sc-photo').forEach(b => b.setAttribute('aria-pressed', String(!!key && key.split('|').includes(b.dataset.f))));
  function renderCase(c, animate) {
    const r = RUNS[c];
    cur.c = c;
    tiles.forEach((b, i) => { b.setAttribute('aria-pressed', String(i === c)); if (i !== c) paintProgress(i, 0); });
    fillText(r);
    fullq.textContent = r.q;
    full.open = false;
    buildChain(r);
    buildPhotos(r);
    applyCaseLocks();
    preload(r);
    if (hasCloud(r) && r.steps.some(x => x.media === '3d')) Viewer.preload(r, manifest[r.id].cloud);
    if (animate && !still()) {
      [qEl, metaEl].forEach((n, i) => anim(n, [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: i * 40 }));
      animateCmp();
      anim(why, [{ opacity: 0 }, { opacity: 1 }], { duration: 520, delay: 200 });
      chain.querySelectorAll('.sc-step').forEach((b, i) => anim(b, [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 80 + i * 60 }));
    }
  }
  function setStep(s, animate) {
    const r = RUNS[cur.c], n = r.steps.length, st = r.steps[s];
    cur.s = s;
    const btns = chain.querySelectorAll('.sc-step');
    btns.forEach((b, i) => {
      b.classList.toggle('sc-done', i < s);
      b.classList.toggle('sc-future', i > s);
      if (i === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    markRowEnds();
    const keyAt = r.steps.findIndex(x => x.key);
    why.classList.toggle('sc-lit', keyAt >= 0 && s >= keyAt);
    stepNo.textContent = `Step ${s + 1} of ${n}`;
    ctext.innerHTML = tint(st.text);
    if (animate && !still()) anim(ctext, [{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 380 });
    keepChipVisible(btns[s]);
    startClock();
    showMedia(r, st, animate);
    markPhoto(st.media);
  }
  function select(c, s, animate) {
    if (c !== cur.c) renderCase(c, animate);
    setStep(s, animate);
  }
  function paintProgress(c, p) {
    const i = tiles[c].querySelector('.sc-prog i');
    i.style.transform = `scaleX(${clamp(p, 0, 1).toFixed(4)})`;
  }
  function stopClock() {
    if (A.fill) { A.fill.cancel(); A.fill = null; }
    if (!A.clock) return;
    A.clock.onfinish = null;
    A.clock.cancel();
    A.clock = null;
  }
  function startClock() {
    stopClock();
    const n = RUNS[cur.c].steps.length, p0 = cur.s / n, p1 = (cur.s + 1) / n;
    paintProgress(cur.c, p0);
    if (still()) return;
    const bar = tiles[cur.c].querySelector('.sc-prog i');
    const clock = bar.animate([{ transform: `scaleX(${p0})` }, { transform: `scaleX(${p1})` }], { duration: dwell(cur.c, cur.s), easing: 'linear', fill: 'forwards' });
    clock.onfinish = () => {
      if (A.clock !== clock) return;
      A.clock = null;
      paintProgress(cur.c, p1);
      clock.cancel();
      if (cur.s < n - 1) setStep(cur.s + 1, true);
      else select((cur.c + 1) % RUNS.length, 0, true);
    };
    A.clock = clock;
    const fill = chain.querySelectorAll('.sc-sfill')[cur.s];
    if (fill) A.fill = fill.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: dwell(cur.c, cur.s), easing: 'linear', fill: 'forwards' });
    if (!running()) { clock.pause(); if (A.fill) A.fill.pause(); }
  }

  /* ---------------- autoplay ---------------- */
  const running = () => A.on && !A.holds.size && !still();
  function sync() {
    if (A.clock) { if (running()) A.clock.play(); else A.clock.pause(); }
    if (A.fill) { if (running()) A.fill.play(); else A.fill.pause(); }
    else if (running() && cur.c >= 0) startClock();
    caption.setAttribute('aria-live', running() ? 'off' : 'polite');
  }
  function hold(key, v) { if (v) A.holds.add(key); else A.holds.delete(key); sync(); }
  function paintPlay() {
    playBtn.hidden = still();
    playBtn.setAttribute('aria-pressed', String(A.on));
    playBtn.innerHTML = A.on ? `${ICON.pause}<span>Pause</span>` : `${ICON.play}<span>Play</span>`;
    playBtn.setAttribute('aria-label', A.on ? 'Pause the recorded runs' : 'Play the recorded runs');
  }
  function manual() { if (A.on) { A.on = false; paintPlay(); } sync(); }
  playBtn.addEventListener('click', () => {
    A.on = !A.on;
    paintPlay();
    sync();
    Viewer.kick();
  });

  /* keep playing under a resting or moving mouse: only an intervention stops the runs (a click on a case, step
     or photo turns autoplay off; Play resumes it). Keyboard focus inside the player and the open full question
     hold it while they last. */
  const keyboardFocus = n => { try { return n.matches(':focus-visible'); } catch (e) { return true; } };
  th.addEventListener('focusin', e => { if (keyboardFocus(e.target)) hold('focus', true); });
  th.addEventListener('focusout', e => { if (!th.contains(e.relatedTarget)) hold('focus', false); });
  full.addEventListener('toggle', () => hold('details', full.open));
  full.addEventListener('keydown', e => { if (e.key === 'Escape' && full.open) { full.open = false; full.querySelector('summary').focus({ preventScroll: true }); } });
  document.addEventListener('pointerdown', e => { if (full.open && !full.contains(e.target)) full.open = false; });
  document.addEventListener('visibilitychange', () => { hold('hidden', document.hidden); if (!document.hidden) Viewer.kick(); });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      const need = Math.min(en.boundingClientRect.height, window.innerHeight) * 0.5;
      hold('offscreen', !(en.isIntersecting && en.intersectionRect.height >= need));
      Viewer.setOnScreen(en.isIntersecting);
    }), { threshold: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1] });
    io.observe(th);
  } else {
    hold('offscreen', false);
    Viewer.setOnScreen(true);
  }

  /* The player keeps one height for every case and step, so autoplay never shifts the page below it.
     Step captions are locked to their tallest version: within the case when stacked, across all cases side by
     side. Side by side, the stage grows to the tallest right column when a case needs more room than its 5:4
     box (narrow desktops); stacked, the player is held at its tallest case, with any slack at its bottom. */
  const stacked = window.matchMedia('(max-width: 899px)');
  let caseLocks = null;
  function measure(node, htmls) {
    const probe = node.cloneNode(false);
    probe.removeAttribute('aria-live');
    probe.setAttribute('aria-hidden', 'true');
    const w = node.getBoundingClientRect().width || node.parentElement.getBoundingClientRect().width;
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;inset:0 auto auto 0;height:auto;min-height:0;max-height:none;max-width:none;margin:0;width:${w}px`;
    node.parentElement.appendChild(probe);
    const hs = htmls.map(x => { probe.innerHTML = x; return probe.getBoundingClientRect().height; });
    probe.remove();
    return hs;
  }
  const stepMedia = r => r.steps.map(x => codeify(r.media[resolveKey(r, x.media)] || ''));
  let chainLock = 0;
  function applyCaseLocks(c = cur.c) {
    const L = caseLocks && caseLocks[c];
    caption.style.minHeight = L ? L.cap + 'px' : '';
    scap.style.minHeight = L && L.scap ? L.scap + 'px' : '';
    /* side by side, a shorter chain leaves its slack at the bottom of the foot (stacked, the theater's last row takes it) */
    const foot = chain.closest('.sc-foot');
    if (!foot) return;
    foot.style.minHeight = '';
    if (stacked.matches) return;
    const extra = chainLock - chain.getBoundingClientRect().height;
    if (extra > 0.5) foot.style.minHeight = Math.ceil(foot.getBoundingClientRect().height + extra) + 'px';
  }
  const outerH = n => { const cs = getComputedStyle(n); return n.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); };
  const chainHTML = (r, a) => r.steps.map((st, i) => `<li><button class="sc-step sc-k-${st.k}${st.key ? ' sc-keyed' : ''}"${i === a ? ' aria-current="step"' : ''} type="button">${st.k === 'ans' ? ICON.v : st.k === 'bad' ? ICON.bang : ''}<span>${esc(st.chip)}</span><i class="sc-sfill"></i></button></li>`).join('');
  function lockHeights() {
    caseLocks = null;
    th.style.minHeight = '';
    stage.style.height = '';
    why.style.minHeight = '';
    chainLock = 0;
    applyCaseLocks();
    if (cur.c < 0 || !th.getBoundingClientRect().width) return;
    /* the step chain wraps, so every case reserves the height of the tallest chain at this width */
    chainLock = Math.ceil(Math.max(...measure(chain, RUNS.flatMap(r => r.steps.map((_, a) => chainHTML(r, a))))));
    const side = !stacked.matches;
    const staticCap = getComputedStyle(scap).position === 'static';
    caseLocks = RUNS.map(r => ({
      cap: Math.ceil(Math.max(...measure(caption, r.steps.map((x, i) => captionHTML(r, i))))),
      scap: staticCap ? Math.ceil(Math.max(...measure(scap, stepMedia(r)))) : 0,
    }));
    if (side) { const top = Math.max(...caseLocks.map(x => x.cap)); caseLocks.forEach(x => { x.cap = top; }); }
    /* lay each case's text out in place, synchronously (nothing paints in between), and keep the tallest.
       The step and stage captions are blanked meanwhile, so each case is measured at its own locks. */
    const texts = [metaEl, qEl, cmp, wo, whyT, ruleEl, ctx, kindsEl, ctext, scap], keep = texts.map(n => n.innerHTML);
    const live = caption.getAttribute('aria-live');
    caption.setAttribute('aria-live', 'off');
    ctext.innerHTML = '';
    scap.innerHTML = '';
    let tallTh = 0, tallRight = 0, tallWhy = 0;
    RUNS.forEach((r, i) => {
      fillText(r);
      applyCaseLocks(i);
      if (side) { tallRight = Math.max(tallRight, [head, cmp, wo, ctx].reduce((a, n) => a + outerH(n), 0)); tallWhy = Math.max(tallWhy, why.getBoundingClientRect().height); }
      else tallTh = Math.max(tallTh, th.getBoundingClientRect().height + Math.max(0, chainLock - chain.getBoundingClientRect().height));
    });
    texts.forEach((n, k) => { n.innerHTML = keep[k]; });
    if (live) caption.setAttribute('aria-live', live);
    applyCaseLocks();
    if (!side) th.style.minHeight = Math.ceil(tallTh) + 'px';
    else if (tallWhy) why.style.minHeight = Math.ceil(tallWhy) + 'px';
    else if (tallRight > stage.getBoundingClientRect().height + 0.5) stage.style.height = Math.ceil(tallRight) + 'px';
  }

  /* layout-dependent pieces: re-lock when the player's width changes; redraw when the stage's size does */
  if ('ResizeObserver' in window) {
    let tw = 0, sw = 0, sh = 0;
    const ro = new ResizeObserver(() => {
      const w = th.clientWidth;
      if (w !== tw) { tw = w; lockHeights(); }
      const a = stage.clientWidth, b = stage.clientHeight;
      if (a !== sw || b !== sh) {
        sw = a; sh = b;
        [layA, layB].forEach(l => { if (l._diagram) drawDiagram(l); });
        Viewer.resize();
      }
      chainEdges();
    });
    ro.observe(th);
    ro.observe(stage);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockHeights);
  const scheme = window.matchMedia('(prefers-color-scheme: dark)');
  const recolor = () => { Viewer.colors(); Viewer.kick(); [layA, layB].forEach(l => { if (l._diagram) drawDiagram(l); }); };
  if (scheme.addEventListener) scheme.addEventListener('change', recolor);
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (reduced.addEventListener) reduced.addEventListener('change', () => {
    if (still()) { A.on = false; stopClock(); sync(); setStep(RUNS[cur.c].steps.length - 1, false); }
    paintPlay();
  });

  /* ---------------- start ---------------- */
  paintPlay();
  const start = () => { select(0, still() ? RUNS[0].steps.length - 1 : 0, false); sync(); };
  fetch('assets/cases/manifest.json').then(res => res.json()).then(m => { manifest = m; }, () => { manifest = {}; }).then(() => {
    /* a 3D step shown before the manifest arrived used its static render: show the cloud now */
    const r = RUNS[cur.c], st = r && r.steps[cur.s];
    if (st && st.media === '3d') showMedia(r, st, false);
    lockHeights();
    if (r && hasCloud(r) && r.steps.some(x => x.media === '3d')) Viewer.preload(r, manifest[r.id].cloud);
  });
  start();
  lockHeights();
})();
