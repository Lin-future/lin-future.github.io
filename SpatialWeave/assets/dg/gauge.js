/* '@gauge' · spbench_MV_297 "A distance the harness refused", decided by the near_touch_guard guard.
   measure  a flat front view of the door slab and the wall telephone (hanging coiled cord), each inside its dashed
            detector box. Red: the closest points of the two boxes, 0.06 m. Grey dashed: box centre to box centre,
            0.93 m. A small key (right column) names the two strokes.
   refuse   the same, plus the guard's test in the right column: a 0..1 bar of closest ÷ centres with the reading
            (0.06, red) far left of the 0.40 threshold (usable zone shaded), the verdict stamp
            "RETRY_GROUNDING · diagnostic, not an answer", and the in-scene 0.06 m struck through.
   answer   the box readings recede; the re-grounded rungs 0.31 / 0.29 m span the door's facing edge and the cord;
            the right column shows the 0..0.5 m number line of all answers (spec.line.marks).
   Every printed number comes from spec (runs.js). The drawing itself is schematic but consistent with the numbers:
   box widths are chosen so the box gap is 0.06 and the centre distance 0.93, and the door edge sits 0.30 from the
   cord; no derived number is printed. */
(function () {
  'use strict';
  var SWD = window.SWD = window.SWD || {};
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  var meter = null;

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
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
  function f2(v) { return (+v).toFixed(2); }

  SWD.gauge = function (g, spec, ctx) {
    try { draw(g, spec || {}, ctx || {}); }
    catch (e) { if (window.console) console.warn('diagram gauge', e); }
  };

  function draw(g, d, c) {
    var W = c.W, H = c.H, k = c.k || 1, sv = c.sv;
    if (!(W > 0 && H > 0) || typeof sv !== 'function' || typeof c.text !== 'function') return;
    var phase = c.phase === 'measure' || c.phase === 'refuse' || c.phase === 'answer' ? c.phase : (c.answer ? 'answer' : 'measure');
    var refuse = phase !== 'measure', answer = phase === 'answer';
    var still = !!c.still, small = k < 1, tiny = W < 300;

    /* type scale (matches split.js) */
    var FS = small ? 11.5 : 12.5, FM = small ? 11 : 12, FN = small ? 12.5 : 14.5, FT = small ? 10 : 10.5;
    var LH = small ? 13.5 : 16;

    /* ---------- data ---------- */
    var box = d.box || {};
    var cp = isNum(box.cp) ? box.cp : null, cc = isNum(box.center) ? box.center : null;
    var ratio = isNum(box.ratio) ? box.ratio : (cp != null && cc ? cp / cc : null);
    var thr = isNum(box.threshold) ? box.threshold : null;
    var verdict = d.verdict ? String(d.verdict) : '';
    var rg = Array.isArray(d.regrounded) ? d.regrounded.filter(isNum) : [];
    var ans = isNum(d.answer) ? d.answer : (rg.length ? rg[rg.length - 1] : null);
    var ln = d.line || {};
    var lMin = isNum(ln.min) ? ln.min : 0, lMax = isNum(ln.max) && ln.max > lMin ? ln.max : 0.5;
    var marks = (Array.isArray(ln.marks) ? ln.marks : []).filter(function (m) { return m && isNum(m.v); });
    var M_ = function (m) { return f2(m) + ' m'; };

    var root = sv('g', { 'data-sw-gauge': phase }, g);

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
    function glyph(parent, kind, cx, cy, s, tone) {
      var q = s / 12, x = cx - s / 2, y = cy - s / 2, P = function (a, b) { return (x + a * q).toFixed(2) + ' ' + (y + b * q).toFixed(2); };
      var dd = kind === 'ok' ? 'M' + P(2.4, 6.3) + 'L' + P(4.8, 8.7) + 'L' + P(9.6, 3.6) : 'M' + P(3, 3) + 'L' + P(9, 9) + 'M' + P(9, 3) + 'L' + P(3, 9);
      return sv('path', { d: dd, style: 'fill:none;stroke:var(' + (tone || (kind === 'ok' ? '--ok' : '--bad')) + ');stroke-width:' + (small ? 1.7 : 1.9) + ';stroke-linecap:round;stroke-linejoin:round' }, parent);
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
    /* strike through a text node; measured, since the player draws before the svg is in the document */
    function strike(parent, t, tone, delay, px, weight, mono) {
      var w = textW(t.textContent, px, weight, mono), x = +t.getAttribute('x'), a = t.getAttribute('text-anchor');
      var b = { x: a === 'end' ? x - w : a === 'middle' ? x - w / 2 : x, width: w };
      var y = +t.getAttribute('y') - px * 0.27;
      var l = line(parent, b.x - 2, y, b.x + b.width + 2, y, '', 'stroke:var(' + (tone || '--bad') + ');stroke-width:1.5;stroke-linecap:round');
      drawOn(l, b.width + 4, delay || 0, 380);
      return l;
    }
    function smallCaps(parent, x, y, s, anchor) {
      return T(parent, x, y, s, { size: FT, weight: 500, ls: '.11em', fill: 'var(--faint)', anchor: anchor });
    }

    /* ================= layout ================= */
    var M = small ? 8 : 14;
    var top = small ? 40 : 50;                       /* the refuse step's badge sits in the top-left corner */
    var bottom = H - (small ? 12 : 48);              /* the desktop caption overlays the stage bottom */
    var gapC = small ? 12 : 26;
    /* scene in metres (schematic; x from the door box's left edge, y up from the floor) */
    var SCN = {
      w: 1.80, h: 2.10,
      doorBox: [0, 0, 0.94, 2.10], slab: [0.06, 0, 0.82, 2.02],
      phoneBox: [1.00, 0.30, 1.80, 1.80], body: [1.30, 1.24, 1.56, 1.58], hand: [1.265, 1.19, 1.35, 1.64],
      yCp: 1.63, yC: 1.05, cordX: 1.12, rungY: [0.76, 0.52]
    };
    /* keep the numbers consistent when spec differs from the recorded case: place the phone box from cp and cc */
    if (cp != null && cc != null && cc > cp + 0.3 && cc < 2) {
      var pl = 0.94 + cp, pr = 2 * (0.47 + cc) - pl;
      if (pr > pl + 0.3) { SCN.phoneBox[0] = pl; SCN.phoneBox[2] = pr; SCN.w = pr; }
    }
    var headRoom = LH + 2;                           /* the "door" name above the door box */
    var sw = Math.round((W - 2 * M) * (tiny ? 0.43 : 0.45));
    var s = Math.min(sw / SCN.w, (bottom - top - headRoom) / SCN.h);
    var x0 = M + 2, yF = bottom;
    var X = function (m) { return x0 + m * s; }, Y = function (m) { return yF - m * s; };
    var xR = Math.round(X(SCN.w) + gapC), xE = W - M, cw = xE - xR;

    /* ================= the scene ================= */
    var scene = sv('g', {}, root);
    var boxG = sv('g', {}, root);        /* box readings: recede in the answer phase */
    if (answer) boxG.setAttribute('style', 'opacity:.42');

    /* floor */
    line(scene, X(-0.03), Y(0), X(SCN.w + 0.04), Y(0), '', 'stroke:var(--rule);stroke-width:1.2');
    /* door slab, two panels, lever handle on the facing side */
    var sl = SCN.slab;
    var objStyle = 'fill:var(--paper);stroke:var(--ink);stroke-width:' + (small ? 1.2 : 1.4) + ';stroke-linejoin:round';
    var thin = 'fill:none;stroke:var(--faint);stroke-width:1';
    sv('rect', { x: X(sl[0]), y: Y(sl[3]), width: (sl[2] - sl[0]) * s, height: (sl[3] - sl[1]) * s, rx: 1.5, style: objStyle }, scene);
    var pi = 0.11;
    sv('rect', { x: X(sl[0] + pi), y: Y(sl[3] - pi), width: (sl[2] - sl[0] - 2 * pi) * s, height: (sl[3] - 1.14 - pi) * s, rx: 1, style: thin }, scene);
    sv('rect', { x: X(sl[0] + pi), y: Y(0.86), width: (sl[2] - sl[0] - 2 * pi) * s, height: (0.86 - pi) * s, rx: 1, style: thin }, scene);
    var hy = 1.0;
    line(scene, X(sl[0] + 0.05), Y(hy), X(sl[0] + 0.17), Y(hy), '', 'stroke:var(--ink);stroke-width:' + (small ? 1.4 : 1.8) + ';stroke-linecap:round');
    sv('circle', { cx: X(sl[0] + 0.06), cy: Y(hy), r: Math.max(1.6, 0.022 * s), style: 'fill:var(--ink)' }, scene);

    /* wall telephone: body, handset on the left, keypad, coiled cord hanging from the handset back into the body */
    var bd = SCN.body, hs = SCN.hand;
    sv('rect', { x: X(bd[0]), y: Y(bd[3]), width: (bd[2] - bd[0]) * s, height: (bd[3] - bd[1]) * s, rx: Math.max(2, 0.03 * s), style: objStyle }, scene);
    if (s > 70) {
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) sv('circle', { cx: X(1.40 + i * 0.05), cy: Y(1.49 - j * 0.07), r: 1.1, style: 'fill:var(--muted)' }, scene);
    }
    sv('rect', { x: X(hs[0]), y: Y(hs[3]), width: (hs[2] - hs[0]) * s, height: (hs[3] - hs[1]) * s, rx: Math.max(2, 0.04 * s), style: objStyle }, scene);
    /* cord: a U-shaped centre line (handset -> down the left strand -> up into the body), resampled by arc length
       and coiled around it; the left strand's outer edge sits at SCN.cordX */
    var amp = 0.018, xs = SCN.cordX + amp, cl = [], n;
    function bez(a, b, e, f, t) { var u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * e[0] + t * t * t * f[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * e[1] + t * t * t * f[1]]; }
    function seg(a, b) { for (var t = 1; t <= 40; t++) cl.push([a[0] + (b[0] - a[0]) * t / 40, a[1] + (b[1] - a[1]) * t / 40]); }
    function cub(a, b, e, f) { for (var t = 1; t <= 60; t++) cl.push(bez(a, b, e, f, t / 60)); }
    cl.push([1.30, 1.19]);
    cub([1.30, 1.19], [1.28, 1.02], [xs, 1.08], [xs, 0.92]);
    seg([xs, 0.92], [xs, 0.48]);
    cub([xs, 0.48], [xs, 0.30], [1.47, 0.30], [1.47, 0.50]);
    seg([1.47, 0.50], [1.47, 1.24]);
    var acc = [0];
    for (n = 1; n < cl.length; n++) acc.push(acc[n - 1] + Math.hypot(cl[n][0] - cl[n - 1][0], cl[n][1] - cl[n - 1][1]));
    var Ltot = acc[acc.length - 1], ds = 0.003, pitch = s > 70 ? 0.04 : 0.05, coilD = '', ci = 0;
    for (var L = 0; L <= Ltot + 1e-9; L += ds) {
      while (ci < acc.length - 2 && acc[ci + 1] < L) ci++;
      var t0 = (L - acc[ci]) / ((acc[ci + 1] - acc[ci]) || 1), pA = cl[ci], pB = cl[ci + 1];
      var px = pA[0] + (pB[0] - pA[0]) * t0, py = pA[1] + (pB[1] - pA[1]) * t0;
      var tx = pB[0] - pA[0], ty = pB[1] - pA[1], tl = Math.hypot(tx, ty) || 1;
      var env = Math.min(1, L / 0.05, (Ltot - L) / 0.05);
      var w = amp * env * Math.sin(L / pitch * 2 * Math.PI);
      coilD += (coilD ? 'L' : 'M') + X(px - ty / tl * w).toFixed(1) + ' ' + Y(py + tx / tl * w).toFixed(1);
    }
    sv('path', { d: coilD, style: 'fill:none;stroke:var(--ink);stroke-width:' + (small ? 0.9 : 1.05) + ';stroke-linejoin:round;stroke-linecap:round;opacity:.85' }, scene);

    /* detector boxes and names */
    var db = SCN.doorBox, pb = SCN.phoneBox;
    var boxSt = 'fill:none;stroke:var(--tools);stroke-width:1.3;stroke-dasharray:5 3.5';
    sv('rect', { x: X(db[0]), y: Y(db[3]), width: (db[2] - db[0]) * s, height: (db[3] - db[1]) * s, rx: 1.5, style: boxSt }, boxG);
    sv('rect', { x: X(pb[0]), y: Y(pb[3]), width: (pb[2] - pb[0]) * s, height: (pb[3] - pb[1]) * s, rx: 1.5, style: boxSt }, boxG);
    T(scene, X(db[0]) + 1, Y(db[3]) - (small ? 5 : 7), 'door', { cls: 'sc-dt-tool' });
    T(scene, X(pb[2]) + (tiny ? 6 : -1), Y(pb[1]) + FS + (small ? 3 : 5), 'telephone', { cls: 'sc-dt-tool', anchor: 'end' });

    /* centre to centre: grey dashed between the two box centres */
    var ccx0 = (db[0] + db[2]) / 2, ccx1 = (pb[0] + pb[2]) / 2, yc = SCN.yC;
    var cLine = line(boxG, X(ccx0), Y(yc), X(ccx1), Y(yc), '', 'stroke:var(--muted);stroke-width:1.4;stroke-dasharray:4 4;stroke-linecap:round');
    [ccx0, ccx1].forEach(function (x) {
      sv('circle', { cx: X(x), cy: Y(yc), r: small ? 2.4 : 3, style: 'fill:var(--paper);stroke:var(--muted);stroke-width:1.4' }, boxG);
    });
    if (cc != null) T(boxG, X(sl[2]) - (small ? 5 : 7), Y(yc) - (small ? 5 : 7), M_(cc), { cls: 'sc-dt-mono', size: FM, fill: 'var(--muted)', anchor: 'end' });
    drawOn(cLine, (ccx1 - ccx0) * s, 120, 560);

    /* closest points of the two boxes: short red segment in the gap, label above the phone box */
    var ycp = SCN.yCp, gx0 = X(db[2]), gx1 = X(pb[0]), tk = small ? 3.5 : 4.5;
    var cpG = sv('g', {}, boxG);
    line(cpG, gx0, Y(ycp), gx1, Y(ycp), '', 'stroke:var(--bad);stroke-width:' + (small ? 2 : 2.4) + ';stroke-linecap:butt');
    line(cpG, gx0, Y(ycp) - tk, gx0, Y(ycp) + tk, '', 'stroke:var(--bad);stroke-width:1.4');
    line(cpG, gx1, Y(ycp) - tk, gx1, Y(ycp) + tk, '', 'stroke:var(--bad);stroke-width:1.4');
    var yCpLab = Y(pb[3]) - (small ? 7 : 9);
    line(cpG, (gx0 + gx1) / 2, Y(ycp) - tk - 2, (gx0 + gx1) / 2, yCpLab + 4, '', 'stroke:var(--bad);stroke-width:1;opacity:.7');
    var cpLab = cp != null ? T(cpG, (gx0 + gx1) / 2 - 3, yCpLab, M_(cp), { cls: 'sc-dt-bad', size: FN, mono: true, weight: 500 }) : null;
    fade(cpG, 240, 420);
    if (refuse && cpLab) strike(cpG, cpLab, '--bad', still ? 0 : 520, FN, 500, true);

    /* answer: re-grounded rungs between the door's facing edge and the cord */
    if (answer && rg.length) {
      var rgG = sv('g', {}, root);
      var xe = X(sl[2]);
      rg.forEach(function (v, i) {
        var last = i === rg.length - 1;
        var yy = Y(SCN.rungY[i] != null ? SCN.rungY[i] : SCN.rungY[0] - 0.1 * i);
        var l = line(rgG, xe, yy, xe + v * s, yy, '', last ? 'stroke:var(--ok);stroke-width:' + (small ? 2.2 : 2.6) + ';stroke-linecap:round' : 'stroke:var(--muted);stroke-width:1.4;stroke-linecap:round');
        sv('circle', { cx: xe, cy: yy, r: last ? 2.6 : 2, style: 'fill:var(' + (last ? '--ok' : '--muted') + ')' }, rgG);
        sv('circle', { cx: xe + v * s, cy: yy, r: last ? 2.6 : 2, style: 'fill:var(' + (last ? '--ok' : '--muted') + ')' }, rgG);
        drawOn(l, v * s, 200 + i * 260, 480);
        var t = T(rgG, xe - (small ? 5 : 7), yy + FM * 0.36, M_(v), last ? { cls: 'sc-dt-ok', size: FM, mono: true, weight: 600, anchor: 'end' } : { cls: 'sc-dt-mono', size: FM, fill: 'var(--muted)', anchor: 'end' });
        fade(t, 380 + i * 260, 360);
      });
    }

    /* ================= right column ================= */
    var col = sv('g', {}, root);
    var yA = top + (small ? 4 : 8);

    if (!refuse) {
      /* key for the two strokes */
      var key = sv('g', {}, col);
      smallCaps(key, xR, yA, textW('MEASURE_PAIR · ON THE BOXES', FT, 500) * 1.12 + 4 < cw ? 'MEASURE_PAIR · ON THE BOXES' : 'MEASURE_PAIR');
      var ky = yA + (small ? 22 : 28), sw2 = small ? 16 : 22;
      line(key, xR, ky - FS * 0.33, xR + sw2, ky - FS * 0.33, '', 'stroke:var(--bad);stroke-width:2.4');
      T(key, xR + sw2 + 8, ky, 'closest points', { cls: 'sc-dt-strong' });
      T(key, xR + sw2 + 8, ky + LH - 1, 'of the two boxes', {});
      ky += LH * 2 + (small ? 6 : 10);
      line(key, xR, ky - FS * 0.33, xR + sw2, ky - FS * 0.33, '', 'stroke:var(--muted);stroke-width:1.4;stroke-dasharray:4 4');
      T(key, xR + sw2 + 8, ky, 'box centre to', { cls: 'sc-dt-strong' });
      T(key, xR + sw2 + 8, ky + LH - 1, 'box centre', {});
      fade(key, 300, 420);
      return;
    }

    /* ----- sizes of the three right-column blocks (so the answer can fit on small stages) ----- */
    var sT = verdict || 'RETRY_GROUNDING', sub = 'diagnostic, not an answer';
    var sF = small ? 11.5 : 13, subF = small ? 10.5 : 11.5;
    var sPadX = small ? 8 : 11, sPadY = small ? 6 : 8;
    var sW = Math.min(cw, Math.max(textW(sT, sF, 600, true), textW(sub, subF, 400)) + 2 * sPadX);
    var sH = sF + subF + 5 + 2 * sPadY;
    var yQ = yA + (small ? 19 : 25);
    var yBar = yQ + (small ? 20 : 26), bh = small ? 5 : 6;
    var yTickLab = yBar + bh / 2 + (small ? 13 : 16);
    var yS = yTickLab + (small ? 12 : 18);

    /* number-line rows (below the line: the wrong readings, highest first) */
    var NX = function (v) { return xR + 4 + (clamp(v, lMin, lMax) - lMin) / (lMax - lMin) * (cw - 8); };
    var swM = null, trM = null, below = [];
    marks.forEach(function (m) { if (m.tone === 'sw') swM = m; else if (m.tone === 'truth') trM = m; else below.push(m); });
    below.sort(function (a, b) { return b.v - a.v; });
    var xl = below.length ? NX(below[0].v) + (small ? 8 : 10) : xR, avail = xE - xl;
    var nwNum = textW('0.00', FM, 400, true) + 5, subSize = Math.max(10, FS - 1);
    function wrap(str, px, maxW) {
      var words = String(str).split(/\s+/), out = [], cur = '';
      words.forEach(function (wd) { var nx = cur ? cur + ' ' + wd : wd; if (cur && textW(nx, px) > maxW) { out.push(cur); cur = wd; } else cur = nx; });
      if (cur) out.push(cur);
      return out;
    }
    var rows = below.map(function (m) {
      var tone = m.tone, who = tone === 'refused' ? 'refused' : String(m.who || '');
      if (textW(who, FS, 500) > avail - nwNum) who = who.replace(/,.*$/, '');
      return { m: m, who: who, sub: tone === 'bad' ? wrap('answered the box reading', subSize, avail) : [] };
    });
    var rowGap = small ? 1 : 3;
    var nlH = LH + 2 * LH + 4 + (small ? 17 : 21) + rows.reduce(function (a, r) { return a + (LH + rowGap) + r.sub.length * (LH - 1); }, 0) - LH;
    /* the answer keeps as much of the guard as fits: all of it, its stamp only (under the title), or nothing */
    var nlGap = small ? 16 : 26, ySt = yA + (small ? 10 : 14);
    var mode = !answer || yS + sH + nlGap + nlH <= bottom - 2 ? 'full' : ySt + sH + nlGap + nlH <= bottom - 2 ? 'stamp' : 'none';
    if (mode === 'stamp') yS = ySt;
    var compact = mode === 'none';
    var yGuardEnd = yS + sH + nlGap;

    /* ----- the guard's test ----- */
    var guard = sv('g', {}, col);
    if (!compact) {
      smallCaps(guard, xR, yA, 'NEAR_TOUCH_GUARD');
    }
    if (mode === 'full') {
      T(guard, xR, yQ, tiny ? 'closest ÷ centres' : 'closest ÷ centre distance', {});
      var BX = function (v) { return xR + clamp(v, 0, 1) * cw; };
      sv('rect', { x: xR, y: yBar - bh / 2, width: cw, height: bh, rx: bh / 2, style: 'fill:var(--rule)' }, guard);
      if (thr != null) {
        sv('rect', { x: BX(thr), y: yBar - bh / 2, width: BX(1) - BX(thr), height: bh, rx: bh / 2, style: 'fill:var(--brand-soft);stroke:var(--brand);stroke-width:1;stroke-opacity:.35' }, guard);
        line(guard, BX(thr), yBar - bh / 2 - (small ? 6 : 8), BX(thr), yBar + bh / 2 + (small ? 6 : 8), '', 'stroke:var(--brand);stroke-width:2;stroke-linecap:round');
        T(guard, BX(thr) + 5, yBar - bh / 2 - (small ? 4 : 5), 'usable ≥ ' + f2(thr), { cls: 'sc-dt-brand', size: FM, mono: true });
      }
      T(guard, xR, yTickLab, '0', { cls: 'sc-dt-mono' });
      T(guard, xE, yTickLab, '1', { cls: 'sc-dt-mono', anchor: 'end' });
      if (ratio != null) {
        var rx = BX(ratio);
        sv('rect', { x: xR, y: yBar - bh / 2, width: Math.max(bh, rx - xR), height: bh, rx: bh / 2, style: 'fill:var(--bad)' }, guard);
        sv('circle', { cx: rx, cy: yBar, r: small ? 4 : 5, style: 'fill:var(--bad);stroke:var(--surface);stroke-width:1.6' }, guard);
        T(guard, rx + (small ? 12 : 16), yTickLab, f2(ratio), { cls: 'sc-dt-bad', size: FM, mono: true });
      }
      fade(guard, 60, 420);
    }
    if (!compact) {
      /* verdict stamp */
      var stamp = sv('g', {}, col);
      sv('rect', { x: xR + 0.75, y: yS + 0.75, width: sW - 1.5, height: sH - 1.5, rx: 4, style: 'fill:var(--surface);stroke:var(--bad);stroke-width:1.5' }, stamp);
      T(stamp, xR + sPadX, yS + sPadY + sF * 0.82, sT, { cls: 'sc-dt-bad', size: sF, mono: true, weight: 600, ls: '.02em' });
      T(stamp, xR + sPadX, yS + sPadY + sF + 4 + subF * 0.82, sub, { size: subF, italic: true });
      if (!answer) {
        fade(stamp, 520, 420);
        if (!still && stamp.animate) {
          try { stamp.animate([{ transform: 'scale(1.06)', transformOrigin: xR + 'px ' + yS + 'px' }, { transform: 'none', transformOrigin: xR + 'px ' + yS + 'px' }], { duration: 420, delay: 520, easing: EASE, fill: 'backwards' }); } catch (e) { /* no motion */ }
        }
      }
    }
    if (!answer) return;
    guard.setAttribute('style', 'opacity:.5');

    /* ----- answer: the number line ----- */
    var nl = sv('g', {}, col);
    var yN0 = compact ? yA : yGuardEnd;
    smallCaps(nl, xR, yN0, 'ANSWERS · METRES');
    var yLine = yN0 + LH * 2 + (small ? 8 : 12);
    line(nl, NX(lMin), yLine, NX(lMax), yLine, '', 'stroke:var(--muted);stroke-width:1.3;stroke-linecap:round');
    for (var tv = lMin; tv <= lMax + 1e-9; tv += 0.1) {
      var major = Math.abs(tv - lMin) < 1e-9 || Math.abs(tv - lMax) < 1e-9;
      line(nl, NX(tv), yLine - (major ? 4 : 3), NX(tv), yLine + (major ? 4 : 3), '', 'stroke:var(--faint);stroke-width:1');
    }
    /* above the line: SpatialWeave (left of its dot) and the truth (right of its tick), two rows each */
    var yA2 = yLine - (small ? 8 : 10), yA1 = yA2 - LH;
    if (trM) {
      line(nl, NX(trM.v), yLine - 9, NX(trM.v), yLine + 9, '', 'stroke:var(--ink);stroke-width:2;stroke-linecap:round');
      T(nl, NX(trM.v) + 5, yA1, trM.who || 'truth', { cls: 'sc-dt-strong' });
      T(nl, NX(trM.v) + 5, yA2, M_(trM.v), { cls: 'sc-dt-strong', size: FM, mono: true, weight: 500 });
    }
    if (swM) {
      sv('circle', { cx: NX(swM.v), cy: yLine, r: small ? 4.5 : 5.5, style: 'fill:var(--ok);stroke:var(--surface);stroke-width:1.6' }, nl);
      var swTxt = M_(swM.v), swW = textW(swTxt, FM, 600, true), swX = NX(swM.v) - 5;
      T(nl, swX, yA2, swTxt, { cls: 'sc-dt-ok', size: FM, mono: true, weight: 600, anchor: 'end' });
      glyph(nl, 'ok', swX - swW - (small ? 10 : 11), yA2 - FM * 0.36, small ? 11 : 12);
      T(nl, swX, yA1, swM.who || 'SpatialWeave', { cls: 'sc-dt-ok', anchor: 'end' });
    }
    /* below the line: the wrong readings, stacked with elbow leaders */
    var yRow = yLine + (small ? 17 : 21);
    rows.forEach(function (r) {
      var m = r.m, x = NX(m.v), tone = m.tone;
      var tv2 = tone === 'bad' ? '--bad' : tone === 'refused' ? '--faint' : '--muted';
      if (tone === 'refused') sv('circle', { cx: x, cy: yLine, r: small ? 3 : 3.5, style: 'fill:var(--surface);stroke:var(--faint);stroke-width:1.4' }, nl);
      else glyph(nl, 'bad', x, yLine, small ? 10 : 11, tv2);
      var yy = yRow - FS * 0.33;
      sv('path', { d: 'M' + x + ' ' + (yLine + 6) + 'V' + yy + 'H' + (xl - 3), style: 'fill:none;stroke:var(' + tv2 + ');stroke-width:1;opacity:.7' }, nl);
      var num = T(nl, xl, yRow, f2(m.v), { size: FM, mono: true, weight: tone === 'bad' ? 500 : 400, fill: 'var(' + tv2 + ')' });
      var whoT = T(nl, xl + nwNum, yRow, r.who, { cls: tone === 'bad' ? 'sc-dt-bad' : '', fill: tone === 'refused' ? 'var(--faint)' : '' });
      if (tone === 'refused') { strike(nl, num, '--faint', 0, FM, 400, true); }
      void whoT;
      r.sub.forEach(function (ln2) { yRow += LH - 1; T(nl, xl, yRow, ln2, { size: subSize, fill: 'var(--bad)' }); });
      yRow += LH + rowGap;
    });
    fade(nl, 260, 480);
    void ans;
  }
})();
