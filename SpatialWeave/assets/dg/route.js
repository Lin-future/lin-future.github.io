/* '@route' · mmsi_983 "Walking the route", decided by the turn_sequence tool (8 tool calls).
   anchors  top view of the landmarks placed in one frame: the staircase (stair bottom to stair top), the door
            and the fireplace, at the positions the walk implies; on the right, the frame the question sets
            (north = upstairs) as a compass.
   ''       turn_sequence: from the stair bottom facing up, straight up the stairs, a U-turn at the top (-175°)
            back to the door, a right turn at the door (+129°) to the fireplace. Each turn is an arc at its
            waypoint; the right column lists the turns as a column sum.
   answer   the column sums to -46°: the last leg runs 46° left of north. A dial at the door carries the four
            options; the last leg passes through the north-west quadrant (D, green) and the base model's
            south-west (A) is a red dashed ray.
   Printed values come from spec (runs.js): legs[].{to, turn, len, word}, from, net, truth, base; option names
   come from the run (r.options). Waypoints are derived by walking the legs (heading += turn, step len); leg 1
   and the start of leg 2 are drawn in two lanes so the U-turn stays readable. */
(function () {
  'use strict';
  var SWD = window.SWD = window.SWD || {};
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  var meter = null;
  var DIRS = { north: 0, northeast: 45, east: 90, southeast: 135, south: 180, southwest: -135, west: -90, northwest: -45 };

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
  function deg(v) { v = Math.round(v); return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '°'; }
  /* compass heading (degrees clockwise from north) to a screen angle (radians, y down) */
  function scr(h) { return (h - 90) * Math.PI / 180; }

  SWD.route = function (g, spec, ctx) {
    try { draw(g, spec || {}, ctx || {}); }
    catch (e) { if (window.console) console.warn('diagram route', e); }
  };

  function draw(g, d, c) {
    var W = c.W, H = c.H, k = c.k || 1, sv = c.sv;
    if (!(W > 0 && H > 0) || typeof sv !== 'function' || typeof c.text !== 'function') return;
    var phase = c.phase === 'anchors' || c.phase === 'answer' ? c.phase : c.answer ? 'answer' : 'route';
    var anchors = phase === 'anchors', answer = phase === 'answer';
    var still = !!c.still, small = k < 1, tiny = W < 300;
    var legs = (Array.isArray(d.legs) ? d.legs : []).filter(function (L) { return L && isNum(L.turn) && isNum(L.len) && L.len > 0; });
    if (legs.length < 2) return;

    /* ---------- helpers ---------- */
    function T(parent, x, y, str, o) {
      o = o || {};
      var t = c.text(parent, x, y, str, o.cls || '', o.anchor || 'start');
      var st = [];
      if (o.size) st.push('font-size:' + o.size + 'px');
      if (o.mono) st.push('font-family:var(--mono)');
      if (o.weight) st.push('font-weight:' + o.weight);
      if (o.fill) st.push('fill:' + o.fill);
      if (o.ls) st.push('letter-spacing:' + o.ls);
      if (st.length) t.setAttribute('style', st.join(';'));
      return t;
    }
    function P(tag, attrs, parent, style) { if (style) attrs.style = style; return sv(tag, attrs, parent); }
    function fade(el, delay, dur) {
      if (still || !el || !el.animate) return;
      try { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur || 380, delay: delay || 0, easing: EASE, fill: 'backwards' }); } catch (e) { /* no motion */ }
    }
    function drawOn(el, len, delay, dur) {
      if (still || !el || !el.animate || !(len > 0)) return;
      var da = len.toFixed(1) + ' ' + len.toFixed(1);
      try { el.animate([{ strokeDasharray: da, strokeDashoffset: len }, { strokeDasharray: da, strokeDashoffset: 0 }], { duration: dur || 480, delay: delay || 0, easing: EASE, fill: 'backwards' }); } catch (e) { /* no motion */ }
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
    function line(parent, x1, y1, x2, y2, style) { return P('line', { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1) }, parent, style); }
    /* an arc of radius r around (x, y) from screen angle a0 to a1 (radians), clockwise when cw */
    function arcD(x, y, r, a0, a1, cw) {
      var sweep = cw ? 1 : 0, span = cw ? a1 - a0 : a0 - a1;
      while (span < 0) span += 2 * Math.PI;
      return 'M' + (x + r * Math.cos(a0)).toFixed(1) + ' ' + (y + r * Math.sin(a0)).toFixed(1) + 'A' + r + ' ' + r + ' 0 ' + (span > Math.PI ? 1 : 0) + ' ' + sweep + ' ' + (x + r * Math.cos(a1)).toFixed(1) + ' ' + (y + r * Math.sin(a1)).toFixed(1);
    }

    /* ---------- type and sizes (stage pixels; the stage CSS sets 12.5 / 11.5 px) ---------- */
    var FS = small ? 11.5 : 12.5, FM = small ? 10.5 : 11.5, FH = small ? 10 : 11, LH = small ? 14 : 16;
    var M = small ? 10 : 16;
    /* the caption overlays the stage bottom on desktop layouts (k >= 1): keep that band free in every phase */
    var band = small ? 8 : 0;
    if (!small) {
      var lines = 1, media = (c.r && c.r.media) || {};
      Object.keys(media).forEach(function (key) {
        if (key.indexOf('@route') !== 0) return;
        lines = Math.max(lines, Math.ceil(textW(plain(media[key]), 12) / Math.max(60, W - 44)));
      });
      band = 10 + 12 + 17.4 * Math.min(lines, 3) + 4;
    }
    var top = M, bottom = H - Math.max(band, M);
    var pw = small ? (tiny ? 66 : 98) : Math.round(clamp(W * 0.3, 140, 176));
    var px0 = W - M - pw, px1 = W - M;
    var mx0 = M, mx1 = px0 - (small ? 10 : 22);
    var lane = small ? 4.5 : 6.5;                  /* leg 1 runs up the stairs, leg 2 comes back down beside them */
    var R = small ? (tiny ? 18 : 22) : Math.round(clamp(W * 0.08, 32, 44));   /* the answer dial at the door, reserved in every phase */
    var BR = small ? 6.5 : 8;                      /* option badge radius */
    var NR = small ? 4 : 5;                        /* waypoint radius */

    /* ---------- the walk ---------- */
    var hd = 0, pts = [[0, 0]], heads = [];
    legs.forEach(function (L) {
      hd += L.turn; heads.push(hd);
      var a = hd * Math.PI / 180, p = pts[pts.length - 1];
      pts.push([p[0] + L.len * Math.sin(a), p[1] + L.len * Math.cos(a)]);
    });
    var net = isNum(d.net) ? d.net : hd;
    var last = legs.length - 1, iDoor = last;               /* the question stands at the start of the last leg */
    var names = [plain(d.from) || 'start'].concat(legs.map(function (L) { return plain(L.to); }));
    if (small && /front door/i.test(names[iDoor])) names[iDoor] = 'door';
    var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    var bw = Math.max(maxx - minx, 1e-6), bh = Math.max(maxy - miny, 1e-6);

    /* room around the drawn walk for its labels and the dial */
    var padT = lane + (small ? 17 : 22), padB = R + (small ? 7 : 10), padL = small ? 4 : 10;
    var padR = 2 * lane + 4, s = 1, aw = 1, ah = 1;
    for (var it = 0; it < 3; it++) {
      aw = (mx1 - padR) - (mx0 + padL); ah = (bottom - padB) - (top + padT);
      s = Math.max(4, Math.min(aw / bw, ah / bh));
      padR = Math.max(2 * lane + 4, R * 0.72 + BR + 2, 11 + textW(names[iDoor], FS, 500) - (maxx - pts[iDoor][0]) * s, tiny ? 2 * lane + 8 + textW('stairs', FS, 500) : 0, small ? R * 0.72 + BR + 3 + textW(names[iDoor], FS, 500) - (maxx - pts[iDoor][0]) * s : 0);
    }
    aw = (mx1 - padR) - (mx0 + padL); ah = (bottom - padB) - (top + padT);
    s = Math.max(4, Math.min(aw / bw, ah / bh));
    var ox = mx0 + padL + (aw - bw * s) / 2, oy = top + padT + (ah - bh * s) / 2;
    var S = pts.map(function (q) { return [ox + (q[0] - minx) * s, oy + (maxy - q[1]) * s]; });

    /* two lanes only when the second turn is a U-turn */
    var uturn = Math.abs(legs[1].turn) >= 150;
    var L1 = uturn ? lane : 0;

    var gMap = sv('g', {}, g), gPan = sv('g', {}, g);
    var dimOp = answer ? ';opacity:.38' : '';
    var TOOL = 'var(--tools)', INK = 'var(--ink)';

    /* ---------- map: north arrow (the dial carries its own N in the answer) ---------- */
    if (!anchors) {
      var nx = mx0 + 5, ny = top + 2, nL = small ? 18 : 24;
      var gN = sv('g', {}, gMap);
      T(gN, nx, ny + 10, 'N', { cls: 'sc-dt-strong', anchor: 'middle', size: FH + 1 });
      line(gN, nx, ny + 16 + nL, nx, ny + 17, 'stroke:var(--muted);stroke-width:1.5;stroke-linecap:round');
      head(gN, nx, ny + 14, -Math.PI / 2, 'var(--muted)', 6);
      if (!tiny) T(gN, nx + 8, ny + 16 + nL - 2, 'upstairs', { cls: 'sc-dt-mono', size: FH });
      if (answer) gN.setAttribute('style', 'opacity:.55');
    }

    /* ---------- map: the staircase (it sets north) ---------- */
    var sx0 = S[0][0], sBot = S[0][1], sTop = S[1][1], stairs = sv('g', {}, gMap);
    if (answer) stairs.setAttribute('style', 'opacity:.45');
    var sw = 2 * lane, sh = Math.max(6, sBot - sTop);
    P('rect', { x: sx0.toFixed(1), y: sTop.toFixed(1), width: sw, height: sh.toFixed(1), rx: 1.5 }, stairs, 'fill:var(--paper);stroke:var(--ink);stroke-width:1.2');
    var tread = small ? 3.6 : 4.5;
    for (var ty = sTop + tread; ty < sBot - 1.5; ty += tread) line(stairs, sx0 + 1, ty, sx0 + sw - 1, ty, 'stroke:var(--muted);stroke-width:.9;opacity:.8');
    if (anchors) {
      /* the plan symbol's arrow: the way up */
      line(stairs, sx0 + lane, sBot - 2, sx0 + lane, sTop + 5, 'stroke:var(--ink);stroke-width:1.4;stroke-linecap:round');
      head(stairs, sx0 + lane, sTop + 3, -Math.PI / 2, 'var(--ink)', 5);
    }
    fade(stairs, 0);

    /* ---------- map: legs and turns ---------- */
    var trim = NR + 3;
    if (!anchors) {
      var gL = sv('g', {}, gMap), t0 = 0;
      /* leg 1, up the stairs */
      var l1 = line(gL, sx0 + L1, sBot - 1, sx0 + L1, sTop + (uturn ? 0 : trim), 'stroke:' + TOOL + ';stroke-width:2.4;stroke-linecap:round' + dimOp);
      drawOn(l1, sBot - sTop, t0, 320);
      P('circle', { cx: sx0 + L1, cy: sBot, r: small ? 3 : 3.6 }, gL, 'fill:' + TOOL + ';stroke:var(--paper);stroke-width:1.5' + dimOp);
      t0 += 320;
      /* the U-turn at the stair top, to the left: leg 2 starts in the left lane */
      var turn2 = legs[1].turn, gT2 = sv('g', {}, gL);
      if (uturn) {
        var u = P('path', { d: 'M' + (sx0 + lane) + ' ' + sTop.toFixed(1) + 'A' + lane + ' ' + lane + ' 0 0 ' + (turn2 < 0 ? 0 : 1) + ' ' + (sx0 - lane) + ' ' + sTop.toFixed(1) }, gT2, 'fill:none;stroke:' + TOOL + ';stroke-width:2.4;stroke-linecap:round' + dimOp);
        drawOn(u, Math.PI * lane, t0, 200);
      }
      var lab2 = T(gT2, sx0, sTop - lane - (small ? 6 : 8), deg(turn2), { cls: 'sc-dt-tool', anchor: 'middle', size: FS });
      if (answer) lab2.setAttribute('style', lab2.getAttribute('style') + ';opacity:.45');
      fade(lab2, t0 + 120);
      t0 += 200;
      /* legs 2..n */
      for (var i = 1; i <= last; i++) {
        var A = i === 1 && uturn ? [sx0 - L1, sTop] : S[i], B = S[i + 1];
        var len = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / len, uy = (B[1] - A[1]) / len;
        var st = i === 1 && uturn ? 0 : trim, fin = i === last && answer;
        var col = fin ? 'var(--ok)' : TOOL;
        var ln = line(gL, A[0] + ux * st, A[1] + uy * st, B[0] - ux * (trim + 3), B[1] - uy * (trim + 3), 'stroke:' + col + ';stroke-width:' + (fin ? 3 : 2.4) + ';stroke-linecap:round' + (fin ? '' : dimOp));
        drawOn(ln, len - st - trim - 3, answer ? (fin ? 250 : 0) : t0, answer ? 520 : 420);
        var hh = head(gL, B[0] - ux * trim, B[1] - uy * trim, Math.atan2(uy, ux), col, small ? 7 : 8.5);
        if (!fin && answer) hh.setAttribute('style', hh.getAttribute('style') + ';opacity:.38');
        fade(hh, answer ? (fin ? 700 : 0) : t0 + 360, 200);
        if (!answer) t0 += 420;
        /* the turn at the start of the next leg: an arc from straight ahead to the new heading */
        if (i < last && !answer) {
          var Pn = S[i + 1], tn = legs[i + 1].turn, rt = small ? 11 : 16;
          var aIn = scr(heads[i]), aOut = scr(heads[i + 1]);
          var gT = sv('g', {}, gL);
          line(gT, Pn[0] + Math.cos(aIn) * (NR + 2), Pn[1] + Math.sin(aIn) * (NR + 2), Pn[0] + Math.cos(aIn) * (rt + 5), Pn[1] + Math.sin(aIn) * (rt + 5), 'stroke:var(--faint);stroke-width:1.2;stroke-dasharray:2 3');
          var arc = P('path', { d: arcD(Pn[0], Pn[1], rt, aIn, aOut, tn > 0) }, gT, 'fill:none;stroke:' + TOOL + ';stroke-width:1.6');
          drawOn(arc, rt * Math.abs(tn) * Math.PI / 180, t0, 240);
          head(gT, Pn[0] + rt * Math.cos(aOut), Pn[1] + rt * Math.sin(aOut), aOut + (tn > 0 ? Math.PI / 2 : -Math.PI / 2), TOOL, small ? 5.5 : 6.5);
          var am = aIn + (tn > 0 ? 1 : -1) * Math.abs(tn) * Math.PI / 360, cr = Math.cos(am);
          T(gT, Pn[0] + (rt + 6) * cr, Pn[1] + (rt + 6) * Math.sin(am) + FS * 0.36, deg(tn), { cls: 'sc-dt-tool', anchor: cr < -0.3 ? 'end' : cr > 0.3 ? 'start' : 'middle', size: FS });
          fade(gT, t0 + 80);
          t0 += 240;
        }
      }
    }

    /* ---------- map: waypoints and names ---------- */
    var gW = sv('g', {}, gMap);
    function node(p, delay, strong) {
      var n = P('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: NR }, gW, 'fill:var(--paper);stroke:' + (strong ? 'var(--ink)' : 'var(--muted)') + ';stroke-width:1.5');
      fade(n, delay, 260);
      return n;
    }
    function name(x, y, str, anchor, delay, dim) {
      var t = T(gW, x, y, str, { cls: 'sc-dt-strong', anchor: anchor, size: FS });
      if (dim) t.setAttribute('style', t.getAttribute('style') + ';opacity:.5');
      fade(t, delay, 300);
      return t;
    }
    /* stair ends: labels on the far side of leg 2's lane */
    var stairX = sx0 - L1 - (uturn ? 7 : 10);
    if (tiny) name(sx0 + sw + 5, (sTop + sBot) / 2 + FS * 0.36, 'stairs', 'start', 60, answer);   /* no room for two names */
    else {
      name(stairX, sBot + FS * 0.36, names[0], 'end', 60, answer);
      name(stairX, sTop + FS * 0.36, names[1], 'end', 120, answer);
    }
    if (!uturn) { node(S[0], 0, false); node(S[1], 80, false); }
    for (var w = 2; w < S.length; w++) {
      var isDoor = w === iDoor, isEnd = w === S.length - 1;
      node(S[w], 160 + w * 80, isDoor || isEnd);
      if (isDoor) name(S[w][0] + (answer && small ? R * 0.72 + BR + 3 : NR + 6), S[w][1] + FS * 0.36, names[w], 'start', 200 + w * 80, false);
      else if (isEnd) name(S[w][0] - NR - 2, S[w][1] - NR - 7, names[w], 'start', 200 + w * 80, false);
      else name(S[w][0] + NR + 6, S[w][1] + FS * 0.36, names[w], 'start', 200 + w * 80, answer);
    }

    /* ---------- map: the answer dial at the door ---------- */
    if (answer) {
      var D0 = S[iDoor], dx = D0[0], dy = D0[1];
      var gD = sv('g', {}, gMap);
      g.insertBefore(gD, gMap.nextSibling);
      P('circle', { cx: dx.toFixed(1), cy: dy.toFixed(1), r: R }, gD, 'fill:none;stroke:var(--faint);stroke-width:1.1;stroke-dasharray:2 4');
      line(gD, dx, dy - R, dx, dy + R, 'stroke:var(--faint);stroke-width:1;opacity:.7');
      line(gD, dx - R, dy, dx + R, dy, 'stroke:var(--faint);stroke-width:1;opacity:.7');
      T(gD, dx - 5, dy - R - 4, 'N', { cls: 'sc-dt-strong', anchor: 'end', size: FH });
      /* the net heading, measured from north */
      var aN = scr(0), aNet = scr(net), rh = R * 0.56;
      var hArc = P('path', { d: arcD(dx, dy, rh, aN, aNet, net > 0) }, gD, 'fill:none;stroke:var(--ok);stroke-width:1.6');
      drawOn(hArc, rh * Math.abs(net) * Math.PI / 180, 500, 300);
      /* the four options, placed by their names */
      var opts = (c.r && Array.isArray(c.r.options) ? c.r.options : []).map(function (o) {
        var h = DIRS[plain(o[1]).toLowerCase().replace(/[^a-z]/g, '')];
        return isNum(h) ? { L: plain(o[0]), h: h, word: plain(o[1]).toLowerCase() } : null;
      }).filter(Boolean);
      var truth = plain(d.truth), base = plain(d.base), baseO = null, truthO = null;
      opts.forEach(function (o) { if (o.L === base) baseO = o; if (o.L === truth) truthO = o; });
      if (baseO) {
        var ab = scr(baseO.h), ext = R + (small ? 12 : 18);
        var ray = line(gD, dx + Math.cos(ab) * (NR + 2), dy + Math.sin(ab) * (NR + 2), dx + Math.cos(ab) * ext, dy + Math.sin(ab) * ext, 'stroke:var(--bad);stroke-width:2;stroke-dasharray:4 4;stroke-linecap:round');
        drawOn(ray, ext, 650, 300);
        var hb = head(gD, dx + Math.cos(ab) * (ext + 2), dy + Math.sin(ab) * (ext + 2), ab, 'var(--bad)', small ? 6.5 : 7.5);
        fade(hb, 900, 200);
        var who = small ? 'alone' : 'Sol alone';
        var bl = T(gD, dx + Math.cos(ab) * ext - 8, dy + Math.sin(ab) * ext + FS * 0.36 + 4, base + ' · ' + who, { cls: 'sc-dt-bad', anchor: 'end', size: FS });
        fade(bl, 900);
      }
      opts.forEach(function (o, n) {
        var a = scr(o.h), bx = dx + Math.cos(a) * R, by = dy + Math.sin(a) * R;
        var isT = o.L === truth, isB = o.L === base, bg = sv('g', {}, gD);
        P('circle', { cx: bx.toFixed(1), cy: by.toFixed(1), r: BR }, bg,
          isT ? 'fill:var(--ok);stroke:var(--ok);stroke-width:1.5' : isB ? 'fill:var(--paper);stroke:var(--bad);stroke-width:1.4;stroke-dasharray:2.5 2' : 'fill:var(--paper);stroke:var(--faint);stroke-width:1.1');
        T(bg, bx, by + FH * 0.36, o.L, { anchor: 'middle', size: FH, weight: 500, fill: isT ? 'var(--paper)' : isB ? 'var(--bad)' : 'var(--muted)' }).setAttribute('style', 'font-size:' + FH + 'px;font-weight:500;stroke:none;fill:' + (isT ? 'var(--paper)' : isB ? 'var(--bad)' : 'var(--muted)'));
        fade(bg, 300 + n * 60, 260);
      });
      /* the answer, beside the last leg (outside the turn) */
      if (truthO) {
        var E = S[last + 1], mx = (D0[0] + E[0]) / 2, my = (D0[1] + E[1]) / 2;
        var vx = E[0] - D0[0], vy = E[1] - D0[1], vl = Math.hypot(vx, vy) || 1, nx2 = -vy / vl, ny2 = vx / vl;
        if (nx2 > 0) { nx2 = -nx2; ny2 = -ny2; }                     /* the side away from the door's turn arc */
        var gTxt = truth + ' · ' + truthO.word, gTw = textW(gTxt, FS + 0.5, 500), gG = small ? 10 : 11;
        var gx = mx + nx2 * 12, gy = my + ny2 * 12 + FS * 0.5;
        gx = Math.max(gx, 6 + gG + 4 + gTw);                         /* the check mark and the words stay on the stage */
        var gA = sv('g', {}, gD);
        T(gA, gx, gy, gTxt, { cls: 'sc-dt-ok', anchor: 'end', size: FS + 0.5 });
        glyph(gA, 'ok', gx - gTw - 4 - gG / 2, gy - FS * 0.36, gG);
        fade(gA, 800);
      }
    }

    /* ---------- the panel ---------- */
    var y = top + (small ? 4 : 8);
    var cap = function (str) { var t = T(gPan, px0, y, str, { mono: true, size: FH, ls: '.06em', fill: 'var(--faint)' }); y += LH + (small ? 2 : 4); return t; };
    if (anchors) {
      cap(tiny ? 'FRAME' : 'QUESTION FRAME');
      var rc = small ? (tiny ? 21 : 28) : 38, ccx = px0 + pw / 2, ccy = y + rc + (small ? 10 : 14);
      var gC = sv('g', {}, gPan);
      P('circle', { cx: ccx, cy: ccy.toFixed(1), r: rc }, gC, 'fill:var(--paper);stroke:var(--rule);stroke-width:1.2');
      [0, 90, 180, 270].forEach(function (h) {
        var a = scr(h);
        line(gC, ccx + Math.cos(a) * (rc - 5), ccy + Math.sin(a) * (rc - 5), ccx + Math.cos(a) * rc, ccy + Math.sin(a) * rc, 'stroke:var(--muted);stroke-width:1.2');
        if (h && !tiny) T(gC, ccx + Math.cos(a) * (rc + 8), ccy + Math.sin(a) * (rc + 8) + FH * 0.36, h === 90 ? 'E' : h === 180 ? 'S' : 'W', { anchor: 'middle', mono: true, size: FH, fill: 'var(--faint)' });
      });
      T(gC, ccx, ccy - rc - 5, 'N', { cls: 'sc-dt-strong', anchor: 'middle', size: FS });
      /* the needle is a staircase: north is the way up */
      var nw = small ? 6 : 8, nt = ccy - rc + 7, nb = ccy + rc * 0.42;
      P('rect', { x: (ccx - nw / 2).toFixed(1), y: (nt + 5).toFixed(1), width: nw, height: (nb - nt - 5).toFixed(1), rx: 1 }, gC, 'fill:var(--paper);stroke:var(--ink);stroke-width:1.1');
      for (var q = nt + 5 + (small ? 3.4 : 4.2); q < nb - 1; q += small ? 3.4 : 4.2) line(gC, ccx - nw / 2 + 1, q, ccx + nw / 2 - 1, q, 'stroke:var(--muted);stroke-width:.8');
      head(gC, ccx, nt, -Math.PI / 2, 'var(--ink)', small ? 6 : 7.5);
      fade(gC, 150);
      y = ccy + rc + (tiny ? 16 : small ? 27 : 31);
      if (tiny) { name(ccx, y, 'north =', 'middle', 300, false); name(ccx, y + LH, 'upstairs', 'middle', 300, false); }
      else {
        name(ccx, y, 'north = upstairs', 'middle', 300, false);
        var sub = T(gPan, ccx, y + LH + 1, 'set by the question', { anchor: 'middle', size: FS - 0.5 });
        fade(sub, 380);
      }
    } else {
      cap(tiny ? 'TURNS' : 'TURN_SEQUENCE');
      if (!tiny) {
        var from = 'from the ' + names[0] + ',', w1 = textW(from + ' facing up', FS - 0.5);
        if (w1 <= pw) { T(gPan, px0, y - 2, from + ' facing up', { size: FS - 0.5 }); y += LH + 2; }
        else { T(gPan, px0, y - 2, small ? 'from ' + names[0] + ',' : from, { size: FS - 0.5 }); T(gPan, px0, y - 2 + LH, 'facing up', { size: FS - 0.5 }); y += 2 * LH + 2; }
      }
      y += small ? 4 : 8;
      var rowH = small ? 18 : 23, bR = small ? 6.5 : 8, valX = px1;
      var valW = Math.max.apply(null, legs.map(function (L) { return textW(deg(L.turn), FM + 0.5, 500, true); }));
      var t1r = 0;
      legs.forEach(function (L, n) {
        var row = sv('g', {}, gPan), ry = y + n * rowH;
        if (answer) row.setAttribute('style', 'opacity:.62');
        P('circle', { cx: px0 + bR, cy: (ry - FS * 0.36).toFixed(1), r: bR }, row, 'fill:' + TOOL + ';stroke:none');
        T(row, px0 + bR, ry, String(n + 1), { anchor: 'middle', size: FH, weight: 500, fill: 'var(--paper)' }).setAttribute('style', 'font-size:' + FH + 'px;font-weight:500;fill:var(--paper);stroke:none');
        if (!tiny) T(row, px0 + 2 * bR + 7, ry, plain(L.word), { size: FS, fill: INK });
        T(row, valX, ry, deg(L.turn), { anchor: 'end', mono: true, size: FM + 0.5, weight: 500, fill: TOOL });
        fade(row, answer ? 0 : t1r, 260);
        t1r += n === 0 ? 320 : 660;
      });
      y += (legs.length - 1) * rowH;
      if (answer) {
        /* the column sum */
        var sy = y + (small ? 9 : 11);
        line(gPan, valX - valW - 6, sy, valX, sy, 'stroke:var(--ink);stroke-width:1.2');
        var big = small ? 15 : 19, ny3 = sy + big + (small ? 4 : 6);
        var gS = sv('g', {}, gPan);
        T(gS, valX, ny3, deg(net), { anchor: 'end', mono: true, size: big, weight: 500, fill: 'var(--ok)' });
        if (!tiny) T(gS, px0, ny3 - 1, 'heading', { size: FS, fill: 'var(--muted)' });
        fade(gS, 420);
        if (!tiny) {
          var n2 = T(gPan, valX, ny3 + LH + 3, Math.abs(Math.round(net)) + '° ' + (net < 0 ? 'left' : 'right') + ' of north', { anchor: 'end', size: FS - 0.5 });
          fade(n2, 520);
        }
      }
    }
  }
})();
