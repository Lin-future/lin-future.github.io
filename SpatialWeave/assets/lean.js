/* 05 · Leaner once evolution ends: the same frozen GPT-5.6 Sol and the same library, with the procedure
   scaffold used during evolution (SpatialWeave + procedure guidance) and without it (SpatialWeave), per question
   over the 4,929 evaluation questions.
   Numbers: paper Table "inference usage" and the frozen exports it is built from
   (iclr27-paper/submission/research-update-2026-09-23: tokens_and_tools.csv, calls_by_name.csv, before_after.csv).
   Both bars of a metric grow at the same speed, so the shorter one finishes first; the tool-use grids fill one
   question per tick. Plays when the panel comes into view (again after it has left the screen) or on Replay.
   Everything lives inside #lean-root; classes are prefixed "ln-". Never throws. */
(window.SW_FONTS || Promise.resolve()).then(() => {
  'use strict';
  const root = document.getElementById('lean-root');
  if (!root || root.getAttribute('data-ln') === 'on') return;
  root.setAttribute('data-ln', 'on');

  const SW = window.SW || {};
  const media = q => { try { return window.matchMedia(q); } catch (e) { return { matches: false }; } };
  const reduced = SW.reduced || media('(prefers-reduced-motion: reduce)');
  const still = () => !!reduced.matches;
  const quiet = fn => function () { try { return fn.apply(this, arguments); } catch (e) { /* fail quietly */ } };

  /* ---------------- data ---------------- */
  /* per question; mix = [image inspection (inspect_image, marker_read), other tools, workflows] from calls_by_name.csv */
  const CFG = [
    { k: 'before', name: 'With the scaffold', sub: 'during evolution', acc: '80.46', calls: 5.509, mix: [1.846, 3.444, 0.220], tokens: 174597, out: 1543, llm: 6.5147, cover: 95.78 },
    { k: 'after', name: 'SpatialWeave', sub: 'deployed', acc: '80.75', calls: 2.973, mix: [0.564, 2.171, 0.239], tokens: 126451, out: 1004, llm: 5.1193, cover: 71.88 },
  ];
  const GROUPS = [
    { k: 'insp', name: 'Image inspection', tip: 'inspect_image, marker_read' },
    { k: 'other', name: 'Other tools', tip: 'perception, geometry, checks' },
    { k: 'flow', name: 'Workflows', tip: 'compiled tool chains' },
  ];
  /* tool calls per question by benchmark (before_after.csv); reductions from the unrounded means */
  const BENCH = [
    ['CV-Bench3D', 'CV3D', 6.96, 3.44, 50.6], ['BLINK', 'BLINK', 4.35, 1.90, 56.5], ['MindCube', 'MindCube', 2.34, 1.15, 51.0],
    ['SPBench', 'SPBench', 7.60, 4.82, 36.6], ['ERQA', 'ERQA', 3.02, 0.94, 68.8], ['Omni3D-Bench', 'Omni3D', 7.16, 3.61, 49.6],
    ['MMSI-Bench', 'MMSI', 5.33, 3.14, 41.0],
  ];
  const DELTA = { calls: '−46%', tokens: '−28%', out: '−35%' };
  const RACE_MS = 2600, CELL_MS = 21;

  /* ---------------- helpers ---------------- */
  function el(tag, cls, parent, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  }
  const f2 = v => v.toFixed(2);
  const kTok = v => (v / 1000).toFixed(1) + 'k';
  const comma = v => Math.round(v).toLocaleString('en-US');

  /* ---------------- build ---------------- */
  root.innerHTML = '';
  const top = el('div', 'ln-top', root);
  el('p', 'ln-kicker', top, 'One question, on average <span>GPT-5.6 Sol · 4,929 questions · same tools, workflows and skills</span>');
  const replay = el('button', 'ln-replay', top, '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9"/><path d="M13.8 2.2v3.2h-3.2"/></svg><span>Replay</span>');
  replay.type = 'button';
  replay.setAttribute('aria-label', 'Replay the comparison');

  const grid = el('div', 'ln-grid', root);
  const main = el('div', 'ln-main', grid);
  const side = el('div', 'ln-side', grid);

  const counters = [];      /* { node, to, fmt, dur, delay } */
  const bars = [];          /* { node, dur, delay } */
  const pops = [];          /* { node, delay } */

  function race(title, delta, key, rows, note, delay) {
    const r = el('div', `ln-race ln-${key}`, main);
    const h = el('div', 'ln-rhead', r);
    el('h3', '', h, title);
    const d = el('b', 'ln-delta', h, delta);
    const max = Math.max.apply(null, rows.map(x => x.v));
    rows.forEach(x => {
      const row = el('div', `ln-row ln-${x.c.k}`, r);
      el('span', 'ln-who', row, `${x.c.name}<small>${x.c.sub}</small>`);
      const track = el('div', 'ln-track', row);
      const bar = el('div', 'ln-bar', track);
      bar.style.width = (100 * x.v / max).toFixed(2) + '%';
      if (x.segs) x.segs.forEach((v, i) => { const s = el('i', `ln-seg ln-${GROUPS[i].k}`, bar); s.style.flexGrow = String(v); s.title = `${GROUPS[i].name}: ${f2(v)} per question`; });
      const val = el('span', 'ln-val', row, x.fmt(x.v));
      const dur = RACE_MS * x.v / max;
      bars.push({ node: bar, dur, delay });
      counters.push({ node: val, to: x.v, fmt: x.fmt, dur, delay });
    });
    pops.push({ node: d, delay: delay + RACE_MS * Math.min.apply(null, rows.map(x => x.v)) / max + 80 });
    if (note) el('div', 'ln-note', r, note);
    return r;
  }

  race('Tool calls per question', DELTA.calls, 'calls',
    CFG.map(c => ({ c, v: c.calls, segs: c.mix, fmt: f2 })),
    `<ul class="ln-key">${GROUPS.map((g, i) => `<li title="${g.tip}"><i class="ln-sw ln-${g.k}"></i>${g.name} <span>${f2(CFG[0].mix[i])} → <b>${f2(CFG[1].mix[i])}</b></span></li>`).join('')}</ul>`, 0);
  race('Tokens per question', DELTA.tokens, 'tokens',
    CFG.map(c => ({ c, v: c.tokens, fmt: kTok })),
    `<p class="ln-sub">Output tokens ${comma(CFG[0].out)} → <b>${comma(CFG[1].out)}</b> (${DELTA.out}). Most tokens are input, which grows with every model call: ${f2(CFG[0].llm)} → <b>${f2(CFG[1].llm)}</b> calls per question.</p>`, 380);

  /* tool use per 100 questions */
  const waf = el('div', 'ln-card ln-waf', side);
  el('h3', '', waf, 'Questions that call any tool');
  el('p', 'ln-sub', waf, 'Out of 100. The rest are answered from the images alone.');
  const wafs = el('div', 'ln-wafs', waf);
  const cells = [];
  CFG.forEach(c => {
    const n = Math.round(c.cover);
    const w = el('div', `ln-w ln-${c.k}`, wafs);
    const g = el('div', 'ln-cells', w);
    g.setAttribute('aria-hidden', 'true');
    const list = [];
    /* every cell is drawn empty; a question that calls a tool gets a fill that pops in */
    for (let i = 0; i < 100; i++) { const q = el('i', i < n ? 'on' : '', g); if (i < n) list.push(el('b', '', q)); }
    const cap = el('p', 'ln-wcap', w, `<b>${n}</b><span>${c.name}</span>`);
    cells.push({ list, count: cap.querySelector('b'), n });
  });

  /* accuracy */
  const acc = el('div', 'ln-card ln-acc', side);
  el('h3', '', acc, 'Accuracy');
  const accs = el('div', 'ln-accs', acc);
  CFG.forEach(c => el('p', `ln-a ln-${c.k}`, accs, `<b>${c.acc}</b><span>${c.name}</span>`));
  const held = el('p', 'ln-held', acc, '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 6.4 4.8 9l5-5.6"/></svg>Held, with 46% fewer tool calls');
  pops.push({ node: held, delay: RACE_MS + 420 });

  /* per benchmark */
  const bench = el('div', 'ln-bench', root);
  el('h3', '', bench, 'Fewer tool calls on all seven benchmarks <span>and 21–32% fewer tokens on each</span>');
  const cols = el('div', 'ln-cols', bench);
  const bmax = Math.max.apply(null, BENCH.map(b => b[2]));
  const vbars = [];
  BENCH.forEach((b, i) => {
    const col = el('div', 'ln-col', cols);
    col.setAttribute('title', `${b[0]}: ${f2(b[2])} → ${f2(b[3])} tool calls per question`);
    const pair = el('div', 'ln-pair', col);
    [[b[2], 'before'], [b[3], 'after']].forEach(([v, k], j) => {
      const vb = el('i', `ln-vb ln-${k}`, pair);
      vb.style.height = (100 * v / bmax).toFixed(1) + '%';
      vbars.push({ node: vb, dur: 1500 * v / bmax, delay: 700 + i * 70 });
    });
    el('b', '', col, `−${Math.round(b[4])}%`);
    el('span', '', col, b[1]);
  });

  /* screen readers: the same comparison as sentences */
  const vh = el('p', 'ln-vh', root);
  vh.textContent = `Per question over 4,929 questions, GPT-5.6 Sol with the same library: tool calls ${f2(CFG[0].calls)} with the scaffold and ${f2(CFG[1].calls)} without (46.0% fewer); ` +
    `tokens ${comma(CFG[0].tokens)} and ${comma(CFG[1].tokens)} (27.6% fewer); output tokens ${comma(CFG[0].out)} and ${comma(CFG[1].out)} (34.9% fewer); ` +
    `questions using any tool ${CFG[0].cover}% and ${CFG[1].cover}%; accuracy ${CFG[0].acc} and ${CFG[1].acc}. ` +
    `Tool calls fall on all seven benchmarks: ${BENCH.map(b => `${b[0]} ${f2(b[2])} to ${f2(b[3])}`).join(', ')}.`;

  /* ---------------- motion ---------------- */
  let running = [], raf = 0, t0 = 0, played = false;
  function stop() {
    running.forEach(a => { try { a.cancel(); } catch (e) { /* gone */ } });
    running = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function finalState() {
    stop();
    counters.forEach(c => { c.node.textContent = c.fmt(c.to); });
    cells.forEach(w => { w.count.textContent = String(w.n); });
  }
  const A = (node, frames, opts) => { if (!node.animate) return; const a = node.animate(frames, opts); running.push(a); };
  const play = quiet(() => {
    stop();
    if (still()) { finalState(); return; }
    played = true;
    bars.forEach(b => A(b.node, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: b.dur, delay: b.delay, easing: 'linear', fill: 'backwards' }));
    pops.forEach(p => A(p.node, [{ opacity: 0, transform: 'translateY(4px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: p.delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
    cells.forEach(w => w.list.forEach((q, i) => A(q, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 250 + i * CELL_MS, easing: 'ease-out', fill: 'backwards' })));
    vbars.forEach(v => A(v.node, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: v.dur, delay: v.delay, easing: 'linear', fill: 'backwards' }));
    counters.forEach(c => { c.node.textContent = c.fmt(0); });
    cells.forEach(w => { w.count.textContent = '0'; });
    t0 = performance.now();
    const tick = quiet(now => {
      const t = now - t0;
      let busy = false;
      counters.forEach(c => {
        const p = Math.max(0, Math.min(1, (t - c.delay) / c.dur));
        if (p < 1) busy = true;
        c.node.textContent = c.fmt(c.to * p);
      });
      cells.forEach(w => {
        const k = Math.max(0, Math.min(w.n, Math.floor((t - 250) / CELL_MS) + 1));
        if (k < w.n) busy = true;
        w.count.textContent = String(k);
      });
      raf = busy ? requestAnimationFrame(tick) : 0;
    });
    raf = requestAnimationFrame(tick);
  });

  replay.addEventListener('click', play);
  const paintReplay = () => { replay.hidden = still(); };
  paintReplay();
  if (reduced.addEventListener) reduced.addEventListener('change', () => { paintReplay(); if (still()) finalState(); });

  /* play when at least a third of the panel is on screen; replay after it has left the screen entirely */
  finalState();
  if ('IntersectionObserver' in window && !still()) {
    let armed = true;
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.intersectionRatio >= 0.34 && armed) { armed = false; play(); }
      else if (!en.isIntersecting) { armed = true; if (played) finalState(); }
    }), { threshold: [0, 0.34, 0.6] });
    io.observe(root);
  }
});
