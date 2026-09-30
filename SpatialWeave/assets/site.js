(() => {
const BENCH = [
  { key: 'CV-Bench3D', short: 'CV3D', n: 960 },
  { key: 'BLINK', short: 'BLINK', n: 556 },
  { key: 'MindCube', short: 'MindCube', n: 840 },
  { key: 'SPBench', short: 'SPBench', n: 1054 },
  { key: 'ERQA', short: 'ERQA', n: 320 },
  { key: 'Omni3D-Bench', short: 'Omni3D', n: 397 },
  { key: 'MMSI-Bench', short: 'MMSI', n: 802 },
];
const BB = [
  { key: 'sol', name: 'GPT-5.6 Sol', short: 'Sol', base: [90.10, 84.71, 71.67, 58.98, 70.00, 62.82, 55.86, 70.62], ours: [96.25, 91.19, 93.10, 75.65, 71.25, 62.97, 61.35, 80.75] },
  { key: 'qwen', name: 'Qwen3.8-27B', short: 'Qwen', base: [93.44, 83.45, 70.24, 55.42, 65.94, 65.16, 46.13, 68.47], ours: [96.77, 92.81, 90.83, 76.51, 68.44, 68.44, 59.10, 80.73] },
  { key: 'gemma', name: 'Gemma-4-31B', short: 'Gemma', base: [91.77, 77.88, 64.88, 53.83, 58.13, 53.88, 37.41, 63.43], ours: [94.79, 90.65, 84.17, 66.68, 58.75, 54.94, 49.50, 73.58] },
];
const ASTRA = { name: 'GPT-6 Astra', base: [96.77, 86.51, 88.33, 62.38, 82.50, 73.45, 73.82, 80.28], ours: [97.40, 92.09, 94.64, 77.46, 81.56, 72.70, 74.69, 85.35] };
const OTHERS = [
  { name: 'Meta-Harness', bb: 'Sol', v: [90.10, 84.71, 80.95, 58.61, 69.69, 62.82, 55.99, 72.13] },
  { name: 'pySpatial', bb: 'Sol', v: [92.92, 81.29, 83.69, 53.46, 61.25, 57.30, 45.39, 68.94] },
  { name: 'SpatialClaw', bb: 'Gemma', v: [94.69, 84.35, 78.21, 67.59, 57.19, 54.11, 51.75, 72.23] },
];
const CAPTIONS = [
  { text: 'Which object is closer to the camera, or to another object? Recorded Sol chain on question #1024:', chain: [['tool', 'marker_read'], ['tool', 'detect_objects'], ['tool', 'reconstruct_scene'], ['tool', 'relative_position'], ['tool', 'answer_check'], ['ans', 'trailer']] },
  { text: 'Did the camera move left or right between the frames? The camera_motion workflow separates translation from turning (question #110):', chain: [['skill', 'Tools skill'], ['tool', 'reconstruct_scene'], ['flow', 'camera_motion'], ['ans', '(B) right']] },
  { text: 'Mental rotation from limited views. The Lessons skill matters most here: removing it costs 9.05 points in the component study.', chain: [['skill', 'Basic'], ['skill', 'Tools'], ['skill', 'Lessons']] },
  { text: 'Metric distances in rooms. Closest-point distance with a guarded re-grounding (question MV #297):', chain: [['tool', 'detect_objects'], ['flow', 'measure_pair'], ['tool', 'near_touch_guard'], ['tool', 'query_points'], ['flow', 'measure_pair'], ['ans', '0.29 m']] },
  { text: 'Embodied reasoning with knowledge-heavy questions. Gains here are the smallest of the seven benchmarks.', chain: [['tool', 'detect_objects'], ['tool', 'inspect_image']] },
  { text: '3D questions with numeric answers, scored by mean relative accuracy on metric quantities.', chain: [['tool', 'detect_objects'], ['tool', 'estimate_depth'], ['flow', 'measure_pair']] },
  { text: 'Relations across several images of one scene. Recorded Sol chain on question #120:', chain: [['tool', 'detect_objects'], ['tool', 'reconstruct_scene'], ['tool', 'relative_position'], ['ans', 'chair']] },
];

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const ease = 'cubic-bezier(.22,1,.36,1)';
const fmt = v => v.toFixed(2);
function svgEl(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function anim(node, frames, opts) {
  if (reduced.matches) return null;
  return node.animate(frames, Object.assign({ duration: 720, easing: ease, fill: 'backwards' }, opts));
}

/* shared with the section modules (evolution.js, showcase.js) */
window.SW = { BENCH, BB, ASTRA, OTHERS, reduced, svgEl, anim, ease, fmt };

/* ---------------- hero state ---------------- */
let sel = { b: 1, m: 0 };
const atlas = $('atlas');
atlas.appendChild(Object.assign(document.createElement('span'), {}));
BENCH.forEach(b => {
  const l = document.createElement('span');
  l.className = 'collab'; l.textContent = b.short;
  atlas.appendChild(l);
});
const nodes = [];
BB.forEach((bb, m) => {
  const r = document.createElement('span');
  r.className = 'rowlab'; r.textContent = bb.short;
  atlas.appendChild(r);
  BENCH.forEach((b, i) => {
    const g = bb.ours[i] - bb.base[i];
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'node';
    btn.style.setProperty('--d', Math.max(0.06, Math.min(1, g / 21)).toFixed(3));
    btn.setAttribute('aria-label', `${b.key}, ${bb.name}: +${fmt(g)} points`);
    btn.title = `${b.key} · ${bb.name} · +${fmt(g)}`;
    btn.dataset.b = i; btn.dataset.m = m;
    btn.addEventListener('click', () => { stopCycle(); select(i, m, true); });
    atlas.appendChild(btn); nodes.push(btn);
  });
});
atlas.addEventListener('pointermove', e => {
  if (reduced.matches || e.pointerType === 'touch') return;
  nodes.forEach(n => {
    const r = n.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy);
    const pull = Math.max(0, 1 - d / 70);
    n.style.setProperty('--nx', (dx * pull * .22).toFixed(2) + 'px');
    n.style.setProperty('--ny', (dy * pull * .22).toFixed(2) + 'px');
    n.style.setProperty('--ns', (1 + pull * .35).toFixed(3));
  });
});
atlas.addEventListener('pointerleave', () => nodes.forEach(n => { n.style.removeProperty('--nx'); n.style.removeProperty('--ny'); n.style.removeProperty('--ns'); }));

/* scene art: one line drawing per benchmark, three depth layers */
const grid = $('layer-grid');
for (let x = 20; x <= 440; x += 20) for (let y = 20; y <= 200; y += 20) svgEl('circle', { cx: x, cy: y, r: .9, class: 'dot-ink', opacity: .35 }, grid);
const ART = [
  // CV-Bench3D: camera looking at two objects on a ground plane, depth rays
  `<g data-depth="1"><path class="ln" d="M60 190 L400 190 M90 160 L370 160"/><path class="ln-soft" d="M60 190 L90 160 M400 190 L370 160"/></g>
   <g data-depth="1.6"><rect class="tl-fill" x="150" y="112" width="58" height="48" rx="2"/><path class="tl" d="M150 112 l12 -10 h58 l-12 10 M220 102 v48 l-12 10"/>
   <rect class="acc-fill" x="276" y="96" width="70" height="64" rx="2"/><path class="acc" d="M276 96 l14 -12 h70 l-14 12 M360 84 v64 l-14 12"/></g>
   <g data-depth="2.4"><rect class="ln" x="40" y="58" width="36" height="24" rx="4"/><circle class="ln" cx="58" cy="70" r="7"/><path class="ln" d="M76 64 l10 -5 v22 l-10 -5"/>
   <path class="acc" stroke-dasharray="3 4" d="M86 70 L180 130 M86 70 L310 126"/><text class="svg-text" x="146" y="140" text-anchor="end">nearer</text><text class="svg-text-acc" x="272" y="82" text-anchor="end">farther</text></g>`,
  // BLINK: two camera poses, translation right, turn left
  `<g data-depth="1"><ellipse class="ln-soft" cx="230" cy="150" rx="150" ry="46"/></g>
   <g data-depth="1.5"><path class="ln" d="M218 150 v-44 a12 6 0 0 1 24 0 v44 a12 6 0 0 1 -24 0z M222 100 v-12 h16 v12"/></g>
   <g data-depth="2.3"><g transform="translate(110 176) rotate(-20)"><rect class="ln" x="-16" y="-11" width="32" height="22" rx="4"/><circle class="ln" cx="0" cy="0" r="6"/></g>
   <g transform="translate(330 176) rotate(-62)"><rect class="acc-fill" x="-16" y="-11" width="32" height="22" rx="4"/><circle class="acc" cx="0" cy="0" r="6"/></g>
   <path class="acc" d="M140 196 C 200 224, 262 224, 300 200"/><path class="acc" d="M292 196 l10 3 -6 8"/>
   <text class="svg-text-acc" x="186" y="236">translation: right</text><path class="tl" d="M352 146 a26 26 0 0 0 -34 -10"/><text class="svg-text" x="452" y="126" text-anchor="end">turn: left 42°</text></g>`,
  // MindCube: object arrangement seen from four sides
  `<g data-depth="1"><rect class="ln-soft" x="150" y="70" width="160" height="130" rx="6"/></g>
   <g data-depth="1.6"><rect class="tl-fill" x="190" y="104" width="30" height="30" rx="3"/><circle class="acc-fill" cx="268" cy="118" r="16"/><path class="sk" d="M214 162 l16 -26 16 26z" style="fill: var(--skills-soft)"/></g>
   <g data-depth="2.4"><g class="eye"><path class="ln" d="M216 44 q14 -12 28 0 q-14 12 -28 0z"/><circle class="dot-ink" cx="230" cy="44" r="3"/></g>
   <g><path class="ln" d="M216 226 q14 -12 28 0 q-14 12 -28 0z"/><circle class="dot-ink" cx="230" cy="226" r="3"/></g>
   <g><path class="acc" d="M112 135 q14 -12 28 0 q-14 12 -28 0z"/><circle class="dot-acc" cx="126" cy="135" r="3"/></g>
   <g><path class="ln" d="M322 135 q14 -12 28 0 q-14 12 -28 0z"/><circle class="dot-ink" cx="336" cy="135" r="3"/></g>
   <text class="svg-text-acc" x="70" y="182">view 3: what is left?</text></g>`,
  // SPBench: room plan, door and telephone, measured closest-point gap
  `<g data-depth="1"><path class="ln" d="M70 60 H390 V210 H70 Z"/><path class="ln-soft" d="M70 150 H390 M250 60 V210"/></g>
   <g data-depth="1.6"><path class="ln" d="M180 60 v58 M180 60 a58 58 0 0 1 58 58"/><rect class="tl-fill" x="206" y="64" width="24" height="44" rx="3"/><text class="svg-text" x="150" y="134">door</text><text class="svg-text" x="236" y="80">telephone</text></g>
   <g data-depth="2.3"><path class="acc" d="M182 96 H206"/><path class="acc" d="M182 90 v12 M206 90 v12"/><text class="svg-text-acc" x="150" y="178">closest points: 0.29 m</text>
   <path class="acc" stroke-dasharray="2 3" d="M194 102 L194 168"/></g>`,
  // ERQA: robot gripper above table and cup
  `<g data-depth="1"><path class="ln" d="M70 198 H390 M90 198 v24 M370 198 v24"/></g>
   <g data-depth="1.5"><path class="tl-fill" d="M246 170 h36 l-4 28 h-28z"/><path class="tl" d="M282 176 q12 4 0 14"/></g>
   <g data-depth="2.3"><path class="ln" d="M120 40 L190 70 L250 110"/><circle class="acc-fill" cx="190" cy="70" r="8"/><circle class="acc-fill" cx="120" cy="40" r="8"/>
   <path class="acc" d="M250 110 v20 M238 130 h24 M238 130 v22 M262 130 v22"/><text class="svg-text" x="300" y="130">pick the cup</text></g>`,
  // Omni3D-Bench: 3D box with height and width measurements
  `<g data-depth="1"><path class="ln" d="M60 204 L400 204"/><path class="ln-soft" d="M100 204 L140 176 H360 L400 204"/></g>
   <g data-depth="1.6"><path class="tl-fill" d="M150 190 V110 L200 84 H320 V164 L270 190 Z"/><path class="tl" d="M150 110 H270 V190 M270 110 L320 84"/></g>
   <g data-depth="2.4"><path class="acc" d="M338 84 V164 M332 84 h12 M332 164 h12"/><text class="svg-text-acc" x="350" y="128">1.8 m</text>
   <path class="acc" d="M150 206 H270 M150 200 v12 M270 200 v12"/><text class="svg-text" x="186" y="228">width</text></g>`,
  // MMSI-Bench: two photos of one room linked by a shared landmark
  `<g data-depth="1"><rect class="ln" x="70" y="70" width="140" height="104" rx="4"/><rect class="ln" x="250" y="86" width="140" height="104" rx="4"/></g>
   <g data-depth="1.6"><rect class="tl-fill" x="96" y="116" width="36" height="34" rx="2"/><rect class="tl-fill" x="300" y="128" width="36" height="34" rx="2"/>
   <circle class="acc-fill" cx="170" cy="104" r="10"/><path class="sk" d="M350 116 l12 -18 12 18z" style="fill: var(--skills-soft)"/></g>
   <g data-depth="2.3"><path class="acc" stroke-dasharray="3 4" d="M132 133 C 200 190, 250 190, 300 145"/><text class="svg-text-acc" x="176" y="206">same bed in both views</text><text class="svg-text" x="330" y="80">north</text><path class="ln" d="M322 76 v-14 l-4 6 M322 62 l4 6"/></g>`,
];
const artLayer = $('layer-art');
const chainList = $('scene-chain');
let layers = [];

function drawChain(chain, animate) {
  chainList.textContent = '';
  Promise.resolve().then(() => { if (typeof markRowEnds === 'function') markRowEnds(chainList, 'row-end'); });
  chain.forEach(([kind, text], i) => {
    const li = document.createElement('li');
    li.className = 'chain-chip ' + kind;
    li.textContent = text;
    chainList.appendChild(li);
    if (animate) anim(li, [{ opacity: .15, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 120 + i * 110 });
  });
}

function showScene(i, animate) {
  artLayer.innerHTML = ART[i];
  layers = [...artLayer.querySelectorAll('[data-depth]')].map(n => ({ n, d: Number(n.dataset.depth) }));
  $('scene-bench').textContent = BENCH[i].key;
  $('scene-n').textContent = BENCH[i].n.toLocaleString('en-US') + ' questions';
  $('scene-caption').textContent = CAPTIONS[i].text;
  $('scene-title').textContent = BENCH[i].key + ' illustration';
  drawChain(CAPTIONS[i].chain, animate);
  if (animate) layers.forEach((l, k) => anim(l.n, [{ opacity: .1, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 520, delay: k * 70 }));
  paint();
}

/* pointer parallax on the scene */
const svg = $('scene-svg'), pointer = $('scene-pointer'), ripple = $('scene-ripple');
/* labels are drawn at ~10.5px on screen whatever the panel width (the 460-wide scene is shown at 0.5x-0.9x) */
function sizeSceneText() {
  const w = svg.getBoundingClientRect().width;
  if (w) svg.style.setProperty('--scene-fs', Math.min(17, Math.max(10, 10.5 * 460 / w)).toFixed(2) + 'px');
}
sizeSceneText();
/* a wrapped tool chain drops the connector after the last chip of each row */
function markRowEnds(list, cls) {
  const items = [...list.children];
  const mid = n => n.offsetTop + n.offsetHeight / 2;
  items.forEach((li, i) => { const next = items[i + 1]; li.classList.toggle(cls, !!next && mid(next) > mid(li) + 8); });
}
if ('ResizeObserver' in window) { new ResizeObserver(sizeSceneText).observe(svg); new ResizeObserver(() => markRowEnds(chainList, 'row-end')).observe(chainList); }
else window.addEventListener('resize', () => { sizeSceneText(); markRowEnds(chainList, 'row-end'); });
const cur = { x: 0, y: 0, h: 0 }, tgt = { x: 0, y: 0, h: 0 };
let raf = 0, last = 0, pulse0 = null;
function paint(p = 0) {
  layers.forEach(l => l.n.setAttribute('transform', `translate(${(cur.x * 4 * l.d).toFixed(2)} ${(cur.y * 2.6 * l.d).toFixed(2)})`));
  grid.setAttribute('transform', `translate(${(-cur.x * 3).toFixed(2)} ${(-cur.y * 2).toFixed(2)})`);
  pointer.setAttribute('transform', `translate(${(230 + cur.x * 214).toFixed(1)} ${(125 + cur.y * 110).toFixed(1)})`);
  pointer.setAttribute('opacity', (cur.h * .5).toFixed(3));
}
function tick(t) {
  raf = 0;
  const dt = last ? Math.min(32, t - last) : 16; last = t;
  const k = 1 - Math.exp(-dt / 90);
  let moving = false;
  for (const key of ['x', 'y', 'h']) {
    cur[key] += (tgt[key] - cur[key]) * k;
    if (Math.abs(tgt[key] - cur[key]) < .001) cur[key] = tgt[key]; else moving = true;
  }
  if (pulse0 !== null) {
    const pr = Math.min(1, (t - pulse0) / 600);
    ripple.setAttribute('r', (6 + (1 - (1 - pr) ** 2) * 36).toFixed(1));
    ripple.setAttribute('opacity', ((1 - pr) ** 2 * .6).toFixed(3));
    if (pr === 1) pulse0 = null;
  }
  paint();
  if (moving || pulse0 !== null) raf = requestAnimationFrame(tick); else last = 0;
}
function kick() { if (!reduced.matches && !raf) raf = requestAnimationFrame(tick); }
function coords(e) {
  const b = svg.getBoundingClientRect();
  return { x: (e.clientX - b.left) / b.width * 460, y: (e.clientY - b.top) / b.height * 250 };
}
svg.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  const c = coords(e);
  tgt.x = (c.x - 230) / 230; tgt.y = (c.y - 125) / 140; tgt.h = 1; kick();
});
svg.addEventListener('pointerleave', () => { tgt.x = tgt.y = tgt.h = 0; kick(); });
svg.addEventListener('click', e => {
  const c = coords(e);
  ripple.setAttribute('cx', c.x.toFixed(1)); ripple.setAttribute('cy', c.y.toFixed(1));
  pulse0 = performance.now(); kick();
  stopCycle(); select((sel.b + 1) % 7, sel.m, true);
});

/* dumbbell */
const X0 = 22, X1 = 262, LO = 30, HI = 100;
const xs = v => X0 + (v - LO) / (HI - LO) * (X1 - X0);
const dg = $('dumb-grid');
svgEl('line', { x1: X0, x2: X1, y1: 112, y2: 112, class: 'axis' }, dg);
[30, 50, 70, 90, 100].forEach(v => {
  svgEl('line', { x1: xs(v), x2: xs(v), y1: 48, y2: 112, class: 'grid' }, dg);
  const t = svgEl('text', { x: xs(v), y: 128, 'text-anchor': 'middle' }, dg); t.textContent = v;
});
function drawDumbbell(animate) {
  const bb = BB[sel.m], i = sel.b;
  const b = bb.base[i], o = bb.ours[i];
  const xb = xs(b), xo = xs(o);
  $('dumb-base').setAttribute('cx', xb); $('dumb-ours').setAttribute('cx', xo);
  $('dumb-link').setAttribute('x1', xb); $('dumb-link').setAttribute('x2', xo);
  const nb = $('dumb-base-num'), no = $('dumb-ours-num');
  nb.textContent = fmt(b); no.textContent = fmt(o);
  placeDumbLabels(nb, no, xb, xo);
  $('dumb-bb').textContent = bb.name;
  $('dumb-base-name').textContent = bb.short + ' (base model)';
  placeDumbKey();
  $('delta-num').textContent = '+' + fmt(o - b);
  $('delta-text').innerHTML = `points on ${BENCH[i].key}; <span class="nw">+${fmt(bb.ours[7] - bb.base[7])} overall</span>`;
  if (!animate) return;
  const d = X0 - xb;
  [$('dumb-base'), nb].forEach(n => anim(n, [{ transform: `translateX(${d}px)`, opacity: .15 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 820 }));
  const d2 = X0 - xo;
  [$('dumb-ours'), no].forEach(n => anim(n, [{ transform: `translateX(${d2}px)`, opacity: .15 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 980 }));
  const link = $('dumb-link');
  link.style.transformBox = 'view-box'; link.style.transformOrigin = `${xb}px 92px`;
  anim(link, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, delay: 120 });
}

/* Number labels sit above their dots. Dots closer than the labels are wide share one centred pair
   instead, and every label is kept inside the 280-wide view box (high scores used to spill off the right). */
const DUMB_L = 4, DUMB_R = 276;
const textLen = (n, fallback) => { try { return n.getComputedTextLength() || fallback; } catch (e) { return fallback; } };
function placeDumbLabels(nb, no, xb, xo) {
  const wb = textLen(nb, 36), wo = textLen(no, 36);
  const clamp = (c, w) => Math.min(DUMB_R - w / 2, Math.max(DUMB_L + w / 2, c));
  if (xo - xb >= (wb + wo) / 2 + 8) {
    nb.setAttribute('x', clamp(xb, wb).toFixed(1)); nb.setAttribute('text-anchor', 'middle');
    no.setAttribute('x', clamp(xo, wo).toFixed(1)); no.setAttribute('text-anchor', 'middle');
    return;
  }
  const gap = 10, total = wb + gap + wo;
  const left = Math.min(DUMB_R - total, Math.max(DUMB_L, (xb + xo) / 2 - total / 2));
  nb.setAttribute('x', (left + wb).toFixed(1)); nb.setAttribute('text-anchor', 'end');
  no.setAttribute('x', (left + wb + gap).toFixed(1)); no.setAttribute('text-anchor', 'start');
}
/* the "+ SpatialWeave" key follows the base-model name, whose length changes with the backbone */
function placeDumbKey() {
  const cx = Math.max(126, 16 + textLen($('dumb-base-name'), 100) + 14);
  $('dumb-ours-key').setAttribute('cx', cx.toFixed(1));
  $('dumb-ours-name').setAttribute('x', (cx + 8).toFixed(1));
}

function select(b, m, animate) {
  sel = { b, m };
  nodes.forEach(n => n.setAttribute('aria-pressed', String(Number(n.dataset.b) === b && Number(n.dataset.m) === m)));
  $('active-bench').textContent = BENCH[b].key;
  $('active-bb').textContent = BB[m].name;
  showScene(b, animate);
  drawDumbbell(animate);
}

/* auto-cycle through the 21 cells */
let timer = 0;
function setCycleUi(on) {
  $('cycle').setAttribute('aria-pressed', String(on));
  $('cycle-text').textContent = on ? 'Pause' : 'Play benchmarks';
  $('cycle-icon').innerHTML = on ? '<path d="M2 1h3v10H2zM7 1h3v10H7z"/>' : '<path d="M2 1l9 5-9 5z"/>';
}
function stopCycle() { clearInterval(timer); timer = 0; setCycleUi(false); }
$('cycle').addEventListener('click', () => {
  if (timer) { stopCycle(); return; }
  setCycleUi(true);
  const step = () => { let b = sel.b + 1, m = sel.m; if (b > 6) { b = 0; m = (m + 1) % 3; } select(b, m, true); };
  step(); timer = setInterval(step, 2600);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCycle(); });

select(1, 0, false);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawDumbbell(false));

/* ---------------- 01 ranking ---------------- */
const rows = [];
BB.forEach(bb => { rows.push({ name: bb.name, bb: '', v: bb.base, cls: '' }); rows.push({ name: 'SpatialWeave', bb: bb.short, v: bb.ours, cls: 'ours' }); });
OTHERS.forEach(o => rows.push({ name: o.name, bb: o.bb, v: o.v, cls: 'baseline' }));
rows.push({ name: 'GPT-6 Astra', bb: 'reference', v: ASTRA.base, cls: 'ref' });
rows.push({ name: 'SpatialWeave', bb: 'Astra, reference', v: ASTRA.ours, cls: 'ref ours' });
const rankEl = $('rank'), pillEl = $('rank-pills');
let rankIdx = 7;
['Overall', ...BENCH.map(b => b.short)].forEach((label, k) => {
  const p = document.createElement('button');
  p.type = 'button'; p.className = 'pill'; p.textContent = label;
  const idx = k === 0 ? 7 : k - 1;
  p.dataset.idx = idx;
  p.setAttribute('aria-pressed', String(idx === rankIdx));
  p.addEventListener('click', () => { rankIdx = idx; [...pillEl.children].forEach(c => c.setAttribute('aria-pressed', String(Number(c.dataset.idx) === idx))); drawRank(true); });
  pillEl.appendChild(p);
});
function drawRank(animate) {
  const sorted = [...rows].sort((a, b) => b.v[rankIdx] - a.v[rankIdx]);
  rankEl.innerHTML = '';
  $('rank-title').textContent = rankIdx === 7 ? 'Overall · 4,929 questions' : `${BENCH[rankIdx].key} · ${BENCH[rankIdx].n.toLocaleString('en-US')} questions`;
  sorted.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'rank-row ' + r.cls;
    row.innerHTML = `<div class="rank-name">${r.name}${r.bb ? ` <span class="bb"><span class="sep">· </span>${r.bb}</span>` : ''}</div><div class="rank-track"><div class="rank-bar" style="width:${r.v[rankIdx]}%"></div></div><div class="rank-val">${fmt(r.v[rankIdx])}</div>`;
    rankEl.appendChild(row);
    if (animate) {
      anim(row.querySelector('.rank-bar'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { delay: i * 34 });
      anim(row.querySelector('.rank-val'), [{ opacity: .1 }, { opacity: 1 }], { duration: 460, delay: i * 34 + 120 });
    }
  });
}
drawRank(false);

/* ---------------- 03 heatmap ---------------- */
const heat = $('heat');
const HEAT_ROWS = [...BB.map(b => ({ name: b.name, short: b.short, base: b.base, ours: b.ours, ref: false })), { name: 'GPT-6 Astra (ref.)', short: 'Astra', base: ASTRA.base, ours: ASTRA.ours, ref: true }];
function heatCell(r, i) {
  const g = r.ours[i] - r.base[i];
  const cls = [g < 0 ? 'neg' : '', g >= 18 ? 'strong' : '', i === 7 ? 'overall' : ''].join(' ').trim();
  return `<td class="${cls}" style="--g:${Math.max(.04, Math.min(1, g / 22)).toFixed(3)}">${g >= 0 ? '+' : '−'}${Math.abs(g).toFixed(2)}</td>`;
}
/* On phones the table is transposed (benchmarks down, backbones across) so it fits without sideways scrolling */
const heatNarrow = window.matchMedia('(max-width: 660px)');
function buildHeat() {
  let html;
  if (heatNarrow.matches) {
    html = '<thead><tr><th></th>' + HEAT_ROWS.map(r => `<th scope="col"${r.ref ? ' class="ref"' : ''}>${r.short}${r.ref ? ' <small>(ref.)</small>' : ''}</th>`).join('') + '</tr></thead><tbody>';
    for (let i = 0; i < 8; i++) html += `<tr${i === 7 ? ' class="overall-row"' : ''}><th scope="row">${i === 7 ? 'Overall' : BENCH[i].short}</th>${HEAT_ROWS.map(r => heatCell(r, i)).join('')}</tr>`;
  } else {
    html = '<thead><tr><th></th>' + BENCH.map(b => `<th scope="col">${b.short}</th>`).join('') + '<th scope="col">Overall</th></tr></thead><tbody>';
    HEAT_ROWS.forEach(r => { html += `<tr class="${r.ref ? 'ref' : ''}"><th scope="row">${r.name}</th>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => heatCell(r, i)).join('')}</tr>`; });
  }
  heat.innerHTML = html + '</tbody>';
  heat.classList.toggle('heat-t', heatNarrow.matches);
}
buildHeat();
if (heatNarrow.addEventListener) heatNarrow.addEventListener('change', buildHeat); else if (heatNarrow.addListener) heatNarrow.addListener(buildHeat);
function playHeat() { heat.querySelectorAll('tbody tr').forEach((tr, i) => [...tr.children].forEach((c, j) => anim(c, [{ opacity: .06 }, { opacity: 1 }], { duration: 440, delay: Math.min(520, i * 60 + j * 34) }))); }

/* 05 lean: assets/lean.js */

/* copy BibTeX */
const bibEl = $('bibtex'), bibText = bibEl.textContent;
bibEl.textContent = '';
bibText.split('\n').forEach(line => { const s = document.createElement('span'); s.className = 'bl'; s.textContent = line; bibEl.appendChild(s); });
$('copy-bib').addEventListener('click', () => {
  const text = bibText;
  const done = () => { $('copy-bib').textContent = 'Copied'; setTimeout(() => { $('copy-bib').textContent = 'Copy'; }, 1600); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => { const r = document.createRange(); r.selectNodeContents($('bibtex')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
});


/* ================= loom: three threads weave in as versions add them ================= */
(function loom() {
  const canvas = $('loom');
  const ticks = $('loom-ticks');
  const VERS = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6'];
  const vx = i => (i + 0.5) / 7;
  VERS.forEach((v, i) => { const s = document.createElement('span'); s.textContent = v; s.style.left = (vx(i) * 100).toFixed(2) + '%'; ticks.appendChild(s); });
  const THREADS = [
    { name: 'tools', css: '--tools', start: vx(1), phase: 0 },
    { name: 'skills', css: '--skills', start: vx(3), phase: 2 * Math.PI / 3 },
    { name: 'flows', css: '--brand', start: vx(5), phase: 4 * Math.PI / 3 },
  ];
  let colors = {}, W = 0, H = 170, dpr = 1, t0 = performance.now(), reveal = reduced.matches ? 1 : 0, mouse = null, raf = 0, visible = true;
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    THREADS.forEach(th => { colors[th.name] = cs.getPropertyValue(th.css).trim() || '#7151c6'; });
    colors.rule = cs.getPropertyValue('--rule').trim(); colors.faint = cs.getPropertyValue('--faint').trim(); colors.paper = cs.getPropertyValue('--paper').trim(); colors.ok = cs.getPropertyValue('--ok').trim();
  }
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  function yOf(th, x, time) {
    const mid = H * 0.46;
    const endT = vx(6) + 0.02;
    let amp = 34;
    if (x > endT) amp *= Math.max(0.12, 1 - (x - endT) / 0.08);
    if (mouse !== null) { const d = (x - mouse) * 9; amp += 16 * Math.exp(-d * d); }
    return mid + amp * Math.sin(2 * Math.PI * x * 3.5 + th.phase + time * 0.6);
  }
  function depthOf(th, x, time) { return Math.cos(2 * Math.PI * x * 3.5 + th.phase + time * 0.6); }
  function draw(now) {
    const time = reduced.matches ? 0 : (now - t0) / 1000;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // version guides
    ctx.strokeStyle = colors.rule; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
    for (let i = 0; i < 7; i++) { const x = vx(i) * W; ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, H - 14); ctx.stroke(); }
    ctx.setLineDash([]);
    const limit = Math.min(1, reveal) * 1.0;
    const N = Math.max(60, Math.round(W / 4));
    for (let k = 0; k < N; k++) {
      const xa = k / N, xb = (k + 1) / N;
      if (xa > limit) break;
      const live = THREADS.filter(th => xb > th.start).map(th => ({ th, d: depthOf(th, (xa + xb) / 2, time) })).sort((a, b) => a.d - b.d);
      for (const { th, d } of live) {
        const fade = Math.min(1, (xa - th.start) / 0.035 + 0.05);
        ctx.globalAlpha = Math.max(0, fade) * (0.55 + 0.45 * (d + 1) / 2);
        ctx.strokeStyle = colors[th.name];
        ctx.lineWidth = 2.2 + 1.8 * (d + 1) / 2;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(xa * W, yOf(th, xa, time)); ctx.lineTo(Math.min(xb, limit) * W, yOf(th, Math.min(xb, limit), time)); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // join markers where each thread enters
    THREADS.forEach(th => {
      if (th.start > limit) return;
      const y = yOf(th, th.start, time);
      ctx.fillStyle = colors.paper; ctx.strokeStyle = colors[th.name]; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(th.start * W, y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    // frozen knot at the end
    if (limit >= 0.99) {
      const x = (vx(6) + 0.1) * W, y = H * 0.46;
      const kx = Math.min(W - 16, x);
      ctx.fillStyle = colors.paper; ctx.beginPath(); ctx.arc(kx, y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colors.ok; ctx.beginPath(); ctx.arc(kx, y, 10.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colors.paper; ctx.font = '600 11px Ubuntu, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('H*', kx, y + 4);
    }
    ticks.querySelectorAll('span').forEach((s, i) => s.classList.toggle('on', vx(i) <= limit));
  }
  function loop(now) {
    raf = 0;
    if (reveal < 1) reveal = Math.min(1, reveal + 0.012);
    draw(now);
    if (!reduced.matches && visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf) raf = requestAnimationFrame(loop); }
  readColors(); size(); draw(performance.now()); start();
  window.addEventListener('resize', () => { size(); draw(performance.now()); });
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', () => { readColors(); draw(performance.now()); });
  canvas.addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); mouse = (e.clientX - b.left) / b.width; });
  canvas.addEventListener('pointerleave', () => { mouse = null; });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(en => { visible = en.isIntersecting; if (visible) start(); })).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
})();

/* ---------------- play-once-when-visible ---------------- */
const once = new Map([[$('rank-fig'), () => drawRank(true)], [heat, playHeat], [$('dumbbell'), () => drawDumbbell(true)]]);
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const fn = once.get(en.target);
    if (fn) { fn(); once.delete(en.target); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -60px 0px' });
  once.forEach((_, n) => io.observe(n));
}

})();
