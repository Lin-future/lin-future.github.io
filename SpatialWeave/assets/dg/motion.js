/* '@motion' · mc_room "Turned right, moved left", decided by the camera_motion WORKFLOW (two separate fields).
   poses   top view: frame 1 at the bottom facing forward (up), frame 2 at its recorded position in frame 1's
           ground frame, rotated by the recorded yaw. Key: forward arrow + a scale bar in spec.units.
   ''      + the two fields camera_motion returns: the move (solid brand arrow frame 1 -> frame 2,
           "moved: forward-left / bearing -57°") and the turn (muted arc at frame 2 from straight ahead,
           "turned: right 68° / yaw +67.5°").
   answer  + the four option directions as a small dial around frame 1 (letters A-D), the move arrow in green
           landing next to C (checked), and B drawn as a red dashed ghost with a cross: the turn, which every
           model alone reported as the move.
   Everything printed comes from spec (runs.js): forward, lateral, bearing, yaw, units, moveWord, turnWord,
   options[[letter, word, deg]], truth, base, baseWho. Derived only: positions (forward/lateral scaled to fit),
   rounded degrees, the scale bar length. */
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
    return String(str).length * px * (mono ? 0.6 : 0.57);
  }
  function plain(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' '); }
  function sgn(v, digits) { var a = Math.abs(v).toFixed(digits || 0); return (Number(a) === 0 ? '' : v > 0 ? '+' : '−') + a; }

  SWD.motion = function (g, spec, ctx) {
    try { draw(g, spec || {}, ctx || {}); }
    catch (e) { if (window.console) console.warn('diagram motion', e); }
  };

  function draw(g, d, c) {
    var W = c.W, H = c.H, k = c.k || 1, sv = c.sv;
    if (!(W > 0 && H > 0) || typeof sv !== 'function' || typeof c.text !== 'function') return;
    if (!isNum(d.forward) || !isNum(d.lateral)) return;
    var phase = c.phase || '';
    var poses = phase === 'poses', answer = phase === 'answer';
    var still = !!c.still, small = k < 1, tiny = W < 300;


    var FS = small ? 11.5 : 12.5, FM = small ? 11 : 12, FB = small ? 10 : 11, LH = small ? 15 : 16.5;
    var LR = small ? 7 : 8.5;

    /* ---------- helpers ---------- */
    function T(parent, x, y, str, o) {
      o = o || {};
      var t = c.text(parent, x, y, str, o.cls || '', o.anchor || 'start');
      var st = [];
      if (o.size) st.push('font-size:' + o.size + 'px');
      if (o.mono) st.push('font-family:var(--mono)');
      if (o.weight) st.push('font-weight:' + o.weight);
      if (o.fill) st.push('fill:' + o.fill);
      if (o.halo) st.push('stroke:' + o.halo);
      if (st.length) t.setAttribute('style', st.join(';'));
      return t;
    }
    function P(tag, attrs, parent, style) { if (style) attrs.style = style; return sv(tag, attrs, parent); }
    function fade(el, delay, dur) {
      if (still || !el || !el.animate) return;
      try { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur || 420, delay: delay || 0, easing: EASE, fill: 'backwards' }); } catch (e) { /* no motion */ }
    }
    function drawOn(el, len, delay, dur) {
      if (still || !el || !el.animate || !(len > 0)) return;
      var da = len.toFixed(1) + ' ' + len.toFixed(1);
      try { el.animate([{ strokeDasharray: da, strokeDashoffset: len }, { strokeDasharray: da, strokeDashoffset: 0 }], { duration: dur || 560, delay: delay || 0, easing: EASE, fill: 'backwards' }); } catch (e) { /* no motion */ }
    }
    function head(parent, x, y, ang, fill, size) {
      var a1 = ang + Math.PI * 0.84, a2 = ang - Math.PI * 0.84;
      return P('path', { d: 'M' + x + ' ' + y + 'L' + (x + size * Math.cos(a1)) + ' ' + (y + size * Math.sin(a1)) + 'L' + (x + size * Math.cos(a2)) + ' ' + (y + size * Math.sin(a2)) + 'Z' }, parent, 'fill:' + fill + ';stroke:none');
    }
    function glyph(parent, kind, x, y, s) {
      var q = s / 12, x0 = x - s / 2, y0 = y - s / 2, Q = function (a, b) { return (x0 + a * q).toFixed(2) + ' ' + (y0 + b * q).toFixed(2); };
      var dd = kind === 'ok' ? 'M' + Q(2.2, 6.4) + 'L' + Q(4.8, 9) + 'L' + Q(9.8, 3.4) : 'M' + Q(3, 3) + 'L' + Q(9, 9) + 'M' + Q(9, 3) + 'L' + Q(3, 9);
      return P('path', { d: dd }, parent, 'fill:none;stroke:var(' + (kind === 'ok' ? '--ok' : '--bad') + ');stroke-width:' + (small ? 1.7 : 1.9) + ';stroke-linecap:round;stroke-linejoin:round');
    }
    /* an option letter in the walls-diagram style: green disc (truth), red dashed ring (base), faint ring (other) */
    function letter(parent, x, y, L, style) {
      var b = sv('g', {}, parent);
      P('circle', { cx: x, cy: y, r: LR }, b,
        style === 'ok' ? 'fill:var(--ok);stroke:var(--ok);stroke-width:1.2'
          : style === 'bad' ? 'fill:var(--paper);stroke:var(--bad);stroke-width:1.2;stroke-dasharray:2.4 2'
            : 'fill:var(--paper);stroke:var(--faint);stroke-width:1.1');
      T(b, x, y + FB * 0.36, L, { anchor: 'middle', size: FB, weight: 500, fill: style === 'ok' ? 'var(--paper)' : style === 'bad' ? 'var(--bad)' : 'var(--muted)', halo: 'none' });
      return b;
    }

    /* ---------- data ---------- */
    var fwd = d.forward, lat = d.lateral, yawD = isNum(d.yaw) ? d.yaw : 0;
    var bearD = isNum(d.bearing) ? d.bearing : Math.atan2(lat, fwd) * 180 / Math.PI;
    var units = plain(d.units || 'units');
    var moveWord = plain(d.moveWord || ''), turnWord = plain(d.turnWord || (yawD > 0 ? 'right' : 'left'));
    var opts = (Array.isArray(d.options) ? d.options : []).filter(function (o) { return Array.isArray(o) && o.length >= 3 && isNum(o[2]); });
    var truth = plain(d.truth || ''), baseL = plain(d.base || ''), baseWho = plain(d.baseWho || '');
    var up = -Math.PI / 2, rad = Math.PI / 180;
    var face = up + yawD * rad;                                   /* screen angle frame 2 faces (+yaw = right = clockwise) */
    var dirAng = function (deg) { return up + deg * rad; };       /* option / bearing degrees -> screen angle */

    /* ---------- layout: one geometry for every phase, scaled to fill the stage ---------- */
    var band = small ? 8 : 42;                                    /* the caption overlays the stage bottom at k >= 1 */
    var topM = small ? 8 : 12, sideM = small ? 8 : 14;
    var kx = W - sideM, ky = topM + FM;
    var keyL1 = tiny ? '↑ forward' : '↑ forward of frame 1';
    var keyW = textW(keyL1, FM, 400, true) + 4;
    var bo = null;
    opts.forEach(function (o) { if (plain(o[0]) === baseL) bo = o; });
    var turnTxt = 'turned: ' + turnWord + ' ' + Math.round(Math.abs(yawD)) + '°', yawTxt = 'yaw ' + sgn(yawD, 1) + '°';
    if (tiny) yawTxt = '';                                         /* the smallest stage keeps the rounded turn only */
    var turnW = Math.max(textW(turnTxt, FS, 500), yawTxt ? textW(yawTxt, FM, 400, true) : 0);
    var g1 = baseL + ' · the turn', g2 = tiny ? '' : (baseWho || 'base');
    var ghostW = Math.max(textW(g1, FS, 500), g2 ? textW(g2, FS - 1, 400) : 0) + 14, ghostH = g2 ? LH : 0;
    var f2W = textW('frame 2', FS, 500), F2DY = small ? 24 : 28;
    /* scaled down, the answer's '→ C ✓' moves from the label to the C letter itself */
    var inLabel = !small && !!truth;
    var ml2 = 'bearing ' + sgn(bearD, 0) + '°';
    /* the move label in one piece, or with 'moved:' on its own line where space is short */
    var variants = [false, true].map(function (split) {
      var l1 = (split ? '' : 'moved: ') + moveWord + (inLabel ? ' → ' + truth : '');
      return { split: split, w: Math.max(textW(l1, FS, 500) + (inLabel ? 18 : 0), textW(ml2, FM, 400, true), split ? textW('moved:', FS, 500) : 0), top: split ? LH : 0 };
    });

    var tickW = 0;                                                /* the key's scale bar row, measured per U below */
    var unitWord = tiny ? 'units' : units;

    /* One geometry for every phase: for each scale U (px per reconstruction unit, largest first) place the fixed
       marks, centre them, then look for a free spot for the move label; the first U where everything fits wins. */
    function tryLayout(U, beside) {
      var o = { U: U };
      var v = [lat * U, -fwd * U], Ls = Math.hypot(v[0], v[1]);
      o.L = Ls; o.v = v;
      o.r0 = clamp(0.34 * Ls, 30, 64);
      o.refLen = clamp(0.3 * Ls, 28, 56);
      o.ar = clamp(0.2 * Ls, 18, 34);
      /* the base pick's ray: short with its label beside the end, or (where that does not fit) longer with the label above */
      var gl = beside ? o.r0 + 2 * LR + (small ? 10 : 14) : Math.max(Ls * 0.62, o.r0 + 30);
      var rr = o.r0 + LR + 4, box = [];
      box.push([v[0] - 4 - f2W / 2 - 2, v[1] - 16, v[0] + 16, v[1] + F2DY + 4]);                        /* frame 2 + label */
      o.turnRel = [v[0] + 8, v[1] - o.refLen + 4 - FS, v[0] + 8 + turnW, v[1] - o.refLen + 4 + (yawTxt ? LH : 0) + 3];
      box.push([v[0] - 4, o.turnRel[1], o.turnRel[2], o.turnRel[3]]);                                    /* turn */
      box.push([-rr - LR, -rr - LR, rr + LR, Math.max(o.r0, (small ? 22 : 26) + 4)]);                      /* dial, frame 1 */
      if (bo) {
        var ba = dirAng(bo[2]);
        o.ge = [Math.cos(ba) * gl, Math.sin(ba) * gl];
        if (beside) {
          var gR = Math.cos(ba) >= 0;
          o.gLab = [gR ? o.ge[0] + 8 : o.ge[0] - 8 - ghostW, o.ge[1] + FS * 0.35 - ghostH / 2];
          o.ghostRel = gR ? [o.ge[0] + 6, o.gLab[1] - FS, o.ge[0] + 8 + ghostW, o.gLab[1] + ghostH + 3] : [o.ge[0] - 8 - ghostW, o.gLab[1] - FS, o.ge[0] - 6, o.gLab[1] + ghostH + 3];
        } else {
          o.gLab = [o.ge[0] - ghostW / 2 + 4, o.ge[1] - 12 - ghostH];
          o.ghostRel = [o.ge[0] - ghostW / 2, o.ge[1] - 12 - ghostH - FS, o.ge[0] + ghostW / 2 + 6, o.ge[1] - 12 - ghostH + (ghostH ? LH : 0) + 3];
        }
        box.push(o.ghostRel);
      }
      var minx = Math.min.apply(null, box.map(function (q) { return q[0]; })), maxx = Math.max.apply(null, box.map(function (q) { return q[2]; }));
      var miny = Math.min.apply(null, box.map(function (q) { return q[1]; })), maxy = Math.max.apply(null, box.map(function (q) { return q[3]; }));
      if (maxx - minx > W - 2 * sideM || maxy - miny > H - topM - band) return null;
      var ox = (W - (maxx - minx)) / 2 - minx, oy = topM + (H - topM - band - (maxy - miny)) / 2 - miny;
      /* the key (top right) */
      var sb = [0.25, 0.5, 1].filter(function (q) { return q * U <= (tiny ? 56 : 96); }).pop() || 0.25;
      var keyBox = [kx - Math.max(keyW, sb * U + 7 + textW(sb + ' ' + unitWord, FM, 400, true)) - 6, 0, W, ky + LH + 6];
      var abs = function (q) { return [q[0] + ox, q[1] + oy, q[2] + ox, q[3] + oy]; };
      var meets = function (p, q) { return p[0] < q[2] && p[2] > q[0] && p[1] < q[3] && p[3] > q[1]; };
      var push = 0;
      box.forEach(function (q) { var A = abs(q); if (meets(A, keyBox)) push = Math.max(push, keyBox[3] + 4 - A[1]); });
      oy += push;
      if (oy + maxy > H - band) return null;
      o.ox = ox; o.oy = oy; o.sb = sb;
      var obst = box.map(abs).concat([keyBox]);
      opts.forEach(function (op) {
        var a = dirAng(op[2]), x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr;
        obst.push([x - LR - 3, y - LR - 3, x + LR + 3, y + LR + 3]);
      });
      obst.push([ox - 30, oy - 12, ox + 30, oy + (small ? 22 : 26) + 4]);
      /* the move label: beside the arrow, never across it */
      var c1a = [ox, oy], c2a = [ox + v[0], oy + v[1]];
      var nx = -v[1] / Ls, ny = v[0] / Ls;
      if (ny < 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }                 /* the normal pointing down / left */
      var crosses = function (bx) {
        for (var i = 1; i < 24; i++) {
          var t = i / 24, x = c1a[0] + v[0] * t, y = c1a[1] + v[1] * t;
          if (x > bx[0] - 5 && x < bx[2] + 5 && y > bx[1] - 5 && y < bx[3] + 5) return true;
        }
        return false;
      };
      var found = null;
      [[1, variants[0]], [1, variants[1]], [-1, variants[0]], [-1, variants[1]]].some(function (sv2) {
        var side = sv2[0], vr = sv2[1], moveW = vr.w, H1 = FS + vr.top, H2 = LH + 3;
        return [0.5, 0.44, 0.56, 0.62, 0.38, 0.68, 0.32, 0.74].some(function (t) {
          var ax = c1a[0] + v[0] * t + side * nx * 14, ay = c1a[1] + v[1] * t + side * ny * 14;
          /* right-aligned on the left of the arrow, left-aligned on its right */
          var leftSide = side * nx < 0 || (side * nx === 0 && side < 0);
          var x0 = leftSide ? ax - moveW : ax, y0 = side * ny > 0 ? ay : ay - H1 - H2;
          x0 = clamp(x0, sideM, W - sideM - moveW);
          var bx = [x0, y0, x0 + moveW, y0 + H1 + H2];
          if (bx[3] > H - band || bx[1] < topM || crosses(bx) || obst.some(function (q) { return meets(bx, q); })) return false;
          found = { x: leftSide ? bx[2] : bx[0], y: bx[1] + H1, anchor: leftSide ? 'end' : 'start', split: vr.split };
          return true;
        });
      });
      if (!found) return null;
      o.label = found;
      return o;
    }
    var fit = function (beside) { for (var U0 = Math.min(W, H) * 0.9; U0 >= 24; U0 -= 2) { var o = tryLayout(U0, beside); if (o) return o; } return null; };
    var Gb = fit(true), Ga = fit(false);
    var G = Gb && (!Ga || Gb.U >= Ga.U * 0.9) ? Gb : Ga;
    if (!G) return;
    var U = G.U, L = G.L, r0 = G.r0;
    var c1 = [G.ox, G.oy], c2 = [G.ox + G.v[0], G.oy + G.v[1]];
    var fov = clamp(0.26 * L, 22, 40);
    var moveAng = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]);

    var root = sv('g', { 'data-sw-motion': phase || 'motion' }, g);
    var base = sv('g', {}, root), marks = sv('g', {}, root), cams = sv('g', {}, root), labs = sv('g', {}, root);

    /* ---------- key (top right): forward + a scale bar in spec.units ---------- */
    T(labs, kx, ky, keyL1, { cls: 'sc-dt-mono', anchor: 'end', size: FM });
    var sb = G.sb, bw = sb * U, by = ky + LH;
    P('path', { d: 'M' + (kx - bw) + ' ' + (by - 7) + 'v4H' + kx + 'v-4' }, labs, 'fill:none;stroke:var(--faint);stroke-width:1.2');
    T(labs, kx - bw - 7, by - 1, sb + ' ' + unitWord, { cls: 'sc-dt-mono', anchor: 'end', size: FM });

    /* ---------- answer: the option dial around frame 1 (drawn under everything) ---------- */
    var letterAt = {};
    if (answer && opts.length) {
      var dial = sv('g', {}, base);
      P('circle', { cx: c1[0], cy: c1[1], r: r0 }, dial, 'fill:none;stroke:var(--faint);stroke-width:1;stroke-dasharray:2 4;opacity:.8');
      opts.forEach(function (o) {
        var a = dirAng(o[2]), isT = plain(o[0]) === truth;
        P('line', { x1: c1[0] + Math.cos(a) * 14, y1: c1[1] + Math.sin(a) * 14, x2: c1[0] + Math.cos(a) * r0, y2: c1[1] + Math.sin(a) * r0 }, dial,
          isT ? 'stroke:var(--ok);stroke-width:1.6;stroke-linecap:round' : 'stroke:var(--faint);stroke-width:1.1;stroke-linecap:round');
        var rr = r0 + LR + 4;
        letterAt[plain(o[0])] = [c1[0] + Math.cos(a) * rr, c1[1] + Math.sin(a) * rr, a];
      });
      fade(dial, 0, 420);
    }

    /* ---------- the turn at frame 2 (camera_motion field 2) ---------- */
    if (!poses) {
      var tg = sv('g', {}, marks);
      var refLen = G.refLen, ar = G.ar;
      P('line', { x1: c2[0], y1: c2[1] - 12, x2: c2[0], y2: c2[1] - refLen }, tg, 'stroke:var(--faint);stroke-width:1.2;stroke-dasharray:3 4');
      var p0 = [c2[0] + ar * Math.cos(up), c2[1] + ar * Math.sin(up)], p1 = [c2[0] + ar * Math.cos(face), c2[1] + ar * Math.sin(face)];
      var arc = P('path', { d: 'M' + p0[0] + ' ' + p0[1] + 'A' + ar + ' ' + ar + ' 0 0 ' + (yawD >= 0 ? 1 : 0) + ' ' + p1[0] + ' ' + p1[1], class: 'sc-dmuted' }, tg);
      var tang = face + (yawD >= 0 ? Math.PI / 2 : -Math.PI / 2);
      head(tg, p1[0] + Math.cos(tang) * 1.5, p1[1] + Math.sin(tang) * 1.5, tang, 'var(--muted)', small ? 6 : 7);
      if (!answer) drawOn(arc, ar * Math.abs(yawD) * rad, 520, 460);
      var tlx = c2[0] + 8, tly = c2[1] - refLen + 4;
      var tl = sv('g', {}, labs);
      T(tl, tlx, tly, turnTxt, { cls: 'sc-dt-strong', size: FS, fill: 'var(--muted)' });
      if (yawTxt) T(tl, tlx, tly + LH, yawTxt, { cls: 'sc-dt-mono', size: FM });
      if (!answer) fade(tl, 600, 420);
    }

    /* ---------- the move frame 1 -> frame 2 (camera_motion field 1) ---------- */
    if (!poses) {
      var s0 = [c1[0] + Math.cos(moveAng) * 13, c1[1] + Math.sin(moveAng) * 13];
      var e0 = [c2[0] - Math.cos(moveAng) * 17, c2[1] - Math.sin(moveAng) * 17];
      var mv = P('line', { x1: s0[0], y1: s0[1], x2: e0[0], y2: e0[1], class: answer ? 'sc-dok' : 'sc-dbrand' }, marks);
      if (!answer) drawOn(mv, L - 30, 80, 620);
      var mh = head(marks, e0[0] + Math.cos(moveAng) * 2, e0[1] + Math.sin(moveAng) * 2, moveAng, answer ? 'var(--ok)' : 'var(--brand)', small ? 8 : 9.5);
      if (!answer) fade(mh, 560, 240);

      var lx = G.label.x, ly = G.label.y, anc = G.label.anchor, endA = anc === 'end', split = G.label.split;
      var ml = sv('g', {}, labs);
      var ok2 = answer && inLabel, l1 = (split ? '' : 'moved: ') + moveWord + (ok2 ? ' → ' + truth : '');
      if (split) T(ml, lx, ly - LH, 'moved:', { cls: answer ? 'sc-dt-ok' : 'sc-dt-brand', size: FS, anchor: anc });
      T(ml, lx - (inLabel && endA ? 18 : 0), ly, l1, { cls: answer ? 'sc-dt-ok' : 'sc-dt-brand', size: FS, anchor: anc });
      if (ok2) glyph(ml, 'ok', endA ? lx - 7 : lx + textW(l1, FS, 500) + 10, ly - FS * 0.35, small ? 11 : 13);
      T(ml, lx, ly + LH, ml2, { cls: 'sc-dt-mono', size: FM, anchor: anc, fill: answer ? 'var(--ok)' : 'var(--brand-ink)' });
      fade(ml, answer ? 300 : 420, 420);
    }

    /* ---------- answer: the base pick as a red dashed ghost (the turn, reported as a move) ---------- */
    if (answer && bo && G.ge) {
      var ba = dirAng(bo[2]);
      var gs = [c1[0] + Math.cos(ba) * 13, c1[1] + Math.sin(ba) * 13], ge = [c1[0] + G.ge[0], c1[1] + G.ge[1]];
      var gh = sv('g', {}, marks);
      P('line', { x1: gs[0], y1: gs[1], x2: ge[0], y2: ge[1], class: 'sc-dbad' }, gh);
      head(gh, ge[0] + Math.cos(ba) * 2, ge[1] + Math.sin(ba) * 2, ba, 'var(--bad)', small ? 7 : 8.5);
      fade(gh, 700, 460);
      var gt = sv('g', {}, labs);
      var gx = c1[0] + G.gLab[0], gy = c1[1] + G.gLab[1];
      glyph(gt, 'bad', gx + 4, gy - FS * 0.35, small ? 9 : 10);
      T(gt, gx + 14, gy, g1, { cls: 'sc-dt-bad', size: FS });
      if (g2) T(gt, gx + 14, gy + LH, g2, { cls: 'sc-dt-bad', size: FS - 1, weight: 400 });
      fade(gt, 820, 420);
    }
    /* ---------- cameras ---------- */
    c.camGlyph(cams, c1[0], c1[1], up, fov);
    var cam2 = sv('g', {}, cams);
    c.camGlyph(cam2, c2[0], c2[1], face, fov);
    if (poses) fade(cam2, 120, 480);
    T(labs, c1[0], c1[1] + (small ? 22 : 26), 'frame 1', { cls: 'sc-dt-strong', size: FS, anchor: 'middle' });
    var f2 = T(labs, c2[0] - 4, c2[1] + F2DY, 'frame 2', { cls: 'sc-dt-strong', size: FS, anchor: 'middle' });
    if (poses) fade(f2, 200, 480);

    /* ---------- answer: the option letters on top ---------- */
    if (answer) {
      var lg = sv('g', {}, labs);
      Object.keys(letterAt).forEach(function (L1) {
        var p = letterAt[L1];
        letter(lg, p[0], p[1], L1, L1 === truth ? 'ok' : L1 === baseL ? 'bad' : '');
        if (L1 === truth && !inLabel) {
          var da = p[2] - moveAng; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          var ca = p[2] + (da >= 0 ? 1 : -1) * Math.PI / 2;
          glyph(lg, 'ok', p[0] + Math.cos(ca) * (LR + 8), p[1] + Math.sin(ca) * (LR + 8), 11);
        }
      });
      fade(lg, 100, 420);
    }
  }
})();
