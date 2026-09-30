/* 02 · How the harness evolved: a compact, time-driven "evolution player".
   Seven evaluated versions around a frozen GPT-5.6 Sol (4,929 questions, overall micro accuracy),
   drawn as a waterfall: each column is the gain of one operator, with the components it added below.
   Everything lives inside #ev-root; classes are prefixed "ev-". Never throws. */
(() => {
  'use strict';
  const root = document.getElementById('ev-root');
  if (!root || root.getAttribute('data-ev') === 'on') return;

  const SW = window.SW || {};
  const media = q => { try { return window.matchMedia(q); } catch (e) { return { matches: false }; } };
  const reduced = SW.reduced || media('(prefers-reduced-motion: reduce)');
  const rowsMq = media('(max-width: 979.98px)');
  const EASE = SW.ease || 'cubic-bezier(.22,1,.36,1)';
  const NS = 'http://www.w3.org/2000/svg';
  const f2 = v => Number(v).toFixed(2);
  const quiet = fn => function () { try { return fn.apply(this, arguments); } catch (e) { /* fail quietly */ } };

  /* ---------------- data (paper, stagewise table; deltas from unrounded scores) ---------------- */
  const tools = names => names.map(n => ['tool', n]);
  const STEPS = [
    { v: 'v0', op: 'Base', kind: 'base', name: 'Base model', acc: 70.62, d: '', count: 'model alone',
      note: 'GPT-5.6 Sol answers from the images alone, with no\u00a0tools.',
      add: [['base', 'GPT-5.6 Sol']], tot: [0, 0, 0] },
    { v: 'v1', op: 'Expand', kind: 'tool', name: 'Perception tools', acc: 73.61, d: '+2.98', count: '+5 tools',
      note: 'Five tools for detection, segmentation, depth estimation, 3D reconstruction, and image inspection.',
      add: tools(['detect_objects', 'segment_region', 'estimate_depth', 'reconstruct_scene', 'inspect_image']), tot: [5, 0, 0] },
    { v: 'v2', op: 'Expand', kind: 'tool', name: 'Extended tools', acc: 74.70, d: '+1.09', count: '+6 tools',
      note: 'Six more tools for point queries, relative position, turn sequences, distances, room area, and counting.',
      add: tools(['query_points', 'relative_position', 'turn_sequence', 'measure_distance', 'estimate_room_area', 'count_census']), tot: [11, 0, 0] },
    { v: 'v3', op: 'Guide', kind: 'skill', name: 'Generic skills', acc: 77.06, d: '+2.36', count: '+2 skills',
      note: 'Basic and Tools skills say how to call the tools and read their returns. The executable library does not change.',
      add: [['skill', 'Basic'], ['skill', 'Tools']], tot: [11, 0, 2] },
    { v: 'v4', op: 'Expand', kind: 'tool', name: 'Specialized tools', acc: 77.26, d: '+0.20', count: '+5 tools',
      note: 'Five computation and diagnostic tools. Accuracy barely moves.',
      add: tools(['box_depth', 'depth_order', 'marker_read', 'near_touch_guard', 'answer_check']), tot: [16, 0, 2] },
    { v: 'v5', op: 'Compile', kind: 'flow', name: 'Executable workflows', acc: 79.64, d: '+2.37', count: '+3 workflows',
      note: 'Recurring tool chains become callable programs, with no new tools. SPBench gains\u00a0+9.17, BLINK\u00a0+2.52.',
      add: [['flow', 'camera_motion'], ['flow', 'relation_readout'], ['flow', 'measure_pair']], tot: [16, 3, 2] },
    { v: 'v6', op: 'Refine', kind: 'skill', name: 'Refined skills', acc: 80.75, d: '+1.12', count: '1 new, 2 refined',
      note: 'Lessons is new; Basic and Tools are rewritten. Then the harness is frozen and the procedure scaffold dropped: 80.46\u00a0with it, 80.75\u00a0without.',
      add: [['skill', 'Lessons', 'new'], ['skill', 'Basic', 'refined'], ['skill', 'Tools', 'refined']], tot: [16, 3, 3] },
  ];
  const LAST = STEPS.length - 1;
  const TOTAL = { from: '70.62', to: '80.75', gain: '+10.13' };
  const Y0 = 70, Y1 = 82.5, TICKS = [72, 76, 80], REF = 70.62;
  const HOLD0 = 1200, STEP_MS = 2200;

  /* ---------------- tiny DOM helpers ---------------- */
  function el(tag, cls, parent, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function sv(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function svText(parent, x, y, text, cls, anchor) {
    const t = sv('text', { x: x.toFixed(1), y: y.toFixed(1), class: cls || '' }, parent);
    if (anchor) t.setAttribute('text-anchor', anchor);
    t.textContent = text;
    return t;
  }
  /* chip names break after underscores when a column gets narrow */
  function chipText(node, name) {
    const parts = name.split('_');
    parts.forEach((p, i) => {
      node.appendChild(document.createTextNode(p + (i < parts.length - 1 ? '_' : '')));
      if (i < parts.length - 1) node.appendChild(document.createElement('wbr'));
    });
  }
  const pct = v => ((v - Y0) / (Y1 - Y0) * 100).toFixed(3) + '%';

  /* animations: one registry so a new state cancels whatever is still running */
  const live = new Set();
  function play(node, frames, opts) {
    if (reduced.matches || !node || typeof node.animate !== 'function') return null;
    try {
      const a = node.animate(frames, Object.assign({ duration: 600, easing: EASE, fill: 'backwards' }, opts));
      live.add(a);
      a.onfinish = a.oncancel = () => live.delete(a);
      return a;
    } catch (e) { return null; }
  }
  function cancelAll() { live.forEach(a => { try { a.cancel(); } catch (e) { /* ignore */ } }); live.clear(); }

  /* ---------------- build ---------------- */
  const ui = { cols: [], g: [], chips: [], tracks: [] };
  let cur = 0, geo = null;

  function build() {
    root.textContent = '';
    root.setAttribute('data-ev', 'on');

    /* readout */
    const head = el('div', 'ev-head', root);
    const score = el('div', 'ev-score', head);
    el('div', 'ev-kicker', score, 'Overall accuracy, %');
    const numrow = el('div', 'ev-numrow', score);
    ui.num = el('span', 'ev-num', numrow, f2(STEPS[0].acc));
    ui.delta = el('span', 'ev-delta', numrow, '');
    ui.from = el('div', 'ev-from', score, '');

    ui.story = el('div', 'ev-story', head);
    const title = el('div', 'ev-title', ui.story);
    ui.ver = el('span', 'ev-ver', title);
    ui.op = el('span', 'ev-op', title);
    ui.name = el('span', 'ev-name', title);
    ui.note = el('p', 'ev-note', ui.story);

    const side = el('div', 'ev-side', head);
    ui.btn = el('button', 'ev-play', side);
    ui.btn.type = 'button';
    ui.btnIcon = sv('svg', { viewBox: '0 0 12 12', 'aria-hidden': 'true', focusable: 'false' }, ui.btn);
    ui.btnText = el('span', '', ui.btn, 'Play');

    /* running totals: what the harness holds at this version (doubles as the color key for components) */
    const totals = el('div', 'ev-totals', side);
    ui.totLabel = el('span', 'ev-tot-label', totals, 'Harness at v0');
    ui.tot = [['tool', 'tools'], ['flow', 'workflows'], ['skill', 'skill packages']].map(([kind, word]) => {
      const s = el('span', 'ev-tot', totals);
      s.setAttribute('data-kind', kind);
      el('i', '', s);
      const n = el('b', '', s, '0');
      s.appendChild(document.createTextNode(' ' + word));
      return n;
    });

    /* stage: playhead, chart, columns */
    ui.stage = el('div', 'ev-stage', root);
    ui.ph = el('div', 'ev-ph', ui.stage);
    ui.ph.setAttribute('aria-hidden', 'true');
    ui.svg = sv('svg', { class: 'ev-svg', 'aria-hidden': 'true', focusable: 'false' }, ui.stage);

    ui.raxis = el('div', 'ev-raxis', ui.stage);
    ui.raxis.setAttribute('aria-hidden', 'true');
    const rtrack = el('span', 'ev-raxis-t', ui.raxis);
    TICKS.forEach(t => { const b = el('b', '', rtrack, String(t)); b.style.left = pct(t); });

    ui.colsWrap = el('div', 'ev-cols', ui.stage);
    ui.colsWrap.setAttribute('role', 'group');
    ui.colsWrap.setAttribute('aria-label', 'Harness versions v0 to v6. Use the arrow keys to move between versions.');

    STEPS.forEach((s, k) => {
      const prev = k ? STEPS[k - 1].acc : REF;
      const b = el('button', 'ev-col', ui.colsWrap);
      b.type = 'button';
      b.setAttribute('data-kind', s.kind);
      b.setAttribute('data-k', String(k));
      const names = s.add.map(a => a[1] + (a[2] ? ' (' + a[2] + ')' : ''));
      b.setAttribute('aria-label', `${s.v}, ${s.op === 'Base' ? 'base model' : s.op + ': ' + s.name}. Accuracy ${f2(s.acc)}${s.d ? ', ' + s.d : ''}. ` +
        (k ? `${s.count}: ${names.join(', ')}.` : 'GPT-5.6 Sol with no tools.'));
      b.tabIndex = -1;

      el('span', 'ev-space', b);
      const lab = el('span', 'ev-lab', b);
      el('span', 'ev-lab-v', lab, s.v);
      el('span', 'ev-lab-op', lab, s.op);
      el('span', 'ev-count', b, s.count);

      /* row layout (narrow screens): a horizontal gain bar on the shared accuracy scale */
      const track = el('span', 'ev-track', b);
      track.setAttribute('aria-hidden', 'true');
      TICKS.forEach(t => { el('i', 'ev-tgrid', track).style.left = pct(t); });
      el('i', 'ev-tref', track).style.left = pct(REF);
      const carry = el('i', 'ev-tcarry', track);
      carry.style.left = pct(REF);
      carry.style.width = `calc(${pct(prev)} - ${pct(REF)})`;
      const tg = el('i', 'ev-tghost', track);
      const tb = el('i', 'ev-tbar', track);
      tb.setAttribute('data-kind', s.kind);
      [tg, tb].forEach(n => {
        if (k) { n.style.left = pct(prev); n.style.width = `calc(${pct(s.acc)} - ${pct(prev)})`; }
        else { n.style.left = pct(s.acc); }
      });
      const tval = el('span', 'ev-tval', b, k ? s.d : f2(s.acc));
      ui.tracks.push({ track, bar: tb, ghost: tg, carry, val: tval });

      const chips = el('span', 'ev-chips', b);
      const list = s.add.map(([kind, name, tag]) => {
        const c = el('span', 'ev-chip', chips);
        c.setAttribute('data-kind', kind);
        chipText(c, name);
        if (tag) el('em', 'ev-chip-tag', c, tag);
        return c;
      });
      ui.chips.push(list);
      ui.cols.push(b);
    });

    /* footer: the operator key and what is measured */
    const foot = el('div', 'ev-foot', root);
    const key = el('div', 'ev-key', foot);
    [['tool', 'Expand', 'adds tools'], ['skill', 'Guide', 'adds skills'], ['flow', 'Compile', 'turns tool chains into workflows'], ['skill', 'Refine', 'rewrites skills']].forEach(([kind, op, what]) => {
      const s = el('span', 'ev-key-item', key);
      s.setAttribute('data-kind', kind);
      el('i', '', s);
      el('b', '', s, op);
      s.appendChild(document.createTextNode(' ' + what));
    });
    el('div', 'ev-source', foot, 'Frozen GPT-5.6 Sol · 4,929 questions');

    ui.live = el('p', 'ev-sr', root);
    ui.live.setAttribute('aria-live', 'polite');
  }

  /* ---------------- chart (column layout): SVG in CSS pixels, redrawn on resize ---------------- */
  function measure() {
    const sb = ui.stage.getBoundingClientRect();
    const space = ui.cols[0].querySelector('.ev-space');
    const H = Math.round(space ? space.getBoundingClientRect().height : 0);
    const W = Math.round(sb.width);
    if (!W || !H) return null;
    const cx = [], cl = [], cw = [];
    ui.cols.forEach(c => {
      const r = c.getBoundingClientRect();
      cl.push(r.left - sb.left); cw.push(r.width); cx.push(r.left - sb.left + r.width / 2);
    });
    const top = ui.cols[0].getBoundingClientRect().top - sb.top;
    return { W, H, cx, cl, cw, top, y: v => top + (Y1 - v) / (Y1 - Y0) * H };
  }

  function drawChart() {
    const svg = ui.svg;
    svg.textContent = '';
    ui.g = [];
    ui.anno = [];
    if (!geo) return;
    const { W, cx, cw, y } = geo;
    const Htot = Math.ceil(geo.top + geo.H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', Htot);
    svg.setAttribute('viewBox', `0 0 ${W} ${Htot}`);
    const bw = Math.round(Math.max(24, Math.min(60, cw[0] * 0.44)));
    geo.bw = bw;

    /* grid, y labels, reference line */
    const grid = sv('g', { class: 'ev-grid' }, svg);
    const gx = geo.cl[0] - 6;
    TICKS.forEach(t => {
      sv('line', { x1: gx, x2: W, y1: y(t).toFixed(1), y2: y(t).toFixed(1) }, grid);
      svText(grid, gx - 8, y(t) + 4, String(t), 'ev-tick', 'end');
    });
    const ref = sv('g', { class: 'ev-ref' }, svg);
    sv('line', { x1: (cx[0] + 7).toFixed(1), x2: W, y1: y(REF).toFixed(1), y2: y(REF).toFixed(1) }, ref);
    svText(ref, cx[1] + bw / 2 + 10, y(REF) - 7, 'model alone · 70.62', 'ev-ref-label', 'start');

    /* columns: ghost outline, connector, bar, value */
    STEPS.forEach((s, k) => {
      const g = sv('g', { class: 'ev-g', 'data-kind': s.kind }, svg);
      const top = y(s.acc);
      const parts = { g };
      if (k === 0) {
        parts.bar = sv('circle', { cx: cx[0].toFixed(1), cy: top.toFixed(1), r: 5.5, class: 'ev-dot' }, g);
        parts.val = svText(g, cx[0], top - 13, f2(s.acc), 'ev-val', 'middle');
      } else {
        const pv = STEPS[k - 1].acc, bot = y(pv);
        const x0 = cx[k] - bw / 2, h = Math.max(1.5, bot - top);
        const lx0 = (k === 1 ? cx[0] + 7 : cx[k - 1] + bw / 2), lx1 = x0;
        parts.ghost = sv('g', { class: 'ev-ghost' }, g);
        sv('rect', { x: x0.toFixed(1), y: top.toFixed(1), width: bw, height: h.toFixed(1), rx: Math.min(3, h / 2).toFixed(1) }, parts.ghost);
        sv('line', { x1: lx0.toFixed(1), x2: lx1.toFixed(1), y1: bot.toFixed(1), y2: bot.toFixed(1) }, parts.ghost);
        parts.link = sv('line', { x1: lx0.toFixed(1), x2: lx1.toFixed(1), y1: bot.toFixed(1), y2: bot.toFixed(1), class: 'ev-link' }, g);
        parts.linkLen = Math.max(1, lx1 - lx0);
        parts.link.setAttribute('stroke-dasharray', parts.linkLen.toFixed(1) + ' ' + parts.linkLen.toFixed(1));
        parts.bar = sv('rect', { x: x0.toFixed(1), y: top.toFixed(1), width: bw, height: h.toFixed(1), rx: Math.min(3, h / 2).toFixed(1), class: 'ev-bar', 'data-kind': s.kind }, g);
        parts.val = svText(g, cx[k], top - 9, s.d, 'ev-val', 'middle');
      }
      ui.g.push(parts);
    });

    /* annotation 1: v4 vs v5, the same budget of change, very different gains */
    const a4 = sv('g', { class: 'ev-anno', 'data-kind': 'tool' }, svg);
    const a5 = sv('g', { class: 'ev-anno', 'data-kind': 'flow' }, svg);
    const base = Math.max(y(STEPS[3].acc), y(STEPS[4].acc)) + 26;
    [[a4, 4, ['+5 tools', 'no new workflows'], '+0.20'], [a5, 5, ['no new tools', '+3 workflows'], '+2.37']].forEach(([g, k, lines, v]) => {
      const x = cx[k];
      const b0 = y(STEPS[k - 1].acc) + 5;
      sv('line', { x1: x.toFixed(1), x2: x.toFixed(1), y1: b0.toFixed(1), y2: (base - 14).toFixed(1), class: 'ev-leader' }, g);
      lines.forEach((t, i) => svText(g, x, base + i * 16, t, 'ev-anno-t' + (t.charAt(0) === '+' ? ' ev-add' : ''), 'middle'));
      svText(g, x, base + lines.length * 16 + 12, v, 'ev-anno-v', 'middle');
    });

    /* annotation 2 (end state): the whole rise over the model alone */
    const tg = sv('g', { class: 'ev-total' }, svg);
    const bx = Math.min(W - 3, cx[LAST] + bw / 2 + 14);
    const yt = y(STEPS[LAST].acc), yb = y(REF);
    sv('path', { d: `M${bx - 5} ${yt.toFixed(1)}H${bx}V${yb.toFixed(1)}H${bx - 5}`, class: 'ev-bracket' }, tg);
    const my = y(STEPS[LAST - 1].acc) + (yb - y(STEPS[LAST - 1].acc)) * 0.52;
    svText(tg, bx - 9, my, TOTAL.gain, 'ev-total-v', 'end');
    svText(tg, bx - 9, my + 20, 'in total', 'ev-total-t', 'end');
    ui.anno = [{ g: a4, from: 4 }, { g: a5, from: 5 }, { g: tg, from: LAST }];
  }

  /* ---------------- state ---------------- */
  function setClasses(j) {
    ui.cols.forEach((c, k) => {
      c.classList.toggle('ev-past', k < j);
      c.classList.toggle('ev-cur', k === j);
      c.classList.toggle('ev-future', k > j);
      if (k === j) c.setAttribute('aria-current', 'step'); else c.removeAttribute('aria-current');
      c.tabIndex = k === j ? 0 : -1;
    });
    ui.g.forEach((p, k) => {
      p.g.classList.toggle('ev-past', k < j);
      p.g.classList.toggle('ev-cur', k === j);
      p.g.classList.toggle('ev-future', k > j);
    });
    (ui.anno || []).forEach(a => a.g.classList.toggle('ev-on', j >= a.from));
    root.classList.toggle('ev-at-end', j === LAST);
  }

  function placePlayhead(j, animate) {
    const ph = ui.ph;
    if (!geo || root.classList.contains('ev-rows')) return;
    const left = geo.cl[j] + 2, w = geo.cw[j] - 4;
    if (!animate || reduced.matches) {
      ph.classList.add('ev-still');
      ph.style.transform = `translateX(${left.toFixed(1)}px)`;
      ph.style.width = w.toFixed(1) + 'px';
      void ph.offsetWidth;
      ph.classList.remove('ev-still');
    } else {
      ph.style.transform = `translateX(${left.toFixed(1)}px)`;
      ph.style.width = w.toFixed(1) + 'px';
    }
  }

  let countRaf = 0, shown = STEPS[0].acc;
  function countTo(target, animate) {
    if (countRaf) cancelAnimationFrame(countRaf);
    countRaf = 0;
    const from = shown;
    if (!animate || reduced.matches || Math.abs(target - from) < 0.005) {
      shown = target; ui.num.textContent = f2(target); return;
    }
    const t0 = performance.now(), dur = 900;
    const tick = quiet(now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      shown = from + (target - from) * e;
      ui.num.textContent = f2(p === 1 ? target : shown);
      if (p < 1) countRaf = requestAnimationFrame(tick); else { countRaf = 0; shown = target; }
    });
    countRaf = requestAnimationFrame(tick);
  }

  function setReadout(j, animate) {
    const s = STEPS[j];
    ui.ver.textContent = s.v;
    ui.op.textContent = s.op === 'Base' ? 'Model alone' : s.op;
    ui.op.setAttribute('data-kind', s.kind);
    ui.name.textContent = s.name;
    ui.note.textContent = s.note;
    ui.delta.textContent = s.d || 'base';
    ui.delta.setAttribute('data-kind', s.kind);
    ui.from.textContent = '';
    if (j === 0) ui.from.textContent = 'GPT-5.6 Sol with no harness';
    else if (j === LAST) {
      ui.from.appendChild(document.createTextNode(`${TOTAL.from} to ${TOTAL.to}: `));
      el('b', '', ui.from, `${TOTAL.gain} over the model alone`);
    } else ui.from.textContent = `from ${f2(STEPS[j - 1].acc)} at ${STEPS[j - 1].v}`;
    countTo(s.acc, animate);
    if (animate) {
      play(ui.story, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420 });
      play(ui.delta, [{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 380 });
      play(ui.from, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 200 });
    }
    /* totals */
    ui.totLabel.textContent = 'Harness at ' + s.v;
    ui.tot.forEach((n, i) => {
      const was = n.textContent, now = String(s.tot[i]);
      n.textContent = now;
      if (animate && was !== now) play(n.parentNode, [{ opacity: .25, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 260 });
    });
  }

  /* mode: 'instant' (no motion), 'step' (autoplay advance), 'jump' (user choice) */
  function go(j, mode) {
    j = Math.max(0, Math.min(LAST, j));
    const prev = cur;
    cur = j;
    cancelAll();
    const animate = mode !== 'instant' && !reduced.matches;
    setClasses(j);
    setReadout(j, animate);
    placePlayhead(j, animate);
    if (!animate) return;

    const forward = j > prev;
    /* columns revealed in passing (a jump over several versions) fade in quickly */
    if (forward) for (let k = prev + 1; k < j; k++) revealQuick(k);
    /* hidden again when jumping back: fade the ghosts in */
    if (!forward) for (let k = j + 1; k <= prev; k++) { const p = ui.g[k]; if (p && p.ghost) play(p.ghost, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); }
    if (forward || mode === 'step') growColumn(j);
    else if (j !== prev) pulseColumn(j);
  }

  function revealQuick(k) {
    const p = ui.g[k];
    if (p) [p.bar, p.link, p.val].forEach(n => play(n, [{ opacity: 0 }, { opacity: 1 }], { duration: 320 }));
    (ui.chips[k] || []).forEach(c => play(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 320 }));
    const t = ui.tracks[k];
    if (t) [t.bar, t.carry, t.val].forEach(n => play(n, [{ opacity: 0 }, { opacity: 1 }], { duration: 320 }));
  }

  function growColumn(k) {
    const p = ui.g[k];
    const rows = root.classList.contains('ev-rows');
    if (p && !rows) {
      if (p.link) play(p.link, [{ strokeDashoffset: p.linkLen }, { strokeDashoffset: 0 }], { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)' });
      if (p.ghost) play(p.ghost, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 250 });
      if (k === 0) play(p.bar, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 520 });
      else play(p.bar, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 760, delay: 260 });
      play(p.val, [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: k ? 820 : 300 });
    }
    const t = ui.tracks[k];
    if (t && rows) {
      if (k) play(t.carry, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)' });
      play(t.bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 760, delay: 260 });
      play(t.val, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 820 });
    }
    (ui.chips[k] || []).forEach((c, i) => play(c, [{ opacity: .3, transform: 'translateY(7px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 380 + i * 90 }));
    (ui.anno || []).forEach(a => { if (a.from === k) play(a.g, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: k === LAST ? 1250 : 1050 }); });
    if (k === LAST) play(ui.from, [{ opacity: 0 }, { opacity: 1 }], { duration: 520, delay: 1250 });
  }

  function pulseColumn(k) {
    const p = ui.g[k];
    if (p && p.val) play(p.val, [{ opacity: .3 }, { opacity: 1 }], { duration: 360 });
  }

  /* ---------------- playback ---------------- */
  let intent = false, onScreen = false, started = false, touched = false, timer = 0, dueAt = 0, left = 0;

  function setButton() {
    const playing = intent;
    const end = cur === LAST && !playing;
    ui.btn.classList.toggle('ev-playing', playing);
    ui.btnText.textContent = playing ? 'Pause' : end ? 'Replay' : 'Play';
    ui.btn.setAttribute('aria-label', playing ? 'Pause the evolution' : end ? 'Replay the evolution from v0' : 'Play the evolution');
    ui.btnIcon.textContent = '';
    if (playing) { sv('rect', { x: 2.2, y: 1.6, width: 2.6, height: 8.8, rx: .6 }, ui.btnIcon); sv('rect', { x: 7.2, y: 1.6, width: 2.6, height: 8.8, rx: .6 }, ui.btnIcon); }
    else if (end) {
      sv('path', { d: 'M9.6 6.9A3.8 3.8 0 1 1 8.4 3.3', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, ui.btnIcon);
      sv('path', { d: 'M10.4 1.4v3.4H7z' }, ui.btnIcon);
    } else sv('path', { d: 'M3 1.6v8.8L10.4 6z' }, ui.btnIcon);
  }

  function clearTimer() { if (timer) clearTimeout(timer); timer = 0; }

  function schedule(delay) {
    clearTimer();
    if (!intent) return;
    if (!onScreen || document.hidden) { left = delay; return; }   // resume later with what was left
    dueAt = performance.now() + delay;
    timer = setTimeout(quiet(() => {
      timer = 0;
      if (!intent) return;
      if (cur >= LAST) { intent = false; setButton(); return; }
      go(cur + 1, 'step');
      if (cur >= LAST) { intent = false; setButton(); return; }
      schedule(STEP_MS);
    }), Math.max(0, delay));
  }

  function pauseForVisibility() {
    if (!timer) return;
    left = Math.max(300, dueAt - performance.now());
    clearTimer();
  }
  /* coming back on screen (or to the tab): give the reader a moment before the next step */
  function resumeIfPossible() {
    if (intent && !timer && onScreen && !document.hidden) schedule(Math.max(1200, left || 0));
  }

  function startPlayback(fromStart) {
    intent = true;
    if (fromStart || cur >= LAST) {
      /* already showing v0 (first autoplay): just hold it; from v6 (Replay): rewind visibly */
      if (cur !== 0) go(0, reduced.matches ? 'instant' : 'step');
      left = HOLD0;
    } else left = 450;
    setButton();
    schedule(left);
  }
  function stopPlayback() { intent = false; clearTimer(); left = 0; setButton(); }

  function announce(j) {
    const s = STEPS[j];
    ui.live.textContent = `${s.v}, ${s.op === 'Base' ? 'base model' : s.op + ', ' + s.name}: accuracy ${f2(s.acc)}${s.d ? ' (' + s.d + ')' : ''}.` +
      (j === LAST ? ` ${TOTAL.from} to ${TOTAL.to}, ${TOTAL.gain} over the model alone.` : '');
  }

  function choose(j, focus) {
    touched = true;
    stopPlayback();
    if (j !== cur) go(j, 'jump');
    setButton();
    announce(j);
    if (focus && ui.cols[j]) { try { ui.cols[j].focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }

  /* ---------------- layout ---------------- */
  let rafLayout = 0, lastW = -1, lastRows = null;
  function layout(force) {
    rafLayout = 0;
    const rows = !!rowsMq.matches;
    root.classList.toggle('ev-rows', rows);
    const w = root.clientWidth;
    if (!force && w === lastW && rows === lastRows && (rows || geo)) return;
    lastW = w; lastRows = rows;
    if (rows) { geo = null; ui.svg.textContent = ''; ui.g = []; ui.anno = []; setClasses(cur); lockStory(); return; }
    geo = measure();
    drawChart();
    setClasses(cur);
    placePlayhead(cur, false);
    lockStory();
  }

  /* the readout takes the height of its tallest version at this width, so stepping never shifts the page */
  function lockStory() {
    const story = ui.story;
    story.style.minHeight = '';
    const w = story.getBoundingClientRect().width;
    if (!w || !story.parentNode) return;
    const probe = story.cloneNode(true);
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;min-height:0;width:${w}px`;
    story.parentNode.appendChild(probe);
    const part = c => probe.querySelector('.' + c);
    const ver = part('ev-ver'), op = part('ev-op'), name = part('ev-name'), note = part('ev-note');
    let max = 0;
    STEPS.forEach(s => {
      if (ver) ver.textContent = s.v;
      if (op) { op.textContent = s.op === 'Base' ? 'Model alone' : s.op; op.setAttribute('data-kind', s.kind); }
      if (name) name.textContent = s.name;
      if (note) note.textContent = s.note;
      max = Math.max(max, probe.getBoundingClientRect().height);
    });
    probe.remove();
    story.style.minHeight = Math.ceil(max) + 'px';
  }
  function requestLayout(force) {
    if (force) { if (rafLayout) cancelAnimationFrame(rafLayout); rafLayout = 0; layout(true); return; }
    if (!rafLayout) rafLayout = requestAnimationFrame(quiet(() => layout(false)));
  }

  /* ---------------- init ---------------- */
  function init() {
    build();
    const autoplay = !reduced.matches && 'IntersectionObserver' in window;
    cur = autoplay ? 0 : LAST;
    shown = STEPS[cur].acc;
    layout(true);
    go(cur, 'instant');
    setButton();

    ui.btn.addEventListener('click', quiet(() => {
      touched = true;
      onScreen = true;   /* it was just clicked, so it is on screen */
      if (intent) stopPlayback(); else startPlayback(cur >= LAST);
    }));
    ui.cols.forEach((c, k) => c.addEventListener('click', quiet(() => choose(k, false))));
    ui.colsWrap.addEventListener('keydown', quiet(e => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      let j = null;
      if (k) j = Math.max(0, Math.min(LAST, cur + k));
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = LAST;
      if (j === null) return;
      e.preventDefault();
      choose(j, true);
    }));

    if ('ResizeObserver' in window) new ResizeObserver(quiet(() => requestLayout(false))).observe(root);
    else window.addEventListener('resize', quiet(() => requestLayout(false)));
    const onMq = quiet(() => requestLayout(true));
    if (rowsMq.addEventListener) rowsMq.addEventListener('change', onMq);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(quiet(() => requestLayout(true)));
    if (reduced.addEventListener) reduced.addEventListener('change', quiet(() => {
      if (reduced.matches) { cancelAll(); if (!touched) { stopPlayback(); go(LAST, 'instant'); setButton(); } }
    }));

    document.addEventListener('visibilitychange', quiet(() => { if (document.hidden) pauseForVisibility(); else resumeIfPossible(); }));

    /* visibility drives both the one-time autoplay and pausing any playback while off-screen */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(quiet(entries => {
        entries.forEach(en => {
          const vh = window.innerHeight || document.documentElement.clientHeight || 1;
          const seen = en.isIntersecting ? en.intersectionRect.height / Math.max(1, Math.min(en.boundingClientRect.height, vh)) : 0;
          if (seen >= 0.5) {
            onScreen = true;
            if (autoplay && !started && !touched && !reduced.matches) { started = true; startPlayback(true); }
            else resumeIfPossible();
          } else if (seen < 0.2) {
            onScreen = false;
            pauseForVisibility();
          }
        });
      }), { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
      io.observe(root);
    } else onScreen = true;
  }

  try { init(); } catch (e) { /* fail quietly: the section lede still carries the message */ }
})();
