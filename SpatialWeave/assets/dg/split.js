/* '@split' · spbench_SI_68 "Left in pixels, nearer in metres", decided by the relation_readout workflow.
   pixels  the input photo exactly where the previous step showed it, with the two detector boxes, their centres
           and the 190 px gap between the centres: the reading that looks like "left".
   metres  the photo moves into a narrow column (pixels) and relation_readout's numbers appear beside it as a top
           view drawn to scale on both axes (metres): camera at the bottom, gaze up; the door at 2.72 m, the bag
           at 1.69 m; 0.08 m to the left, 1.03 m toward the camera.
   answer  the same picture plus the verdict: the depth axis dominates, back (D); the base model's left (A) as a
           ghost; SPBench's axis names (spec.note).
   Every printed number comes from spec (runs.js). Derived only: pixel positions (boxes scaled to the drawn photo,
   gap = |px[1] - px[0]|, the drawn depth scale) and how far left of the gaze the pair sits in the top view, which is
   back-projected from the box centres and depths (principal point at the image centre, focal length solved so that
   the recorded dx holds). No derived number is printed. */
(function () {
  'use strict';
  var SWD = window.SWD = window.SWD || {};
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  var uid = 0, meter = null;

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function box4(b) { return Array.isArray(b) && b.length === 4 && b.every(isNum) && b[2] > b[0] && b[3] > b[1] ? b : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 5); } /* = cubic-bezier(.22,1,.36,1) (ease-out-quint) */
  function cssVar(n, fb) { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb; } catch (e) { return fb; } }
  function textW(str, px, weight, mono) {
    try {
      if (!meter) meter = document.createElement('canvas').getContext('2d');
      meter.font = (weight || 400) + ' ' + px + 'px ' + (mono ? cssVar('--mono', 'monospace') : cssVar('--sans', 'sans-serif'));
      var w = meter.measureText(String(str)).width;
      if (w > 0) return w;
    } catch (e) { /* estimate below */ }
    return String(str).length * px * (mono ? 0.52 : 0.57);
  }
  function metres(v) { return Math.abs(v).toFixed(2) + ' m'; }

  SWD.split = function (g, spec, ctx) {
    try { draw(g, spec || {}, ctx || {}); }
    catch (e) { if (window.console) console.warn('diagram split', e); }
  };

  function draw(g, d, c) {
    var W = c.W, H = c.H, k = c.k || 1, sv = c.sv;
    if (!(W > 0 && H > 0) || typeof sv !== 'function' || typeof c.text !== 'function') return;
    var phase = c.phase === 'pixels' || c.phase === 'metres' || c.phase === 'answer' ? c.phase : (c.answer ? 'answer' : 'metres');
    var answer = phase === 'answer';
    var still = !!c.still;
    var small = k < 1;

    /* type scale (the stage CSS sets 12.5 / 11.5 px sans and 12 / 11 px mono) */
    var FS = small ? 11.5 : 12.5, FM = small ? 11 : 12, FN = small ? 12.5 : 14.5, FT = small ? 10 : 10.5;
    var LH = small ? 13.5 : 16;

    /* ---------- data ---------- */
    var size = Array.isArray(d.size) && isNum(d.size[0]) && isNum(d.size[1]) && d.size[0] > 0 && d.size[1] > 0 ? d.size : null;
    var bag = box4(d.bag), door = box4(d.door);
    var havePhoto = !!(size && bag && door && d.img && c.dir != null);
    var pxB = Array.isArray(d.px) && isNum(d.px[0]) ? d.px[0] : bag ? (bag[0] + bag[2]) / 2 : null;
    var pxD = Array.isArray(d.px) && isNum(d.px[1]) ? d.px[1] : door ? (door[0] + door[2]) / 2 : null;
    var gapPx = isNum(pxB) && isNum(pxD) ? Math.round(Math.abs(pxD - pxB)) : null;
    var zB = isNum(d.zBag) ? d.zBag : null, zD = isNum(d.zDoor) ? d.zDoor : null;
    var dx = isNum(d.dx) ? d.dx : null, dz = isNum(d.dz) ? d.dz : (zB != null && zD != null ? zB - zD : null);
    var haveTop = zB != null && zD != null && zD > 0 && zB >= 0 && dx != null && dz != null;
    var opts = (c.r && Array.isArray(c.r.options)) ? c.r.options : [];
    var optWord = function (L) { for (var i = 0; i < opts.length; i++) if (opts[i] && opts[i][0] === L) return opts[i][1]; return ''; };
    var truthL = d.truth || '', baseL = d.base || '';
    var truthW = optWord(truthL) || d.label || d.fb || '', baseW = optWord(baseL) || d.lr || '';
    var ar = size ? size[0] / size[1] : 4 / 3;

    var root = sv('g', { 'data-sw-split': phase, 'data-sw-case': (c.r && c.r.id) || '' }, g);

    /* ---------- helpers ---------- */
    function T(parent, x, y, str, o) {
      o = o || {};
      var t = c.text(parent, x, y, str, o.cls || '', o.anchor || 'start');
      var st = [];
      if (o.size) st.push('font-size:' + o.size + 'px');
      if (o.mono) st.push('font-family:var(--mono)');
      if (o.weight) st.push('font-weight:' + o.weight);
      if (o.ls) st.push('letter-spacing:' + o.ls);
      if (o.fill) st.push('fill:' + o.fill);
      if (o.italic) st.push('font-style:italic');
      if (st.length) t.setAttribute('style', st.join(';'));
      return t;
    }
    function line(parent, x1, y1, x2, y2, cls, style) {
      var a = { x1: x1, y1: y1, x2: x2, y2: y2 };
      if (cls) a['class'] = cls;
      if (style) a.style = style;
      return sv('line', a, parent);
    }
    function halo(parent, x1, y1, x2, y2, w) {
      return line(parent, x1, y1, x2, y2, '', 'stroke:var(--paper);stroke-width:' + w + ';stroke-linecap:round;opacity:.75');
    }
    /* the site's check and cross glyphs (12-unit box), drawn at (x, y) = top-left, s px wide */
    function glyph(parent, kind, x, y, s, delay) {
      var q = s / 12, P = function (a, b) { return (x + a * q).toFixed(2) + ' ' + (y + b * q).toFixed(2); };
      var dd = kind === 'ok' ? 'M' + P(2.4, 6.3) + 'L' + P(4.8, 8.7) + 'L' + P(9.6, 3.6) : 'M' + P(3, 3) + 'L' + P(9, 9) + 'M' + P(9, 3) + 'L' + P(3, 9);
      var p = sv('path', { d: dd, style: 'fill:none;stroke:var(' + (kind === 'ok' ? '--ok' : '--bad') + ');stroke-width:' + (small ? 1.7 : 1.9) + ';stroke-linecap:round;stroke-linejoin:round' }, parent);
      fade(p, delay);
      return p;
    }
    function fade(el, delay, dur) {
      if (still || !el || !el.animate) return;
      try { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur || 420, delay: delay || 0, easing: EASE, fill: 'backwards' }); } catch (e) { /* no motion */ }
    }
    function drawOn(el, len, delay, dur) {
      if (still || !el || !el.animate || !(len > 0)) return;
      var da = len.toFixed(1) + ' ' + len.toFixed(1);
      try { el.animate([{ strokeDasharray: da, strokeDashoffset: len }, { strokeDasharray: da, strokeDashoffset: 0 }], { duration: dur || 560, delay: delay || 0, easing: EASE, fill: 'backwards' }); } catch (e) { /* no motion */ }
    }

    /* ---------- where the photo sits ---------- */
    /* pixels: exactly the rectangle the player gives the raw photo in the previous step (contain, centred) */
    var big = W / H < ar ? { x: 0, y: (H - W / ar) / 2, w: W, h: W / ar } : { x: (W - H * ar) / 2, y: 0, w: H * ar, h: H };
    var M = small ? 8 : 14;
    var titleY = M + (small ? 7.5 : 10);
    var capBand = small ? 14 : 58;              /* the caption overlays the stage bottom on desktop layouts */

    /* top-view labels, measured so the layout can make room for them at every stage size */
    var wBagLab = textW('paper bag', FS, 500), wDoorLab = textW('door', FS, 500);
    var zDl = zD != null ? metres(zD) : '', zBl = zB != null ? metres(zB) : '';
    var wIso = Math.max(textW(zDl, FM, 400, true), textW(zBl, FM, 400, true));
    var dzNum = dz != null ? metres(dz) : '', dxNum = dx != null ? metres(dx) : '';
    /* the smallest stage has no height for the words between the two depth leaders: the arrow says it */
    var towardLines = W < 300 ? [] : textW('toward the camera', FS) + 1 > (small ? 74 : 1e9) ? ['toward', 'the camera'] : ['toward the camera'];
    var block = [];                         /* the label block right of the depth arrow */
    if (answer) block.push({ s: truthW + (truthL ? ' (' + truthL + ')' : ''), o: { cls: 'sc-dt-ok', size: FN - 0.5 }, icon: 'ok' });
    block.push({ s: dzNum, o: { cls: 'sc-dt-brand', size: FN, mono: true, weight: 500 } });
    towardLines.forEach(function (s) { block.push({ s: s, o: {} }); });
    var iconW = FN - 1;
    var wBlock = block.reduce(function (m, b) { return Math.max(m, textW(b.s, b.o.size || FS, b.o.weight || (b.o.cls ? 500 : 400), b.o.mono) + (b.icon ? iconW + 4 : 0)); }, 0);

    /* metres / answer layout: photo column on the left, top view on the right */
    var gapC = small ? 10 : 22;
    var wP = Math.round(W * 0.36);
    var yDoor = titleY + (small ? 21 : 34);
    var yCam = H - capBand - (small ? 10 : 20);
    var s = haveTop ? (yCam - yDoor) / zD : 0;       /* px per metre, same on both axes */
    var yBag = haveTop ? yCam - zB * s : 0;
    var r = small ? 4 : 5;
    /* lateral placement: back-projected pixel centres (see the header); fallback: the camera straight below the door */
    var Xd = 0;
    if (haveTop && size && isNum(pxB) && isNum(pxD) && dx) {
      var cx0 = size[0] / 2, f = ((pxB - cx0) * zB - (pxD - cx0) * zD) / dx;
      if (isNum(f) && f > 0.3 * size[0] && f < 6 * size[0]) Xd = (pxD - cx0) * zD / f;
    }
    var off = haveTop ? -dx * s : 0;                  /* door minus bag, px (positive: the bag is left) */
    var rightNeed = Math.max(12 + wBlock, 12 + wIso);
    var xDoor = 0, xR0 = 0;
    for (var pass = 0; pass < 3; pass++) {
      xR0 = M + wP + gapC;
      var lo = xR0 + wBagLab + r + 6 + Math.max(off, 0);
      var hi = W - M - rightNeed;
      if (lo <= hi || wP <= W * 0.25) {
        var target = (xR0 + W - M) / 2 - (-Xd * s) * 0.5;
        xDoor = clamp(target, lo, Math.max(lo, hi));
        break;
      }
      wP = Math.max(Math.round(W * 0.25), wP - Math.ceil(lo - hi));
    }
    var xBag = xDoor - off, xCam = clamp(xDoor - Xd * s, xR0 + 20, W - M - 12);
    var sm = { x: M, y: titleY + (small ? 7 : 10), w: wP, h: wP / ar };

    /* did the stage just show the plain photo or this diagram's pixels phase? then the photo glides into its column */
    var prev = '';
    if (phase !== 'pixels' && !still) {
      try {
        var on = document.querySelector('.sc-layer.sc-on');
        var mark = on && on.querySelector('[data-sw-split]');
        if (mark && mark.getAttribute('data-sw-case') === ((c.r && c.r.id) || '')) prev = mark.getAttribute('data-sw-split');
        else {
          var im = on && on.querySelector('.sc-shot img');
          if (im && d.img && (im.getAttribute('src') || '') === c.dir + d.img) prev = 'photo';
        }
      } catch (e) { prev = ''; }
    }
    var glide = phase === 'metres' && (prev === 'pixels' || prev === 'photo');
    var GLIDE = 640, T0 = glide ? GLIDE - 120 : 0;     /* later marks wait for the glide */

    /* ================= the photo (pixels) ================= */
    var photo = null;
    if (havePhoto) photo = drawPhoto(phase === 'pixels' ? big : sm, phase === 'pixels');

    function drawPhoto(rect, isBig) {
      var pg = sv('g', {}, root);
      var id = 'sw-split-clip-' + (++uid);
      var defs = sv('defs', {}, pg);
      var clip = sv('clipPath', { id: id }, defs);
      var cr = sv('rect', {}, clip);
      var img = sv('image', { href: c.dir + d.img, preserveAspectRatio: 'none', 'clip-path': 'url(#' + id + ')' }, pg);
      var frame = sv('rect', { style: 'fill:none;stroke:var(--rule);stroke-width:1' }, pg);
      var marks = sv('g', {}, pg);
      var cB = [(bag[0] + bag[2]) / 2, (bag[1] + bag[3]) / 2], cD = [(door[0] + door[2]) / 2, (door[1] + door[3]) / 2];
      if (isNum(pxB)) cB[0] = pxB;
      if (isNum(pxD)) cD[0] = pxD;
      /* the bracket runs through the gap between the boxes (or under the lower one if they overlap) */
      var yBr = door[3] < bag[1] ? (door[3] + bag[1]) / 2 : bag[1] > door[3] ? bag[3] + 30 : Math.max(bag[3], door[3]) + 30;
      var el = {
        bH: sv('rect', { style: 'fill:none;stroke:var(--paper);opacity:.7' }, marks),
        dH: sv('rect', { style: 'fill:none;stroke:var(--paper);opacity:.7' }, marks),
        bB: sv('rect', { style: 'fill:none;stroke:var(--tools)' }, marks),
        dB: sv('rect', { style: 'fill:none;stroke:var(--tools)' }, marks),
        l1H: halo(marks, 0, 0, 0, 0, 3.5), l2H: halo(marks, 0, 0, 0, 0, 3.5),
        l1: line(marks, 0, 0, 0, 0, '', 'stroke:var(--tools);stroke-width:1.2;stroke-dasharray:2 3'),
        l2: line(marks, 0, 0, 0, 0, '', 'stroke:var(--tools);stroke-width:1.2;stroke-dasharray:2 3'),
        brH: sv('path', { style: 'fill:none;stroke:var(--paper);stroke-linecap:round;stroke-linejoin:round;opacity:.8' }, marks),
        br: sv('path', { style: 'fill:none;stroke:var(--ink);stroke-linecap:round;stroke-linejoin:round' }, marks),
        dotB: sv('circle', { style: 'fill:var(--tools);stroke:var(--paper)' }, marks),
        dotD: sv('circle', { style: 'fill:var(--tools);stroke:var(--paper)' }, marks)
      };
      var geo = {};
      function place(R, t) {       /* t = 1 at the big size, 0 at the column size */
        var sx = R.w / size[0], sy = R.h / size[1];
        var P = function (x, y) { return [R.x + x * sx, R.y + y * sy]; };
        var rad = lerp(6, 0, t);
        [cr].forEach(function (n) { n.setAttribute('x', R.x); n.setAttribute('y', R.y); n.setAttribute('width', R.w); n.setAttribute('height', R.h); n.setAttribute('rx', rad); });
        img.setAttribute('x', R.x); img.setAttribute('y', R.y); img.setAttribute('width', R.w); img.setAttribute('height', R.h);
        frame.setAttribute('x', R.x + 0.5); frame.setAttribute('y', R.y + 0.5); frame.setAttribute('width', Math.max(0, R.w - 1)); frame.setAttribute('height', Math.max(0, R.h - 1)); frame.setAttribute('rx', rad);
        frame.style.opacity = String(1 - t);
        var bw = lerp(1.25, 1.7, t), hw = lerp(3, 4.2, t);
        [[el.bH, el.bB, bag], [el.dH, el.dB, door]].forEach(function (q) {
          var a = P(q[2][0], q[2][1]), b = P(q[2][2], q[2][3]);
          [q[0], q[1]].forEach(function (n) { n.setAttribute('x', a[0]); n.setAttribute('y', a[1]); n.setAttribute('width', b[0] - a[0]); n.setAttribute('height', b[1] - a[1]); n.setAttribute('rx', 1.5); });
          q[0].style.strokeWidth = hw; q[1].style.strokeWidth = bw;
        });
        var pB = P(cB[0], cB[1]), pD = P(cD[0], cD[1]), yb = P(0, yBr)[1];
        [[el.l1H, el.l1, pD], [el.l2H, el.l2, pB]].forEach(function (q) {
          [q[0], q[1]].forEach(function (n) { n.setAttribute('x1', q[2][0]); n.setAttribute('y1', q[2][1]); n.setAttribute('x2', q[2][0]); n.setAttribute('y2', yb); });
        });
        var tk = lerp(3.5, 6, t);
        var dBr = 'M' + pB[0] + ' ' + (yb - tk) + 'V' + (yb + tk) + 'M' + pB[0] + ' ' + yb + 'H' + pD[0] + 'M' + pD[0] + ' ' + (yb - tk) + 'V' + (yb + tk);
        el.br.setAttribute('d', dBr); el.brH.setAttribute('d', dBr);
        el.br.style.strokeWidth = lerp(1.3, 1.8, t); el.brH.style.strokeWidth = lerp(3.4, 4.6, t);
        [[el.dotB, pB], [el.dotD, pD]].forEach(function (q) { q[0].setAttribute('cx', q[1][0]); q[0].setAttribute('cy', q[1][1]); q[0].setAttribute('r', lerp(2.4, 3.6, t)); q[0].style.strokeWidth = lerp(1.2, 1.6, t); });
        geo = { P: P, pB: pB, pD: pD, yb: yb, R: R };
      }
      place(rect, isBig ? 1 : 0);
      return { g: pg, marks: marks, place: place, geo: function () { return geo; }, bracket: el.br, bracketLen: Math.abs(geo.pD[0] - geo.pB[0]) };
    }

    /* ----- pixels: labels on the big photo ----- */
    if (phase === 'pixels' && photo) {
      var G = photo.geo(), P = G.P;
      var lab = sv('g', {}, root);
      var bl = P(bag[0], bag[1]), dl = P(door[0], door[1]);
      T(lab, bl[0] + 1, bl[1] - (small ? 5 : 7), 'paper bag', { cls: 'sc-dt-tool' });
      T(lab, dl[0] + (small ? 5 : 7), Math.max(dl[1], 0) + (small ? 14 : 18), 'door', { cls: 'sc-dt-tool' });
      /* the gap between the centres: "190 px apart", read as "left" */
      var xr = Math.max(G.pD[0], G.pB[0]) + (small ? 8 : 11);
      var l1 = T(lab, xr, G.yb + FN * 0.36, gapPx != null ? gapPx + ' px apart' : 'apart', { cls: 'sc-dt-strong', size: FN, mono: true, weight: 500 });
      var l2 = T(lab, xr, G.yb + FN * 0.36 + LH, '→ looks ' + (d.lr || 'left'), { size: FS });
      if (!small && size) T(lab, G.R.x + G.R.w - 10, G.R.y + 18, size[0] + ' × ' + size[1] + ' px', { cls: 'sc-dt-mono', anchor: 'end' });
      fade(photo.marks, 80, 380);
      drawOn(photo.bracket, photo.bracketLen + 12, 260, 520);
      fade(lab, 380, 420);
      void l1; void l2;
    }

    if (phase === 'pixels') return;

    /* ================= metres / answer ================= */
    /* panel titles */
    var titles = sv('g', {}, root);
    var tStyle = { size: FT, weight: 500, ls: '.11em', fill: 'var(--faint)' };
    T(titles, sm.x, titleY, k < 0.9 ? 'PIXELS' : 'IMAGE · PIXELS', tStyle);
    T(titles, xR0, titleY, k < 0.9 ? 'METRES, FROM ABOVE' : 'TOP VIEW · METRES', tStyle);
    fade(titles, T0, 380);

    /* ----- the photo column ----- */
    var col = sv('g', {}, root);
    if (photo) {
      var cy = sm.y + sm.h;
      if (gapPx != null) {
        T(col, sm.x, cy + (small ? 17 : 24), gapPx + ' px apart', { cls: 'sc-dt-strong', size: FN, mono: true, weight: 500 });
        T(col, sm.x, cy + (small ? 17 : 24) + LH, 'in the image', { size: FS });
      }
      if (!small) {
        var P2 = photo.geo().P, b2 = P2(bag[0], bag[1]), d2 = P2(door[0], door[1]);
        T(col, b2[0] + 1, b2[1] - 5, 'bag', { cls: 'sc-dt-tool', size: 11 });
        T(col, d2[0] + 4, Math.max(d2[1], sm.y) + 13, 'door', { cls: 'sc-dt-tool', size: 11 });
      }
      fade(col, T0, 420);
      if (glide) {
        /* start where the previous step left the photo, then settle into the column */
        photo.place(big, 1);
        var t0 = null, stopAt = 0;
        var tick = function (now) {
          if (t0 == null) t0 = now;
          var t = clamp((now - t0) / GLIDE, 0, 1), e = easeOut(t);
          photo.place({ x: lerp(big.x, sm.x, e), y: lerp(big.y, sm.y, e), w: lerp(big.w, sm.w, e), h: lerp(big.h, sm.h, e) }, 1 - e);
          if (t < 1 && (root.isConnected || ++stopAt < 6)) requestAnimationFrame(tick);
          else photo.place(sm, 0);
        };
        requestAnimationFrame(tick);
      }
    }

    /* ----- answer: SPBench's axis names under the photo column ----- */
    if (answer && d.note && !small) {
      var legend = sv('g', {}, root);
      var note = String(d.note), head = '', body = note;
      var ci = note.indexOf(':');
      if (ci > 0 && ci < 40) { head = note.slice(0, ci + 1); body = note.slice(ci + 1).trim(); }
      var clauses = body.split(/;\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
      var LF = small ? 11 : 12;
      var maxW = wP + (small ? 2 : 0);
      var wrap = function (str) {
        var words = str.split(/\s+/), out = [], cur = '';
        words.forEach(function (w) { var n = cur ? cur + ' ' + w : w; if (cur && textW(n, LF) > maxW) { out.push(cur); cur = w; } else cur = n; });
        if (cur) out.push(cur);
        return out;
      };
      var rows = [];
      if (head && !small) rows.push({ s: head, o: { size: LF, fill: 'var(--faint)' } });
      clauses.forEach(function (cl) {
        wrap(cl).forEach(function (ln, j) {
          var m2 = j === 0 && /^(\S+)\s=\s/.exec(ln);
          rows.push({ s: ln, key: m2 ? m2[1] : '', o: { size: LF } });
        });
      });
      var yL = (photo ? sm.y + sm.h + (small ? 17 : 24) + LH : sm.y) + (small ? 18 : 30);
      var lh = small ? 12.5 : 15;
      var bottom = H - (small ? 10 : capBand + 4);
      if (yL + (rows.length - 1) * lh > bottom) yL = Math.max(sm.y + sm.h + 12, bottom - (rows.length - 1) * lh);
      rows.forEach(function (row, i) {
        var t = T(legend, sm.x, yL + i * lh, '', row.o);
        if (row.key) {
          var ks = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          ks.setAttribute('style', 'fill:var(--ink);font-weight:500');
          ks.textContent = row.key;
          t.appendChild(ks);
          t.appendChild(document.createTextNode(row.s.slice(row.key.length)));
        } else t.textContent = row.s;
      });
      fade(legend, 420, 480);
    }

    if (!haveTop) return;

    /* ================= the top view (metres) ================= */
    var tv = sv('g', {}, root);
    var tvIn = sv('g', {}, tv);
    var xEnd = W - M;
    /* depth leaders: each object to the right edge, labelled with its depth */
    [[yDoor, xDoor, zDl], [yBag, xBag, zBl]].forEach(function (q) {
      line(tvIn, q[1] + r + 4, q[0], xEnd, q[0], 'sc-dfaint');
      T(tvIn, xEnd, q[0] - (small ? 4 : 5), q[2], { cls: 'sc-dt-mono', anchor: 'end' });
    });
    /* straight toward the camera from the door: the reference the lateral offset is measured from */
    line(tvIn, xDoor, yDoor + r + 3, xDoor, yBag + (small ? 17 : 22), 'sc-dfaint');
    line(tvIn, xBag, yBag + r + 2, xBag, yBag + (small ? 17 : 22), 'sc-dfaint');
    /* camera at the bottom, gaze up */
    c.camGlyph(tvIn, xCam, yCam, -Math.PI / 2, Math.min(0.62 * s, small ? 34 : 58));
    var camLabW = textW('camera', FS);
    if (xCam + 14 + camLabW <= W - 6) T(tvIn, xCam + 14, yCam + 5, 'camera');
    else T(tvIn, xCam - 14, yCam + 5, 'camera', { anchor: 'end' });
    fade(tvIn, T0 + 60, 460);

    /* the lateral offset, to scale: a dimension under the bag with arrows pointing in from outside */
    var dimG = sv('g', { 'class': answer ? 'sc-dim' : '' }, tv);
    var yDim = yBag + (small ? 13 : 16), stub = small ? 9 : 12, ah = small ? 5 : 6;
    var xl = Math.min(xBag, xDoor), xr2 = Math.max(xBag, xDoor);
    line(dimG, xl - stub, yDim, xl - 1, yDim, 'sc-dbrand', 'stroke-width:1.5');
    line(dimG, xr2 + stub, yDim, xr2 + 1, yDim, 'sc-dbrand', 'stroke-width:1.5');
    c.arrowHead(dimG, xl - 0.5, yDim, 0, 'sc-dhead-brand', ah);
    c.arrowHead(dimG, xr2 + 0.5, yDim, Math.PI, 'sc-dhead-brand', ah);
    /* one text node, so the word never collides with the number whatever the font metrics */
    var dimLab = T(dimG, xr2 + stub + 5, yDim + FN * 0.36, dxNum, { cls: 'sc-dt-brand', size: FN, mono: true, weight: 500 });
    var dimWord = sv('tspan', { dx: 5, style: 'font-family:var(--sans);font-weight:400;font-size:' + FS + 'px;fill:var(--muted)' }, dimLab);
    dimWord.textContent = d.lr || 'left';
    fade(dimG, T0 + 380, 420);

    /* the relation, door to bag, drawn to scale: almost all of it is depth */
    var vx = xBag - xDoor, vy = yBag - yDoor, vl = Math.hypot(vx, vy) || 1, ux = vx / vl, uy = vy / vl;
    var a0 = [xDoor + ux * (r + 3), yDoor + uy * (r + 3)], a1 = [xBag - ux * (r + 4), yBag - uy * (r + 4)];
    var arrow = line(tv, a0[0], a0[1], a1[0], a1[1], answer ? 'sc-dok' : 'sc-dbrand', answer ? '' : 'stroke-width:2.6');
    var headG = sv('g', {}, tv);
    c.arrowHead(headG, a1[0] + ux * 1.5, a1[1] + uy * 1.5, Math.atan2(uy, ux), answer ? 'sc-dhead-ok' : 'sc-dhead-brand', small ? 8 : 9.5);
    drawOn(arrow, Math.hypot(a1[0] - a0[0], a1[1] - a0[1]), T0 + 200, 620);
    fade(headG, T0 + 560, 260);

    /* its label block, right of the arrow and centred between the two depth leaders */
    var bx = Math.max(xDoor, xBag) + (small ? 10 : 14);
    var bh = (block.length - 1) * LH;
    var yMid = (yDoor + yBag) / 2;
    var by0 = clamp(yMid - bh / 2 + FS * 0.35, yDoor + (small ? 13 : 17), yBag - (small ? 16 : 20) - bh);
    var blockG = sv('g', {}, tv);
    block.forEach(function (b, i) {
      var y = by0 + i * LH, x = bx;
      if (b.icon) { glyph(blockG, b.icon, x - 1, y - iconW * 0.8, iconW, T0 + 520); x += iconW + 3; }
      var o = b.o;
      if (!o.cls && !answer) o = { cls: '' };
      T(blockG, x, y, b.s, o);
    });
    fade(blockG, T0 + 420, 440);

    /* nodes and names */
    var nodes = sv('g', {}, tv);
    sv('circle', { cx: xDoor, cy: yDoor, r: r, 'class': 'sc-dnode' }, nodes);
    sv('circle', { cx: xBag, cy: yBag, r: r, 'class': 'sc-dnode' }, nodes);
    T(nodes, xDoor, yDoor - r - (small ? 5 : 7), 'door', { cls: 'sc-dt-strong', anchor: 'middle' });
    T(nodes, xBag - r - (small ? 5 : 7), yBag + FS * 0.35, 'paper bag', { cls: 'sc-dt-strong', anchor: 'end' });
    fade(nodes, T0 + 100, 420);

    /* ----- answer: the base model's reading as a ghost ----- */
    if (answer) {
      var ghost = sv('g', {}, tv);
      var gl = clamp(0.42 * (yBag - yDoor), small ? 22 : 34, 64);
      var g0 = xDoor - r - 4, g1 = g0 - gl;
      line(ghost, g0, yDoor, g1 + 2, yDoor, 'sc-dbad');
      c.arrowHead(ghost, g1, yDoor, Math.PI, 'sc-dhead-bad', small ? 7 : 8);
      var gTxt = baseW + (baseL ? ' (' + baseL + ')' : '');
      var gW = textW(gTxt, FS, 500), gI = small ? 10 : 11;
      var gx = g1 - 7 - gW, gy = yDoor + FS * 0.35;
      /* no room to the left: sit under the ghost arrow (above it is the door's own label) */
      if (gx - gI - 4 < xR0 - gapC * 0.5) { gx = Math.max(xR0 - gapC * 0.5 + gI + 4, g1 + gl / 2 - (gW + gI + 4) / 2 + gI + 4); gy = yDoor + (small ? 15 : 18); }
      glyph(ghost, 'bad', gx - gI - 3, gy - gI * 0.82, gI, 0);
      T(ghost, gx, gy, gTxt, { cls: 'sc-dt-bad' });
      fade(ghost, 300, 460);
    }
  }
})();
