/* '@walls' · mc_train "Four walls, one rule", decided by an evolved Lessons skill rule (0 tool calls).
   rule    top view of the room: the train in the centre, cameras 1-4 (front, left, back, right) on a circle
           around it, each looking across the train at the opposite wall. Every wall carries its option letter,
           its name and a thumbnail of the photo whose background it is (cropped to the top of the photo, where
           the background is), badged with that photo's view number.
   apply   the rule alone: the arc k-1 from camera 1 to camera 4 and camera 4's line of sight, the other cameras dimmed.
   answer  the same picture plus the rule as geometry: the skills-coloured arc "k-1: 1 -> 4 (wrap-around)" from
           camera 1 to camera 4, camera 4's line of sight through the train, and camera 1's left landing on that
           same wall: C, checked in green. The other walls carry red ghost tags of who picked them (spec.picks).
   Everything printed comes from spec (runs.js): views[].{n, side, bg, opt, img}, ask.{view, side}, mapped, truth,
   picks[].{opt, who}. Derived only: which wall each camera faces (from `side`), camera 1's left (a quarter turn of
   its gaze) and the step k-1 around the four views. */
(function () {
  'use strict';
  var SWD = window.SWD = window.SWD || {};
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  var uid = 0, meter = null;

  var CAM = { front: 'S', left: 'W', back: 'N', right: 'E' };          /* where each camera stands */
  var VEC = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
  var OPP = { N: 'S', S: 'N', W: 'E', E: 'W' };
  var ORDER = ['S', 'W', 'N', 'E'];

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
  function plain(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' '); }
  function sideOf(v) { for (var s in VEC) if (VEC[s][0] === v[0] && VEC[s][1] === v[1]) return s; return null; }

  SWD.walls = function (g, spec, ctx) {
    try { draw(g, spec || {}, ctx || {}); }
    catch (e) { if (window.console) console.warn('diagram walls', e); }
  };

  function draw(g, d, c) {
    var W = c.W, H = c.H, k = c.k || 1, sv = c.sv;
    if (!(W > 0 && H > 0) || typeof sv !== 'function' || typeof c.text !== 'function') return;
    var answer = c.phase === 'answer' || (!c.phase && !!c.answer);
    var apply = c.phase === 'apply', geo = answer || apply;       /* apply: the rule drawn, the answer not yet shown */
    var still = !!c.still, small = k < 1;

    /* ---------- data ---------- */
    var views = (Array.isArray(d.views) ? d.views : []).filter(function (v) { return v && typeof v === 'object'; });
    if (views.length !== 4) return;
    var camAt = {}, wallAt = {};
    views.forEach(function (v, i) {
      var s = CAM[v.side] || ORDER[i];
      v = { n: isNum(v.n) ? v.n : i + 1, bg: plain(v.bg), opt: plain(v.opt), img: v.img ? String(v.img) : '', cam: s, wall: OPP[s] };
      camAt[s] = v; wallAt[v.wall] = v;
    });
    if (ORDER.some(function (s) { return !camAt[s] || !wallAt[s]; })) return;
    var byN = function (n) { for (var s in camAt) if (camAt[s].n === n) return camAt[s]; return null; };
    var ask = d.ask || {};
    var askV = byN(ask.view) || camAt.S;
    var askSide = ask.side === 'right' ? 'right' : 'left';
    var f = VEC[OPP[askV.cam]];                                           /* camera ask.view looks across the train */
    var ansSide = sideOf(askSide === 'left' ? [f[1], -f[0]] : [-f[1], f[0]]);   /* a quarter turn of that gaze */
    var mapV = byN(d.mapped) || wallAt[ansSide];
    var truthL = plain(d.truth) || wallAt[ansSide].opt;
    var picks = {};
    (Array.isArray(d.picks) ? d.picks : []).forEach(function (p) { if (p && p.opt) picks[plain(p.opt)] = plain(p.who); });
    var stepN = askSide === 'left' ? -1 : 1, raw = askV.n + stepN, wrap = raw < 1 || raw > views.length;
    var ruleTxt = 'k' + (stepN < 0 ? '−' : '+') + '1: ' + askV.n + ' → ' + mapV.n;
    var hasBadge = c.r && Array.isArray(c.r.steps) && c.r.steps.some(function (s) { return s && s.badge; });

    /* ---------- type and sizes (stage pixels; the stage CSS sets 12.5 / 11.5 px) ---------- */
    var FS = small ? 11.5 : 12.5, FG = small ? 10.5 : 11.5, FB = small ? 10 : 11, FR = small ? 11 : 12.5;
    var LH = small ? 13 : 15;
    var M = small ? 6 : 10, gapW = small ? 5 : 8;
    var tw = Math.round(clamp(40 * k, 30, 54)), th = Math.round(tw * 0.75);
    var LR = small ? 7 : 8.5, BR = small ? 7 : 8;
    var tiny = W < 300;

    /* the caption overlays the stage bottom on desktop layouts (k >= 1): keep that band free in both phases */
    var band = 0;
    if (!small) {
      var lines = 1, media = (c.r && c.r.media) || {};
      Object.keys(media).forEach(function (key) {
        if (key.indexOf('@walls') !== 0) return;
        lines = Math.max(lines, Math.ceil(textW(plain(media[key]), 12) / Math.max(60, W - 44)));
      });
      band = 10 + 12 + 17.4 * Math.min(lines, 3) + 4;
    }

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
      if (o.ls) st.push('letter-spacing:' + o.ls);
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
    /* the site's check and cross glyphs (12-unit box), centred at (x, y), s px wide */
    function glyph(parent, kind, x, y, s) {
      var q = s / 12, x0 = x - s / 2, y0 = y - s / 2, Q = function (a, b) { return (x0 + a * q).toFixed(2) + ' ' + (y0 + b * q).toFixed(2); };
      var dd = kind === 'ok' ? 'M' + Q(2.2, 6.4) + 'L' + Q(4.8, 9) + 'L' + Q(9.8, 3.4) : 'M' + Q(3, 3) + 'L' + Q(9, 9) + 'M' + Q(9, 3) + 'L' + Q(3, 9);
      return P('path', { d: dd }, parent, 'fill:none;stroke:var(' + (kind === 'ok' ? '--ok' : '--bad') + ');stroke-width:' + (small ? 1.7 : 1.9) + ';stroke-linecap:round;stroke-linejoin:round');
    }
    /* the view a thumbnail comes from: a square tag in its lower-left corner (camera numbers are round) */
    function photoTag(parent, x, y, n, hot) {
      var lab = (tw >= 46 ? 'view ' : 'v') + n, fs = small ? 9.5 : 10.5, w = textW(lab, fs, 500) + 8, h = fs + 5;
      var t = sv('g', {}, parent);
      P('rect', { x: x + 2, y: y - h - 2, width: w, height: h, rx: 2.5 }, t, 'fill:' + (hot ? 'var(--skills)' : 'var(--ink)') + ';opacity:.82;stroke:none');
      T(t, x + 2 + w / 2, y - 2 - h / 2 + fs * 0.36, lab, { anchor: 'middle', size: fs, weight: 500, fill: 'var(--paper)', halo: 'none' });
      return t;
    }
    function bead(parent, x, y, n, style) {
      var b = sv('g', {}, parent);
      var fill = style === 'ink' ? 'var(--ink)' : 'var(--paper)';
      var stroke = style === 'ink' ? 'var(--ink)' : style === 'skill' ? 'var(--skills)' : 'var(--muted)';
      var tx = style === 'ink' ? 'var(--paper)' : style === 'skill' ? 'var(--skills)' : 'var(--ink)';
      P('circle', { cx: x, cy: y, r: BR }, b, 'fill:' + fill + ';stroke:' + stroke + ';stroke-width:' + (style ? 1.6 : 1.2));
      T(b, x, y + FB * 0.36, String(n), { anchor: 'middle', size: FB, mono: true, weight: 500, fill: tx, halo: 'none' });
      return b;
    }

    /* ---------- layout ---------- */
    var nameW = function (v) { return 2 * LR + 5 + textW(v.bg, FS, 500); };
    var ghostBudget = small ? 0 : 104;
    var sideNeed = M + gapW + Math.max(tw, nameW(wallAt.W), nameW(wallAt.E), ghostBudget);
    var yMin = M + th + gapW, yMax = H - band - M - th - gapW;
    var S = Math.floor(Math.min(W - 2 * sideNeed, yMax - yMin));
    if (!(S > 60)) return;
    var cx = Math.round(W / 2), cy = Math.round((yMin + yMax) / 2);
    var L = cx - S / 2, R = cx + S / 2, Tp = cy - S / 2, B = cy + S / 2;
    var rc = S / 2 * 0.56;                                   /* the cameras' circle */
    var beadOff = small ? 15 : 19;
    var trW = small ? 20 : 26, trH = small ? 10 : 12;
    var wallEnd = { N: [cx, Tp], S: [cx, B], W: [L, cy], E: [R, cy] };
    var camPos = function (s) { return [cx + VEC[s][0] * rc, cy + VEC[s][1] * rc]; };

    var root = sv('g', { 'data-sw-walls': answer ? 'answer' : apply ? 'apply' : 'rule' }, g);
    var base = sv('g', {}, root), marks = sv('g', {}, root), labs = sv('g', {}, root), top = sv('g', {}, root);

    /* room floor and the cameras' circle */
    P('rect', { x: L, y: Tp, width: S, height: S, rx: 2 }, base, 'fill:var(--paper);stroke:none');
    P('circle', { cx: cx, cy: cy, r: rc, class: 'sc-dfaint' }, base);

    /* lines of sight: each camera across the train to the opposite wall */
    ORDER.forEach(function (s, i) {
      var p = camPos(s), e = wallEnd[OPP[s]], dim = geo && s !== askV.cam && s !== mapV.cam;
      var ln = P('line', { x1: p[0], y1: p[1], x2: e[0] - VEC[OPP[s]][0] * 3, y2: e[1] - VEC[OPP[s]][1] * 3 }, base,
        'stroke:var(--faint);stroke-width:1.1;stroke-dasharray:2 3.5;opacity:' + (dim ? 0.45 : 0.9));
      if (!geo) drawOn(ln, Math.hypot(e[0] - p[0], e[1] - p[1]), 120 + i * 90, 520);
      var a = Math.atan2(VEC[OPP[s]][1], VEC[OPP[s]][0]);
      var hd = head(base, e[0] - VEC[OPP[s]][0] * 2.5, e[1] - VEC[OPP[s]][1] * 2.5, a, 'var(--faint)', small ? 6 : 7);
      if (dim) hd.style.opacity = 0.45;
    });

    /* walls */
    var wallLine = {};
    [['N', L, Tp, R, Tp], ['E', R, Tp, R, B], ['S', R, B, L, B], ['W', L, B, L, Tp]].forEach(function (w) {
      wallLine[w[0]] = P('line', { x1: w[1], y1: w[2], x2: w[3], y2: w[4] }, base, 'stroke:var(--muted);stroke-width:1.6;stroke-linecap:square');
    });

    /* the train */
    P('rect', { x: cx - trW / 2, y: cy - trH / 2, width: trW, height: trH, rx: trH / 2.6 }, top, 'fill:var(--paper);stroke:var(--ink);stroke-width:1.5');
    T(top, cx - trW / 2 - 4, cy - trH / 2 - 5, 'train', { anchor: 'end', size: small ? 10.5 : 11.5 });

    /* cameras and their numbers */
    ORDER.forEach(function (s) {
      var p = camPos(s), v = camAt[s], face = Math.atan2(-VEC[s][1], -VEC[s][0]);
      var cg = sv('g', {}, top);
      if (geo && s !== askV.cam && s !== mapV.cam) cg.setAttribute('class', 'sc-dim');
      c.camGlyph(cg, p[0], p[1], face, Math.max(20, rc * 0.52));
      var bp = [cx + VEC[s][0] * (rc + beadOff), cy + VEC[s][1] * (rc + beadOff)];
      bead(cg, bp[0], bp[1], v.n, geo ? (s === askV.cam ? 'ink' : s === mapV.cam ? 'skill' : '') : '');
    });

    /* walls' thumbnails and names */
    var thumbAt = {
      N: [cx - tw / 2, Tp - gapW - th], S: [cx - tw / 2, B + gapW],
      W: [L - gapW - tw, cy - th / 2], E: [R + gapW, cy - th / 2]
    };
    var dir = c.dir == null ? '' : String(c.dir);
    ORDER.forEach(function (s, i) {
      var v = wallAt[s], p = thumbAt[s];
      var tg = sv('g', {}, labs);
      var id = 'swd-walls-' + (++uid) + '-' + Math.random().toString(36).slice(2, 7);
      var cp = sv('clipPath', { id: id }, tg);
      sv('rect', { x: p[0], y: p[1], width: tw, height: th, rx: 4 }, cp);
      P('rect', { x: p[0], y: p[1], width: tw, height: th, rx: 4 }, tg, 'fill:var(--surface);stroke:none');
      if (v.img) sv('image', { href: dir + 't_' + v.img, x: p[0], y: p[1], width: tw, height: th, preserveAspectRatio: 'xMidYMin slice', 'clip-path': 'url(#' + id + ')' }, tg);
      var isTruth = answer && v.opt === truthL;
      P('rect', { x: p[0] - 0.5, y: p[1] - 0.5, width: tw + 1, height: th + 1, rx: 4.5 }, tg,
        'fill:none;stroke:' + (isTruth ? 'var(--ok)' : 'var(--rule)') + ';stroke-width:' + (isTruth ? 2 : 1));
      photoTag(tg, p[0], p[1] + th, v.n, geo && v.n === mapV.n);
      if (!geo) fade(tg, 80 + i * 70, 460);

      /* option letter + name: beside the thumbnail on the top and bottom walls, above it on the side walls */
      var lx, ly, anchorMid = s === 'W' || s === 'E';
      var nw = nameW(v);
      if (anchorMid) { lx = p[0] + tw / 2 - nw / 2; ly = p[1] - 7; }
      else {
        lx = p[0] + tw + 9; ly = p[1] + (small ? 10 : 12);
        /* no room right of the thumbnail (narrow stages): the letter and name go to its left */
        if (lx + nw + (isTruth ? 16 : 0) > W - M) {
          /* still too long there: keep the last two words of the name ("glass door") */
          if (p[0] - 9 - nw - (isTruth ? 16 : 0) < M && v.bg.split(' ').length > 2) { v = Object.create(v); v.bg = v.bg.split(' ').slice(-2).join(' '); nw = nameW(v); }
          lx = Math.max(M, p[0] - 9 - nw - (isTruth ? 16 : 0));
        }
      }
      if (s === 'W') lx = Math.max(M, Math.min(lx, L - gapW - nw));
      if (s === 'E') lx = Math.min(W - M - nw, Math.max(lx, R + gapW));
      var lg = sv('g', {}, labs);
      var ccx = lx + LR, ccy = ly - FS * 0.35;
      var wrong = answer && v.opt !== truthL;
      var circ = P('circle', { cx: ccx, cy: ccy, r: LR }, lg,
        isTruth ? 'fill:var(--ok);stroke:var(--ok);stroke-width:1.2'
          : wrong ? 'fill:var(--paper);stroke:var(--bad);stroke-width:1.2;stroke-dasharray:2.4 2'
            : 'fill:var(--paper);stroke:var(--faint);stroke-width:1.1');
      T(lg, ccx, ccy + FB * 0.36, v.opt, { anchor: 'middle', size: FB, weight: 500, fill: isTruth ? 'var(--paper)' : wrong ? 'var(--bad)' : 'var(--muted)', halo: 'none' });
      T(lg, lx + 2 * LR + 5, ly, v.bg, { cls: isTruth ? 'sc-dt-ok' : 'sc-dt-strong', size: FS });
      if (isTruth) { var ck = glyph(lg, 'ok', lx + nw + 10, ccy, small ? 11 : 13); fade(ck, 700, 420); }
      if (!geo) fade(lg, 140 + i * 70, 460);

      /* who picked a wrong wall: a red ghost tag */
      if (wrong && picks[v.opt] != null && !small) {
        var gg = sv('g', {}, labs);
        var who = picks[v.opt];
        var avail = s === 'E' ? Math.max(ghostBudget, W - M - (R + gapW)) - 16 : (cx - tw / 2 - 10 - (hasBadge ? 150 : M)) - 16;
        var words = who.split(/\s+/), out = [], cur = '';
        words.forEach(function (wd) { var t2 = cur ? cur + ' ' + wd : wd; if (cur && textW(t2, FG) > avail) { out.push(cur); cur = wd; } else cur = t2; });
        if (cur) out.push(cur);
        var gx, gy;
        if (s === 'E') { gx = R + gapW + 14; gy = p[1] + th + LH; }
        else { gx = cx - tw / 2 - 10; gy = p[1] + (small ? 10 : 12); }
        out.forEach(function (ln, j) {
          T(gg, gx, gy + j * LH, ln, { cls: 'sc-dt-bad', size: FG, weight: 400, anchor: s === 'E' ? 'start' : 'end' });
        });
        var gw = Math.max.apply(null, out.map(function (ln) { return textW(ln, FG); }));
        var gxx = s === 'E' ? gx - 8 : gx - (textW(out[0], FG)) - 8;
        glyph(gg, 'bad', gxx, gy - FG * 0.35, small ? 9 : 10);
        fade(gg, 820, 460);
      }
    });

    if (!geo) return;

    /* ---------- apply and answer: the rule as geometry (the answer adds camera 1's left onto the wall) ---------- */
    var A = camPos(askV.cam), Mp = camPos(mapV.cam);
    /* camera 1's line of sight up to the train (ink), then its left (green) onto the answer wall */
    var fv = VEC[OPP[askV.cam]];
    var g1 = P('line', { x1: A[0] + fv[0] * 12, y1: A[1] + fv[1] * 12, x2: cx - fv[0] * (trH / 2 + 4), y2: cy - fv[1] * (trH / 2 + 4) }, marks, 'stroke:var(--ink);stroke-width:1.6;stroke-linecap:round');
    fade(g1, 0, 400);
    /* camera 4's line of sight to the train (skills) */
    var mv = VEC[OPP[mapV.cam]];
    var g4 = P('line', { x1: Mp[0] + mv[0] * 12, y1: Mp[1] + mv[1] * 12, x2: cx - mv[0] * (trW / 2 + 4), y2: cy - mv[1] * (trW / 2 + 4) }, marks, 'stroke:var(--skills);stroke-width:2.2;stroke-linecap:round');
    drawOn(g4, Math.hypot(Mp[0] - cx, Mp[1] - cy), 380, 420);
    /* the answer: left of the train, from view 1 */
    var av = VEC[ansSide], we = wallEnd[ansSide];
    if (answer) {
    var gs = [cx + av[0] * (trW / 2 + 4), cy + av[1] * (trW / 2 + 4)], ge = [we[0] - av[0] * 4, we[1] - av[1] * 4];
    var gl = P('line', { x1: gs[0], y1: gs[1], x2: ge[0], y2: ge[1], class: 'sc-dok' }, marks);
    drawOn(gl, Math.hypot(ge[0] - gs[0], ge[1] - gs[1]), 600, 460);
    var gh = head(marks, ge[0], ge[1], Math.atan2(av[1], av[0]), 'var(--ok)', 9); fade(gh, 900, 300);
    /* the answer wall */
    var wl = wallLine[ansSide];
    var aw = P('line', { x1: wl.getAttribute('x1'), y1: wl.getAttribute('y1'), x2: wl.getAttribute('x2'), y2: wl.getAttribute('y2') }, marks, 'stroke:var(--ok);stroke-width:3;stroke-linecap:round');
    fade(aw, 850, 420);
    /* "left" on the green arrow */
    var lm = [(gs[0] + ge[0]) / 2, (gs[1] + ge[1]) / 2];
    /* kept inside the room, so it never runs into the wall's own label outside */
    var lTxt = askSide + ' of view ' + askV.n, lFs = small ? 10.5 : 11.5, lW = textW(lTxt, lFs, 500);
    var lx0 = ansSide === 'W' ? Math.max(lm[0], L + lW / 2 + 6) : ansSide === 'E' ? Math.min(lm[0], R - lW / 2 - 6) : lm[0];
    /* pushed against the wall it would sit level with the wall's own label: lift it a line */
    var lifted = ansSide === 'W' ? (lx0 - lW / 2) - L < 24 : ansSide === 'E' ? R - (lx0 + lW / 2) < 24 : false;
    if (!tiny) T(marks, lx0, lm[1] - (lifted ? (small ? 32 : 38) : (small ? 19 : 25)), lTxt, { cls: 'sc-dt-ok', size: lFs, anchor: 'middle', weight: 500 });
    }

    /* the arc k-1 around the cameras' circle, from camera ask.view to camera mapped */
    var a0 = Math.atan2(A[1] - cy, A[0] - cx), a1 = Math.atan2(Mp[1] - cy, Mp[0] - cx);
    var dA = a1 - a0; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA <= -Math.PI) dA += 2 * Math.PI;
    var trim = 16 / rc, s0 = a0 + Math.sign(dA) * trim, s1 = a1 - Math.sign(dA) * trim;
    var rA = rc;
    var p0 = [cx + rA * Math.cos(s0), cy + rA * Math.sin(s0)], p1 = [cx + rA * Math.cos(s1), cy + rA * Math.sin(s1)];
    var arc = P('path', { d: 'M' + p0[0] + ' ' + p0[1] + 'A' + rA + ' ' + rA + ' 0 0 ' + (dA > 0 ? 1 : 0) + ' ' + p1[0] + ' ' + p1[1] }, marks, 'fill:none;stroke:var(--skills);stroke-width:2.4;stroke-linecap:round');
    drawOn(arc, Math.abs(s1 - s0) * rA, 0, 560);
    var tang = s1 + (dA > 0 ? Math.PI / 2 : -Math.PI / 2);
    var ah = head(marks, p1[0] + Math.cos(tang) * 2, p1[1] + Math.sin(tang) * 2, tang, 'var(--skills)', 9); fade(ah, 480, 260);
    /* its label, outside the arc's middle */
    var am = (s0 + s1) / 2, lr = rA + (small ? 12 : 16);
    var lp = [cx + lr * Math.cos(am), cy + lr * Math.sin(am)];
    var rl = sv('g', {}, marks);
    T(rl, lp[0], lp[1], ruleTxt, { size: FR, mono: true, weight: 500, fill: 'var(--skills)' });
    if (wrap && !tiny) T(rl, lp[0], lp[1] + LH, '(wrap-around)', { size: small ? 10.5 : 11.5, fill: 'var(--skills)' });
    fade(rl, 300, 420);
  }
})();
