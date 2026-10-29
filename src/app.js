(function () {
  'use strict';

  /* ================= data & helpers ================= */
  var D = window.HF;
  var FL = D.flags;
  var BY = {};
  FL.forEach(function (f, i) { BY[f.c] = f; f.i = i; });
  var ORDER = FL.map(function (f) { return f.c; });
  var REG = [['all', 'World'], ['af', 'Africa'], ['as', 'Asia'], ['eu', 'Europe'], ['na', 'North America'], ['sa', 'South America'], ['oc', 'Oceania']];
  var REGN = {}; REG.forEach(function (r) { REGN[r[0]] = r[1]; });
  var COLORS = [['red', 'Red', '#d52b1e'], ['orange', 'Orange', '#f08a24'], ['yellow', 'Yellow', '#fcd116'], ['green', 'Green', '#1e9e4a'], ['blue', 'Blue', '#2157b8'], ['white', 'White', '#ffffff'], ['black', 'Black', '#111111']];
  var COLHEX = {}; COLORS.forEach(function (c) { COLHEX[c[0]] = c[2]; });
  var LAYOUT = [['hstripes', 'Horizontal stripes'], ['vstripes', 'Vertical stripes'], ['diagonal', 'Diagonal'], ['cross', 'Cross'], ['triangle', 'Triangle'], ['canton', 'Canton']];
  var SYMBOLS = [['star', 'Stars'], ['crescent', 'Crescent'], ['sun', 'Sun'], ['circle', 'Circle'], ['emblem', 'Coat of arms'], ['animal', 'Animal'], ['plant', 'Plant'], ['weapon', 'Weapon'], ['text', 'Writing'], ['map', 'Map'], ['unionjack', 'Union Jack']];
  var LAYOUT_KEYS = {}; LAYOUT.forEach(function (l) { LAYOUT_KEYS[l[0]] = 1; });
  var STATUS_LABEL = { 'new': 'Not started', learning: 'Learning', mastered: 'Mastered' };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function icon(id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function sentences(t, n) { var m = String(t).match(/[^.!?]+[.!?]+["”]?(\s|$)/g); return m ? m.slice(0, n).join('').trim() : t; }
  function plural(n, w, p) { return n + ' ' + (n === 1 ? w : (p || w + 's')); }
  function yearOf(f) { return parseInt(f.y, 10) || 0; }

  function arOf(code) { var m = D.meta[code]; return m.w / m.h; }
  function img(code, alt, eager) {
    var m = D.meta[code];
    return '<img src="flags/' + m.f + '" width="' + Math.round(m.w) + '" height="' + Math.round(m.h) + '" alt="' + esc(alt || '') + '"' + (eager ? '' : ' loading="lazy"') + ' decoding="async" draggable="false">';
  }
  function fbox(code, alt, eager) {
    return '<span class="fbox' + (code === 'np' ? ' free' : '') + '" style="--ar:' + arOf(code).toFixed(4) + '"><span class="fit">' + img(code, alt, eager) + '</span></span>';
  }
  function spec(code, alt, maxh, eager) {
    var f = BY[code];
    var parts = (f ? f.ratio : '').replace('≈', '').split(':');
    var h = (parts[0] || '').trim(), l = (parts[1] || '').trim();
    return '<div class="spec-wrap"><figure class="spec" style="--ar:' + arOf(code).toFixed(4) + (maxh ? ';--maxh:' + maxh + 'px' : '') + '">' +
      '<div class="dim dim-v" aria-hidden="true"><span>' + esc(h) + '</span></div>' +
      '<div class="f' + (code === 'np' ? ' free' : '') + '">' + img(code, alt, eager) + '</div>' +
      '<div class="dim dim-h" aria-hidden="true"><span>' + esc(l) + '</span></div></figure></div>';
  }
  function mini(code, sub) {
    var f = BY[code];
    return '<button class="mini" type="button" data-open="' + code + '">' + fbox(code, 'Flag of ' + f.n) +
      '<span class="nm">' + esc(f.n) + '</span>' + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</button>';
  }
  function swatches(cols) {
    return cols.map(function (c) { return '<i class="sw" title="' + esc(c) + '" style="background:' + COLHEX[c] + '"></i>'; }).join('') +
      '<span class="sr">' + esc(cols.join(', ')) + '</span>';
  }
  var PENNANT = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 29V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="pf" d="M8 4.5 27 10.5 8 16.5z" stroke-linejoin="round"/></svg>';

  var toastTimer = 0;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  /* ================= similarity (for tricky answers) ================= */
  function jacc(a, b) {
    if (!a.length && !b.length) return 0;
    var i = 0; a.forEach(function (x) { if (b.indexOf(x) >= 0) i++; });
    return i / (a.length + b.length - i);
  }
  var SIM = {};
  FL.forEach(function (a) {
    var al = a.tags.filter(function (t) { return LAYOUT_KEYS[t]; }), as = a.tags.filter(function (t) { return !LAYOUT_KEYS[t]; });
    var sc = [];
    FL.forEach(function (b) {
      if (b === a) return;
      var bl = b.tags.filter(function (t) { return LAYOUT_KEYS[t]; }), bs = b.tags.filter(function (t) { return !LAYOUT_KEYS[t]; });
      var s = (a.like.indexOf(b.c) >= 0 ? 6 : 0) + 3 * jacc(a.col, b.col) + 1.5 * jacc(al, bl) + jacc(as, bs) + (a.r === b.r ? 0.6 : 0);
      sc.push([b.c, s]);
    });
    sc.sort(function (x, y) { return y[1] - x[1]; });
    SIM[a.c] = sc.slice(0, 14).map(function (x) { return x[0]; });
  });

  /* ================= progress store ================= */
  var Store = (function () {
    var KEY = 'hoistfly.progress.v1';
    function blank() { return { v: 1, f: {}, best: {}, games: 0, updated: 0 }; }
    var data = blank();
    try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && p.f) data = Object.assign(blank(), p); } } catch (e) { /* storage unavailable */ }
    var api = { data: data, remote: null };
    var writing = false, pending = false, timer = 0, listeners = [];

    function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(api.data)); } catch (e) { /* ignore */ } }
    function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } }); }
    api.onChange = function (fn) { listeners.push(fn); };
    api.touch = function () {
      api.data.updated = Date.now(); saveLocal();
      if (api.remote) { clearTimeout(timer); timer = setTimeout(flush, 1500); }
      emit();
    };
    function flush() {
      if (!api.remote) return;
      if (writing) { pending = true; return; }
      writing = true;
      api.remote.set(JSON.parse(JSON.stringify(api.data))).catch(function (e) {
        var code = e && e.code;
        if (code && code !== 'unavailable' && code !== 'resource_exhausted') { api.remote = null; emit(); }
      }).then(function () {
        writing = false;
        if (pending) { pending = false; flush(); }
      });
    }
    function merge(r) {
      var pushBack = false, d = api.data;
      if (!r || typeof r !== 'object') return true;
      var rf = r.f || {};
      Object.keys(rf).forEach(function (k) {
        var a = d.f[k], b = rf[k];
        if (!b || typeof b !== 'object') return;
        if (!a || (b.t || 0) > (a.t || 0)) d.f[k] = b;
      });
      Object.keys(d.f).forEach(function (k) { if (!rf[k] || (d.f[k].t || 0) > (rf[k].t || 0)) pushBack = true; });
      var rb = r.best || {};
      Object.keys(rb).forEach(function (k) { if ((rb[k] || 0) > (d.best[k] || 0)) d.best[k] = rb[k]; });
      Object.keys(d.best).forEach(function (k) { if ((d.best[k] || 0) > (rb[k] || 0)) pushBack = true; });
      if ((r.games || 0) > d.games) d.games = r.games; else if (d.games > (r.games || 0)) pushBack = true;
      return pushBack;
    }
    api.connect = function () {
      var c = window.claude;
      if (!c || typeof c.use !== 'function') return;
      Promise.all([c.use('db'), c.use('user')]).then(function (res) {
        var db = res[0], user = res[1];
        if (!db || !user) return null;
        return user.id().then(function (uid) {
          if (!uid) return null;
          var ref = db.doc('data/users/' + uid + '/progress');
          return ref.get().then(function (snap) {
            api.remote = ref;
            var push = snap.exists ? merge(snap.data()) : Object.keys(api.data.f).length > 0;
            saveLocal(); emit();
            if (push) flush();
          });
        });
      }).catch(function () { api.remote = null; });
    };
    api.rec = function (code) { return api.data.f[code]; };
    api.status = function (code) { var r = api.data.f[code]; if (!r || !r.s) return 'new'; return r.k >= 3 ? 'mastered' : 'learning'; };
    api.needsReview = function (code) { var r = api.data.f[code]; return !!(r && r.w > 0 && r.k < 3); };
    api.record = function (code, ok) {
      var r = api.data.f[code] || { s: 0, c: 0, w: 0, k: 0, t: 0 };
      r.s++; if (ok) { r.c++; r.k++; } else { r.w++; r.k = 0; }
      r.t = Date.now(); api.data.f[code] = r; api.touch();
    };
    api.reviewList = function (n) {
      return ORDER.filter(api.needsReview).sort(function (a, b) {
        var ra = api.data.f[a], rb = api.data.f[b];
        return (rb.w - rb.c * 0.5) - (ra.w - ra.c * 0.5) || rb.t - ra.t;
      }).slice(0, n);
    };
    api.best = function (key) { return api.data.best[key] || 0; };
    api.setBest = function (key, v) { var prev = api.data.best[key] || 0; if (v > prev) api.data.best[key] = v; return prev; };
    api.bestOverall = function () { var m = 0; Object.keys(api.data.best).forEach(function (k) { if (api.data.best[k] > m) m = api.data.best[k]; }); return m; };
    api.reset = function () { api.data = blank(); api.touch(); if (api.remote) flush(); };
    return api;
  })();

  /* ================= router ================= */
  var VIEWS = ['start', 'explore', 'quiz', 'flashcards', 'lookalikes', 'learn'];
  var current = null;
  function show(v) {
    $$('.view').forEach(function (s) { s.hidden = s.getAttribute('data-view') !== v; });
    $$('[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (v !== current) window.scrollTo(0, 0);
    current = v;
    if (v === 'start') renderHome();
    else if (v === 'explore') renderExplore();
    else if (v === 'quiz') Quiz.enter();
    else if (v === 'flashcards') Cards.enter();
    else if (v === 'lookalikes') renderLookalikes();
    else if (v === 'learn') renderLearn();
  }
  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    var open = null;
    if (h.indexOf('flag-') === 0) { open = h.slice(5); h = 'explore'; }
    if (VIEWS.indexOf(h) < 0) h = 'start';
    show(h);
    if (open && BY[open]) openDetail(open);
  }
  function go(v) { if (location.hash !== '#' + v) location.hash = v; else show(v); }

  /* ================= home ================= */
  function seededPerm(arr, seed) {
    var s = seed >>> 0, a = arr.slice();
    function rnd() { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function fotdCode() {
    var d = new Date();
    var day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5);
    var perm = seededPerm(ORDER, 1848);
    return perm[((day % perm.length) + perm.length) % perm.length];
  }
  var oddIdx = Math.floor(Math.random() * D.records.length);
  function renderHome() { renderFotd(); renderProgress(); renderReview(); renderOdd(); }
  function renderOdd() {
    var g = D.records[oddIdx % D.records.length];
    $('#odd-panel').innerHTML = '<h2 id="od-title">Did you know?</h2><div class="odd"><div class="flags">' + g.m.map(function (c) { return mini(c); }).join('') + '</div><h3>' + esc(g.t) + '</h3><p>' + esc(g.d) + '</p></div>' +
      '<button class="link" type="button" data-act="odd-next">Show another</button>';
  }
  function renderFotd() {
    var code = fotdCode(), f = BY[code];
    var dl = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('#fotd').innerHTML =
      '<div class="fotd-top"><span class="eyebrow">Flag of the day</span><span class="eyebrow">' + esc(dl) + '</span></div>' +
      '<button class="fotd-flag" type="button" data-open="' + code + '" aria-label="Read the story of the flag of ' + esc(f.n) + '">' + spec(code, 'Flag of ' + f.n, 230, true) + '</button>' +
      '<h2>' + esc(f.n) + '</h2>' +
      '<p class="meta">' + esc(REGN[f.r]) + ' · Adopted ' + esc(f.y) + ' · Proportions ' + esc(f.ratio) + '</p>' +
      '<p class="story">' + esc(sentences(f.why, 2)) + '</p>' +
      '<button class="link" type="button" data-open="' + code + '">Read the full story</button>';
  }
  function renderProgress() {
    var counts = { mastered: 0, learning: 0, 'new': 0 };
    FL.forEach(function (f) { counts[Store.status(f.c)]++; });
    var pct = function (n, t) { return (n / t * 100).toFixed(2) + '%'; };
    var rows = REG.slice(1).map(function (r) {
      var list = FL.filter(function (f) { return f.r === r[0]; });
      var m = 0, l = 0; list.forEach(function (f) { var s = Store.status(f.c); if (s === 'mastered') m++; else if (s === 'learning') l++; });
      return '<li><span>' + r[1] + '</span><span class="bar" role="img" aria-label="' + m + ' of ' + list.length + ' mastered"><span class="s-m" style="width:' + pct(m, list.length) + '"></span><span class="s-l" style="width:' + pct(l, list.length) + '"></span></span><span class="num">' + m + '/' + list.length + '</span></li>';
    }).join('');
    $('#progress-panel').innerHTML =
      '<h2 id="pp-title">Your progress</h2>' +
      '<div class="statline"><div class="stat"><b>' + counts.mastered + '</b><span>flags mastered</span></div>' +
      '<div class="stat"><b>' + Store.bestOverall() + '</b><span>best quiz run</span></div>' +
      '<div class="stat"><b>' + Store.data.games + '</b><span>quizzes played</span></div></div>' +
      '<div class="stack" role="img" aria-label="' + counts.mastered + ' mastered, ' + counts.learning + ' learning, ' + counts['new'] + ' not started"><span class="s-m" style="width:' + pct(counts.mastered, FL.length) + '"></span><span class="s-l" style="width:' + pct(counts.learning, FL.length) + '"></span></div>' +
      '<ul class="legend"><li><i class="s-m"></i>Mastered ' + counts.mastered + '</li><li><i class="s-l"></i>Learning ' + counts.learning + '</li><li><i style="background:var(--paper-2);box-shadow:inset 0 0 0 1px var(--line-2)"></i>Not started ' + counts['new'] + '</li></ul>' +
      '<ul class="rows">' + rows + '</ul>' +
      '<p class="note"><span class="dot' + (Store.remote ? ' on' : '') + '"></span><span>' + (Store.remote ? 'Saved to your account, so it follows you to other devices.' : 'Saved in this browser.') + ' A flag counts as mastered after three correct answers in a row.</span></p>' +
      '<p class="note confirm" id="reset-wrap"><button class="link" type="button" data-act="reset">Reset progress</button></p>';
  }
  function renderReview() {
    var list = Store.reviewList(12);
    var html = '<h2 id="rp-title">Needs review</h2>';
    if (list.length) {
      html += '<div class="review-list">' + list.map(function (c) { var r = Store.rec(c); return mini(c, 'missed ' + plural(r.w, 'time')); }).join('') + '</div>' +
        '<div class="chips"><button class="btn btn-primary btn-sm" type="button" data-act="review-cards">Practise with flashcards</button><button class="btn btn-sm" type="button" data-act="review-quiz">Quiz just these</button></div>';
    } else {
      html += '<p class="empty-state">Nothing to review yet. Flags you miss in the quiz or flashcards will collect here so you can practise them.</p>' +
        '<div class="chips" style="margin-top:14px"><a class="btn btn-sm" href="#flashcards">Start with flashcards</a><a class="btn btn-sm" href="#lookalikes">See the lookalikes</a></div>';
    }
    $('#review-panel').innerHTML = html;
  }

  /* ================= explore ================= */
  var ex = { q: '', region: 'all', colors: [], layout: [], symbols: [], sort: 'az' };
  var exList = ORDER.slice();
  var cardEls = null;
  function toggleIn(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
  function setupExplore() {
    $('#ex-region').innerHTML = REG.map(function (r) { return '<button type="button" data-r="' + r[0] + '" aria-pressed="' + (r[0] === ex.region) + '">' + r[1] + '</button>'; }).join('');
    $('#ex-colors').innerHTML = COLORS.map(function (c) { return '<button class="chip" type="button" data-col="' + c[0] + '" aria-pressed="false"><i class="sw" style="background:' + c[2] + '"></i>' + c[1] + '</button>'; }).join('');
    $('#ex-layout').innerHTML = LAYOUT.map(function (c) { return '<button class="chip" type="button" data-lay="' + c[0] + '" aria-pressed="false">' + c[1] + '</button>'; }).join('');
    $('#ex-symbols').innerHTML = SYMBOLS.map(function (c) { return '<button class="chip" type="button" data-sym="' + c[0] + '" aria-pressed="false">' + c[1] + '</button>'; }).join('');
    $('#ex-region').addEventListener('click', function (e) { var b = e.target.closest('button[data-r]'); if (!b) return; ex.region = b.getAttribute('data-r'); $$('#ex-region button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); renderExplore(); });
    $('#ex-filters').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.id === 'ex-clear') { ex.colors = []; ex.layout = []; ex.symbols = []; $$('#ex-filters .chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); renderExplore(); return; }
      if (b.hasAttribute('data-col')) toggleIn(ex.colors, b.getAttribute('data-col'));
      else if (b.hasAttribute('data-lay')) toggleIn(ex.layout, b.getAttribute('data-lay'));
      else if (b.hasAttribute('data-sym')) toggleIn(ex.symbols, b.getAttribute('data-sym'));
      else return;
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      renderExplore();
    });
    $('#ex-more').addEventListener('click', function () { var p = $('#ex-filters'); p.hidden = !p.hidden; this.setAttribute('aria-expanded', String(!p.hidden)); });
    var qi = $('#ex-q'), qt = 0;
    qi.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { ex.q = qi.value; renderExplore(); }, 90); });
    $('#ex-sort').addEventListener('change', function () { ex.sort = this.value; renderExplore(); });
  }
  function buildCards() {
    cardEls = {};
    FL.forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'card'; b.setAttribute('data-open', f.c);
      b.innerHTML = fbox(f.c, 'Flag of ' + f.n) + '<span class="nm"><span>' + esc(f.n) + '</span><i class="st"></i></span><span class="sub">' + esc(REGN[f.r]) + '</span>';
      cardEls[f.c] = b;
    });
  }
  function weakScore(f) { var r = Store.rec(f.c); var s = Store.status(f.c); if (s === 'learning') return 3000 + (r.w - r.c) * 10; if (s === 'new') return 1000; return 0; }
  function renderExplore() {
    if (!cardEls) buildCards();
    var q = norm(ex.q);
    var list = FL.filter(function (f) {
      if (ex.region !== 'all' && f.r !== ex.region) return false;
      if (q && norm(f.n).indexOf(q) < 0 && norm(f.cap).indexOf(q) < 0 && !(f.nick && norm(f.nick).indexOf(q) >= 0)) return false;
      for (var i = 0; i < ex.colors.length; i++) if (f.col.indexOf(ex.colors[i]) < 0) return false;
      for (i = 0; i < ex.layout.length; i++) if (f.tags.indexOf(ex.layout[i]) < 0) return false;
      for (i = 0; i < ex.symbols.length; i++) if (f.tags.indexOf(ex.symbols[i]) < 0) return false;
      return true;
    });
    var ri = { af: 0, as: 1, eu: 2, na: 3, sa: 4, oc: 5 };
    if (ex.sort === 'region') list.sort(function (a, b) { return ri[a.r] - ri[b.r] || a.i - b.i; });
    else if (ex.sort === 'new') list.sort(function (a, b) { return yearOf(b) - yearOf(a) || a.i - b.i; });
    else if (ex.sort === 'old') list.sort(function (a, b) { return yearOf(a) - yearOf(b) || a.i - b.i; });
    else if (ex.sort === 'weak') list.sort(function (a, b) { return weakScore(b) - weakScore(a) || a.i - b.i; });
    var frag = document.createDocumentFragment();
    list.forEach(function (f) {
      var el = cardEls[f.c], st = Store.status(f.c), dot = el.querySelector('.st');
      dot.className = 'st ' + st; dot.title = STATUS_LABEL[st];
      var sub = el.querySelector('.sub');
      sub.textContent = (ex.sort === 'new' || ex.sort === 'old') ? 'Adopted ' + f.y : REGN[f.r];
      frag.appendChild(el);
    });
    $('#ex-grid').replaceChildren(frag);
    $('#ex-count').textContent = list.length + ' of ' + FL.length + ' flags';
    $('#ex-empty').hidden = list.length > 0;
    var n = ex.colors.length + ex.layout.length + ex.symbols.length, bd = $('#ex-fcount');
    bd.hidden = !n; bd.textContent = n;
    exList = list.map(function (f) { return f.c; });
  }

  /* ================= detail sheet ================= */
  var dlgList = ORDER, dlgIdx = 0;
  function openDetail(code, list) {
    var src = list || (current === 'explore' && exList.length ? exList : ORDER);
    if (src.indexOf(code) < 0) src = ORDER;
    dlgList = src; dlgIdx = src.indexOf(code);
    renderDetail(code);
    var dlg = $('#dlg');
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
  }
  function step(d) { if (!dlgList.length) return; dlgIdx = (dlgIdx + d + dlgList.length) % dlgList.length; renderDetail(dlgList[dlgIdx]); }
  function renderDetail(code) {
    var f = BY[code], st = Store.status(code), r = Store.rec(code);
    $('#dlg-pos').textContent = (dlgIdx + 1) + ' / ' + dlgList.length;
    var likeHtml = f.like.length ? '<section class="d-sec"><h3>Don’t mix it up with</h3><div class="like-row">' + f.like.map(function (c) { return mini(c); }).join('') + '</div></section>' : '';
    var altHtml = f.alt ? '<section class="d-sec"><h3>' + (code === 'af' ? 'Also flown' : 'Previous design') + '</h3><div class="altfig">' + fbox(f.alt.f, (code === 'af' ? 'Former flag' : 'Previous flag') + ' of ' + f.n, true) + '<p class="small muted">' + esc(f.alt.cap) + '</p></div></section>' : '';
    $('#dlg-body').innerHTML =
      '<div class="d-head"><div>' + spec(code, 'Flag of ' + f.n, 300, true) + '</div>' +
      '<div class="d-title"><p class="eyebrow">' + esc(REGN[f.r]) + '</p><h2 id="dlg-name">' + esc(f.n) + '</h2>' + (f.nick ? '<p class="nick">“' + esc(f.nick) + '”</p>' : '') +
      '<dl class="facts"><div><dt>Capital</dt><dd>' + esc(f.cap) + '</dd></div><div><dt>Current design since</dt><dd>' + esc(f.y) + '</dd></div>' +
      '<div><dt>Proportions</dt><dd>' + esc(f.ratio) + '</dd></div><div><dt>Main colours</dt><dd>' + swatches(f.col) + '</dd></div></dl>' +
      '<p style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="pill ' + st + '">' + STATUS_LABEL[st] + '</span>' + (r ? '<span class="small muted">' + r.c + ' right, ' + r.w + ' wrong so far</span>' : '') + '</p></div></div>' +
      '<div class="d-cols"><div><section class="d-sec d-why"><h3>Why it looks like this</h3><p>' + esc(f.why) + '</p></section>' +
      (f.st ? '<section class="d-sec"><h3>Status</h3><p>' + esc(f.st) + '</p></section>' : '') + altHtml + '</div>' +
      '<div><section class="d-sec"><h3>How to recognise it</h3><p class="tipbox">' + esc(f.tip) + '</p></section>' +
      '<section class="d-sec"><h3>Did you know?</h3><p>' + esc(f.fact) + '</p></section>' + likeHtml + '</div></div>' +
      '<div class="d-actions"><button class="btn btn-primary btn-sm" type="button" data-act="quiz-region" data-r="' + f.r + '">Quiz me on ' + esc(REGN[f.r]) + '</button>' +
      (f.like.length ? '<button class="btn btn-sm" type="button" data-act="quiz-like" data-c="' + code + '">Quiz this flag and its lookalikes</button>' : '') + '</div>';
    var sc = $('#dlg .sheet-in'); if (sc) sc.scrollTop = 0;
  }

  /* ================= quiz ================= */
  var Quiz = {
    cfg: { mode: 'name', region: 'all', diff: 'standard', custom: null },
    st: null, auto: false, view: 'setup',
    key: function () { return [this.cfg.mode, this.cfg.custom ? 'set-' + this.cfg.custom.id : this.cfg.region, this.cfg.diff].join('|'); },
    label: function () {
      var m = { name: 'Name the flag', flag: 'Find the flag', mixed: 'Mixed' }[this.cfg.mode];
      return m + ' · ' + (this.cfg.custom ? this.cfg.custom.title : REGN[this.cfg.region]) + ' · ' + (this.cfg.diff === 'tricky' ? 'Tricky' : 'Standard');
    },
    pool: function () {
      var cfg = this.cfg;
      if (cfg.custom) return cfg.custom.codes.slice();
      return FL.filter(function (f) { return cfg.region === 'all' || f.r === cfg.region; }).map(function (f) { return f.c; });
    },
    enter: function () {
      if (this.auto) { this.auto = false; this.start(); return; }
      if (this.st && !this.st.over) this.renderGame();
      else if (this.st && this.view === 'over') this.renderOver();
      else this.renderSetup();
    },
    renderSetup: function () {
      this.view = 'setup';
      var c = this.cfg, self = this;
      var mode = function (k, t, d) { return '<button class="mode" type="button" data-mode="' + k + '" aria-pressed="' + (c.mode === k) + '"><strong>' + t + '</strong><span>' + d + '</span></button>'; };
      var diff = function (k, t, d) { return '<button class="mode" type="button" data-diff="' + k + '" aria-pressed="' + (c.diff === k) + '"><strong>' + t + '</strong><span>' + d + '</span></button>'; };
      $('#v-quiz').innerHTML =
        '<div class="view-head"><div><h2>Flag quiz</h2><p class="lede">Multiple choice, as many questions as you like. The quiz ends after your fifth wrong answer.</p></div></div>' +
        '<div class="q-setup"><section class="panel">' +
        (c.custom ? '<div class="custom-set" style="margin-bottom:20px"><span><strong>Practice set:</strong> ' + esc(c.custom.title) + ' (' + plural(c.custom.codes.length, 'flag') + ')</span><button class="link" type="button" data-q="clear-set">Choose by region instead</button></div>' : '') +
        '<div class="opt-group"><span class="opt-label">Question type</span><div class="modes">' +
        mode('name', 'Name the flag', 'See a flag, pick the country.') + mode('flag', 'Find the flag', 'See a country, pick its flag.') + mode('mixed', 'Mixed', 'A bit of both.') + '</div></div>' +
        (c.custom ? '' : '<div class="opt-group"><span class="opt-label">Flags from</span><div class="seg" id="q-region">' + REG.map(function (r) { return '<button type="button" data-r="' + r[0] + '" aria-pressed="' + (c.region === r[0]) + '">' + r[1] + '</button>'; }).join('') + '</div></div>') +
        '<div class="opt-group"><span class="opt-label">Wrong answers</span><div class="modes" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
        diff('standard', 'Standard', 'Random choices' + (c.region !== 'all' && !c.custom ? ' from the same region.' : '.')) + diff('tricky', 'Tricky', 'Choices that look alike.') + '</div></div>' +
        '<div style="margin-top:24px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button class="btn btn-accent" type="button" data-q="start">' + icon('i-quiz') + 'Start quiz</button><span class="small muted">' + plural(this.pool().length, 'flag') + ' in this quiz</span></div>' +
        '</section><aside class="panel"><h2>How it works</h2><ul class="rules">' +
        '<li>' + PENNANT.replace('<svg', '<svg style="color:var(--ink)"') + '<span>You have five lives. Each wrong answer costs one, and the quiz ends when they run out.</span></li>' +
        '<li>' + icon('i-eye') + '<span>After every answer you see the right flag and a tip for remembering it. There is no time limit.</span></li>' +
        '<li>' + icon('i-check') + '<span>Three correct answers in a row marks a flag as mastered. Misses go to your review list.</span></li>' +
        '<li>' + icon('i-keys') + '<span>On a keyboard, press 1 to 4 to answer and Enter for the next question.</span></li></ul>' +
        '<div class="best-line"><span class="muted">Your best with these settings</span><b>' + Store.best(this.key()) + '</b></div></aside></div>';
      var v = $('#v-quiz');
      v.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { c.mode = b.getAttribute('data-mode'); self.renderSetup(); }; });
      v.querySelectorAll('[data-diff]').forEach(function (b) { b.onclick = function () { c.diff = b.getAttribute('data-diff'); self.renderSetup(); }; });
      v.querySelectorAll('#q-region [data-r]').forEach(function (b) { b.onclick = function () { c.region = b.getAttribute('data-r'); self.renderSetup(); }; });
    },
    start: function () {
      var pool = this.pool();
      if (!pool.length) { toast('There are no flags in that set.'); this.renderSetup(); return; }
      this.st = { pool: pool, deck: shuffle(pool), score: 0, lives: 5, streak: 0, bestStreak: 0, asked: 0, missed: [], q: null, answered: false, over: false, lost: -1, last: null };
      this.next();
      window.scrollTo(0, 0);
    },
    distractors: function (code, n) {
      var out = [], cfg = this.cfg;
      function add(c) { if (out.length < n && c !== code && out.indexOf(c) < 0 && BY[c]) out.push(c); }
      if (cfg.custom) shuffle(cfg.custom.codes).forEach(add);
      if (cfg.diff === 'tricky') shuffle(SIM[code].slice(0, 7)).forEach(add);
      else {
        var base = (cfg.region !== 'all' && !cfg.custom) ? FL.filter(function (f) { return f.r === cfg.region; }) : FL;
        shuffle(base.map(function (f) { return f.c; })).forEach(add);
      }
      shuffle(ORDER).forEach(add);
      return out;
    },
    next: function () {
      var s = this.st;
      if (!s.deck.length) {
        s.deck = shuffle(s.pool);
        if (s.deck.length > 1 && s.deck[s.deck.length - 1] === s.last) s.deck.unshift(s.deck.pop());
        toast('You have seen every flag in this set. Shuffling for another round.');
      }
      var code = s.deck.pop();
      var mode = this.cfg.mode === 'mixed' ? (Math.random() < 0.5 ? 'name' : 'flag') : this.cfg.mode;
      s.q = { code: code, mode: mode, opts: shuffle([code].concat(this.distractors(code, 3))), picked: null };
      s.last = code; s.answered = false; s.lost = -1;
      this.renderGame();
      var top = $('#v-quiz .q-game'); if (top && top.getBoundingClientRect().top < 0) window.scrollTo(0, 0);
    },
    renderGame: function () {
      this.view = 'game';
      var s = this.st, q = s.q, f = BY[q.code];
      var lives = '';
      for (var i = 0; i < 5; i++) lives += PENNANT.replace('<svg ', '<svg class="' + (i < s.lives ? '' : 'lost') + (s.lost === i ? ' just-lost' : '') + '" ');
      var opts = q.opts.map(function (c, i) {
        var cls = 'ans';
        if (s.answered) { if (c === q.code) cls += ' right'; else if (c === q.picked) cls += ' wrong'; else cls += ' faded'; }
        var mark = s.answered && (c === q.code || c === q.picked) ? '<svg class="mark" aria-hidden="true"><use href="#' + (c === q.code ? 'i-check' : 'i-x') + '"/></svg>' : '';
        if (q.mode === 'name') return '<button class="' + cls + '" type="button" data-i="' + i + '"' + (s.answered ? ' disabled' : '') + '><span class="kbd">' + (i + 1) + '</span><span class="lbl">' + esc(BY[c].n) + '</span>' + mark + '</button>';
        return '<button class="' + cls + '" type="button" data-i="' + i + '"' + (s.answered ? ' disabled' : '') + ' aria-label="' + (s.answered ? esc(BY[c].n) : 'Flag ' + (i + 1)) + '"><span class="kbd">' + (i + 1) + '</span>' + fbox(c, '', true) + '<span class="cap">' + (s.answered ? esc(BY[c].n) : '') + '</span>' + mark + '</button>';
      }).join('');
      var fb = '';
      if (s.answered) {
        var ok = q.picked === q.code;
        var head = ok ? 'Correct.' : (q.mode === 'name' ? 'Not quite. This is ' + f.n + '.' : 'Not quite. You picked ' + BY[q.picked].n + '.');
        fb = '<div class="fb ' + (ok ? 'good' : 'bad') + '" role="status"><div><strong>' + esc(head) + '</strong><p>' + (ok ? '' : '<b>' + esc(f.n) + ':</b> ') + esc(f.tip) + ' <button class="link more" type="button" data-open="' + f.c + '">Why it looks like this</button></p></div>' +
          '<button class="btn btn-primary" type="button" data-q="next" id="q-next">' + (s.over ? 'See results' : 'Next') + ' <span class="kbd" style="background:transparent;color:inherit;border-color:currentColor">Enter</span></button></div>';
      }
      $('#v-quiz').innerHTML =
        '<div class="q-game"><div class="q-hud"><div class="lives" role="img" aria-label="' + s.lives + ' of 5 lives left">' + lives + '</div>' +
        '<div class="score"><span>Correct<b>' + s.score + '</b></span><span>Streak<b>' + s.streak + '</b></span><span>Best<b>' + Math.max(Store.best(this.key()), s.score) + '</b></span></div></div>' +
        '<div class="q-card"><p class="q-prompt"><span>' + (q.mode === 'name' ? 'Which country flies this flag?' : 'Find the flag of') + '</span><span>Question ' + (s.asked + (s.answered ? 0 : 1)) + '</span></p>' +
        (q.mode === 'name' ? '<div class="q-stage">' + fbox(q.code, 'The flag to identify', true) + '</div><div class="answers">' + opts + '</div>'
          : '<p class="q-name">' + esc(f.n) + '</p><div class="answers flags">' + opts + '</div>') +
        fb + '</div>' +
        '<div class="q-foot"><span>' + esc(this.label()) + '</span><button class="link" type="button" data-q="quit">End quiz</button></div></div>';
      var nb = $('#q-next');
      if (nb) {
        nb.focus({ preventScroll: true });
        var fbEl = $('#v-quiz .fb'), rect = fbEl.getBoundingClientRect(), bar = $('.tabbar'), barH = bar && getComputedStyle(bar).display !== 'none' ? bar.offsetHeight : 0;
        if (rect.bottom > window.innerHeight - barH) window.scrollBy({ top: rect.bottom - (window.innerHeight - barH) + 12, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    },
    answer: function (i) {
      var s = this.st; if (!s || s.answered || s.over) return;
      var q = s.q; q.picked = q.opts[i]; s.answered = true; s.asked++;
      var ok = q.picked === q.code;
      Store.record(q.code, ok);
      if (ok) { s.score++; s.streak++; if (s.streak > s.bestStreak) s.bestStreak = s.streak; }
      else { s.lives--; s.lost = s.lives; s.streak = 0; s.missed.push({ c: q.code, p: q.picked, m: q.mode }); }
      if (s.lives <= 0) this.finish();
      this.renderGame();
    },
    finish: function () {
      var s = this.st; s.over = true;
      Store.data.games++;
      s.prevBest = Store.setBest(this.key(), s.score);
      s.isBest = s.score > s.prevBest && s.score > 0;
      Store.touch();
    },
    quit: function () {
      var s = this.st; if (!s) return;
      if (!s.over) { s.quit = true; this.finish(); }
      this.renderOver();
    },
    renderOver: function () {
      this.view = 'over';
      var s = this.st;
      var acc = s.asked ? Math.round(s.score / s.asked * 100) : 0;
      var mastered = FL.filter(function (f) { return Store.status(f.c) === 'mastered'; }).length;
      var seen = {}, missed = s.missed.filter(function (m) { if (seen[m.c]) return false; seen[m.c] = 1; return true; });
      $('#v-quiz').innerHTML =
        '<div class="over"><div class="over-head"><div class="over-num">' + s.score + '</div><div><p class="eyebrow">' + (s.quit ? 'Quiz ended' : 'Out of lives') + ' · ' + esc(this.label()) + '</p>' +
        '<h2>' + plural(s.score, 'correct answer') + '</h2>' +
        (s.isBest ? '<span class="newbest">New personal best</span>' : '<p class="muted" style="margin-top:6px">Your best with these settings: ' + Math.max(s.prevBest || 0, s.score) + '</p>') + '</div></div>' +
        '<div class="over-stats"><div class="stat"><b>' + acc + '%</b><span>accuracy</span></div><div class="stat"><b>' + s.bestStreak + '</b><span>longest streak</span></div>' +
        '<div class="stat"><b>' + s.asked + '</b><span>questions</span></div><div class="stat"><b>' + mastered + '</b><span>flags mastered overall</span></div></div>' +
        (missed.length ? '<h3 class="d-sec"><span class="eyebrow">The flags that got you</span></h3><div class="missed">' + missed.map(function (m) { return mini(m.c, 'You picked ' + BY[m.p].n); }).join('') + '</div>' : '<p class="empty-state" style="margin-bottom:24px">No misses at all. Try the Tricky setting or a bigger region.</p>') +
        '<div class="actions"><button class="btn btn-accent" type="button" data-q="again">' + icon('i-quiz') + 'Play again</button>' +
        (missed.length ? '<button class="btn" type="button" data-q="drill">' + icon('i-cards') + 'Practise these with flashcards</button>' : '') +
        '<button class="btn btn-ghost" type="button" data-q="setup">Change settings</button></div></div>';
    }
  };

  /* ================= flashcards ================= */
  var Cards = {
    cfg: { region: 'all', filter: 'all', dir: 'flag', custom: null },
    st: null, auto: false, view: 'setup',
    deck: function () {
      var c = this.cfg;
      if (c.custom) return c.custom.codes.slice();
      return FL.filter(function (f) {
        if (c.region !== 'all' && f.r !== c.region) return false;
        if (c.filter === 'notm') return Store.status(f.c) !== 'mastered';
        if (c.filter === 'review') return Store.needsReview(f.c);
        return true;
      }).map(function (f) { return f.c; });
    },
    enter: function () {
      if (this.auto) { this.auto = false; this.start(); return; }
      if (this.st && !this.st.done) this.renderCard();
      else if (this.st && this.view === 'done') this.renderDone();
      else this.renderSetup();
    },
    renderSetup: function () {
      this.view = 'setup';
      var c = this.cfg, self = this, n = this.deck().length;
      var seg = function (attr, val, list) { return list.map(function (x) { return '<button type="button" data-' + attr + '="' + x[0] + '" aria-pressed="' + (val === x[0]) + '">' + x[1] + '</button>'; }).join(''); };
      $('#v-flashcards').innerHTML =
        '<div class="view-head"><div><h2>Flashcards</h2><p class="lede">Flip a card, then be honest with yourself. Cards you are still learning come back a few cards later until you know them.</p></div></div>' +
        '<div class="q-setup"><section class="panel">' +
        (c.custom ? '<div class="custom-set" style="margin-bottom:20px"><span><strong>Practice set:</strong> ' + esc(c.custom.title) + ' (' + plural(c.custom.codes.length, 'card') + ')</span><button class="link" type="button" data-c="clear-set">Build a deck instead</button></div>' : '') +
        '<div class="opt-group"><span class="opt-label">Front of the card</span><div class="modes" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
        '<button class="mode" type="button" data-dir="flag" aria-pressed="' + (c.dir === 'flag') + '"><strong>Flag</strong><span>Name the country.</span></button>' +
        '<button class="mode" type="button" data-dir="name" aria-pressed="' + (c.dir === 'name') + '"><strong>Country name</strong><span>Picture its flag.</span></button></div></div>' +
        (c.custom ? '' : '<div class="opt-group"><span class="opt-label">Flags from</span><div class="seg">' + seg('r', c.region, REG) + '</div></div>' +
          '<div class="opt-group"><span class="opt-label">Which cards</span><div class="seg">' + seg('flt', c.filter, [['all', 'All'], ['notm', 'Not yet mastered'], ['review', 'Needs review']]) + '</div></div>') +
        '<div style="margin-top:24px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button class="btn btn-accent" type="button" data-c="start"' + (n ? '' : ' disabled') + '>' + icon('i-cards') + 'Start</button><span class="small muted">' + (n ? plural(n, 'card') + ' in this deck' : 'No cards match yet. Try another option.') + '</span></div>' +
        '</section><aside class="panel"><h2>Tips</h2><ul class="rules">' +
        '<li>' + icon('i-eye') + '<span>Say the answer out loud before flipping. Recalling beats recognising.</span></li>' +
        '<li>' + icon('i-check') + '<span>"Got it" counts as a correct answer toward mastery; "Still learning" puts the card back a few places.</span></li>' +
        '<li>' + icon('i-bolt') + '<span>Short sessions work best. Twenty cards a day adds up to the whole world in two weeks.</span></li>' +
        '<li>' + icon('i-keys') + '<span>Space flips the card. Press 1 for still learning and 2 for got it.</span></li></ul></aside></div>';
      var v = $('#v-flashcards');
      v.querySelectorAll('[data-dir]').forEach(function (b) { b.onclick = function () { c.dir = b.getAttribute('data-dir'); self.renderSetup(); }; });
      v.querySelectorAll('[data-r]').forEach(function (b) { b.onclick = function () { c.region = b.getAttribute('data-r'); self.renderSetup(); }; });
      v.querySelectorAll('[data-flt]').forEach(function (b) { b.onclick = function () { c.filter = b.getAttribute('data-flt'); self.renderSetup(); }; });
    },
    start: function () {
      var codes = this.deck();
      if (!codes.length) { toast('No cards match that deck yet.'); this.renderSetup(); return; }
      this.st = { queue: shuffle(codes), total: codes.length, known: 0, again: 0, flipped: false, done: false };
      this.renderCard(); window.scrollTo(0, 0);
    },
    renderCard: function () {
      this.view = 'card';
      var s = this.st, code = s.queue[0], f = BY[code], dir = this.cfg.dir;
      var front = dir === 'flag'
        ? fbox(code, 'Flag to identify', true) + '<p class="hint">Which country is this?</p>'
        : '<p class="big-name">' + esc(f.n) + '</p><p class="hint">Picture its flag, then flip the card.</p>';
      var back = '<div class="back-head">' + fbox(code, 'Flag of ' + f.n, true) + '<div><p class="eyebrow">' + esc(REGN[f.r]) + ' · Capital ' + esc(f.cap) + '</p><h3>' + esc(f.n) + '</h3></div></div>' +
        '<p class="tipbox">' + esc(f.tip) + '</p><p>' + esc(sentences(f.why, 2)) + '</p>' +
        '<p><button class="link" type="button" data-open="' + code + '">Read the full story</button></p>';
      $('#v-flashcards').innerHTML =
        '<div class="fc"><div class="fc-top"><span class="count">' + s.queue.length + ' left · ' + s.known + ' known</span>' +
        '<div class="fc-meter" role="img" aria-label="' + s.known + ' of ' + s.total + ' known"><span style="width:' + (s.known / s.total * 100).toFixed(1) + '%"></span></div>' +
        '<button class="link" type="button" data-c="end">End session</button></div>' +
        '<div class="flip"><div class="card3d' + (s.flipped ? ' flipped' : '') + '" id="fc-card" role="button" tabindex="0" aria-label="' + (s.flipped ? 'Card showing the answer' : 'Flip to show the answer') + '">' +
        '<div class="face front"' + (s.flipped ? ' aria-hidden="true"' : '') + '>' + front + '</div><div class="face back"' + (s.flipped ? '' : ' aria-hidden="true"') + '>' + back + '</div></div></div>' +
        '<div class="fc-actions" id="fc-actions">' + this.actions() + '</div></div>';
    },
    actions: function () {
      return this.st.flipped
        ? '<button class="btn" type="button" data-g="0">' + icon('i-x') + 'Still learning <span class="kbd">1</span></button><button class="btn btn-primary" type="button" data-g="1">' + icon('i-check') + 'Got it <span class="kbd" style="background:transparent;color:inherit;border-color:currentColor">2</span></button>'
        : '<button class="btn btn-primary" type="button" data-c="flip" style="grid-column:1 / -1">Show answer <span class="kbd" style="background:transparent;color:inherit;border-color:currentColor">Space</span></button>';
    },
    flip: function () {
      var s = this.st; if (!s || s.done) return;
      s.flipped = !s.flipped;
      var card = $('#fc-card'); if (!card) return;
      card.classList.toggle('flipped', s.flipped);
      card.setAttribute('aria-label', s.flipped ? 'Card showing the answer' : 'Flip to show the answer');
      $('#fc-card .front').setAttribute('aria-hidden', String(s.flipped));
      $('#fc-card .back').setAttribute('aria-hidden', String(!s.flipped));
      $('#fc-actions').innerHTML = this.actions();
    },
    grade: function (ok) {
      var s = this.st; if (!s || s.done || !s.flipped) return;
      var c = s.queue.shift();
      Store.record(c, ok);
      if (ok) s.known++;
      else { s.again++; s.queue.splice(Math.min(3, s.queue.length), 0, c); }
      s.flipped = false;
      if (!s.queue.length) { s.done = true; this.renderDone(); } else this.renderCard();
    },
    renderDone: function () {
      this.view = 'done';
      var s = this.st;
      $('#v-flashcards').innerHTML =
        '<div class="over"><div class="over-head"><div class="over-num">' + s.known + '</div><div><p class="eyebrow">' + (s.ended ? 'Session ended' : 'Deck complete') + '</p><h2>' + (s.known === 1 ? 'card learned' : 'cards learned') + '</h2>' +
        '<p class="muted" style="margin-top:6px">' + (s.again ? 'You marked ' + plural(s.again, 'card') + ' as still learning along the way.' : 'You knew every card the first time.') + '</p></div></div>' +
        '<div class="actions" style="margin-top:24px"><button class="btn btn-accent" type="button" data-c="again">' + icon('i-cards') + 'Go again</button><button class="btn" type="button" data-c="setup">New deck</button><a class="btn btn-ghost" href="#quiz">Test yourself in the quiz</a></div></div>';
    }
  };

  /* ================= lookalikes & learn ================= */
  var lkDone = false, learnDone = false;
  function renderLookalikes() {
    if (lkDone) return; lkDone = true;
    $('#lk-list').innerHTML = D.groups.map(function (g) {
      return '<article class="lk"><div class="lk-head"><div><h3>' + esc(g.t) + '</h3><p>' + esc(g.d) + '</p></div>' +
        '<div class="lk-acts"><button class="btn btn-sm btn-primary" type="button" data-act="lk-quiz" data-g="' + g.id + '">Quiz this group</button><button class="btn btn-sm" type="button" data-act="lk-cards" data-g="' + g.id + '">Flashcards</button></div></div>' +
        '<div class="lk-row">' + g.m.map(function (m) { return '<div class="lk-item">' + mini(m[0]) + '<p class="note">' + esc(m[1]) + '</p></div>'; }).join('') + '</div></article>';
    }).join('');
  }
  function renderLearn() {
    if (learnDone) return; learnDone = true;
    $('#ratios').innerHTML = ['ch', 'be', 'fr', 'us', 'gb', 'qa', 'np'].map(function (c) {
      return '<button class="ratio-item" type="button" data-open="' + c + '"><span class="rimg' + (c === 'np' ? ' free' : '') + '" style="width:' + (58 * arOf(c)).toFixed(1) + 'px">' + img(c, 'Flag of ' + BY[c].n) + '</span><span class="nm">' + esc(BY[c].n) + '</span><span class="r">' + esc(BY[c].ratio) + '</span></button>';
    }).join('');
    $('#gloss').innerHTML = D.glossary.map(function (g) { return '<div><dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd></div>'; }).join('');
    $('#fam').innerHTML = D.families.map(function (g) {
      return '<article><div><h3>' + esc(g.t) + '</h3><p>' + esc(g.d) + '</p></div><div class="flags">' + g.m.map(function (c) { return mini(c); }).join('') + '</div></article>';
    }).join('');
    $('#records').innerHTML = D.records.map(function (g) {
      return '<article class="rec"><div class="flags">' + g.m.map(function (c) { return mini(c); }).join('') + '</div><h3>' + esc(g.t) + '</h3><p>' + esc(g.d) + '</p></article>';
    }).join('');
  }
  function groupSet(id) {
    var g = D.groups.filter(function (x) { return x.id === id; })[0];
    return g ? { id: g.id, title: g.t, codes: g.m.map(function (m) { return m[0]; }) } : null;
  }

  /* ================= events ================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-act],[data-q],[data-c],[data-g],[data-i]');
    if (!t) return;
    if (t.hasAttribute('data-open')) {
      var code = t.getAttribute('data-open');
      if (BY[code]) { e.preventDefault(); openDetail(code, $('#dlg').open ? dlgList : null); }
      return;
    }
    var act = t.getAttribute('data-act');
    if (act) {
      var dlg = $('#dlg');
      if (act === 'quiz-region') { Quiz.cfg.custom = null; Quiz.cfg.region = t.getAttribute('data-r'); Quiz.auto = true; dlg.close(); go('quiz'); }
      else if (act === 'quiz-like') { var c0 = t.getAttribute('data-c'); Quiz.cfg.custom = { id: 'like-' + c0, title: BY[c0].n + ' and its lookalikes', codes: [c0].concat(BY[c0].like) }; Quiz.cfg.diff = 'tricky'; Quiz.cfg.mode = 'mixed'; Quiz.auto = true; dlg.close(); go('quiz'); }
      else if (act === 'lk-quiz') { Quiz.cfg.custom = groupSet(t.getAttribute('data-g')); Quiz.cfg.diff = 'tricky'; Quiz.cfg.mode = 'mixed'; Quiz.auto = true; go('quiz'); }
      else if (act === 'lk-cards') { Cards.cfg.custom = groupSet(t.getAttribute('data-g')); Cards.auto = true; go('flashcards'); }
      else if (act === 'review-cards') { Cards.cfg.custom = { id: 'review', title: 'Needs review', codes: Store.reviewList(40) }; Cards.auto = true; go('flashcards'); }
      else if (act === 'review-quiz') { Quiz.cfg.custom = { id: 'review', title: 'Needs review', codes: Store.reviewList(40) }; Quiz.auto = true; go('quiz'); }
      else if (act === 'reset') { $('#reset-wrap').innerHTML = '<span>Erase all progress and best scores?</span><button class="btn btn-sm" type="button" data-act="reset-yes">Erase</button><button class="btn btn-sm btn-ghost" type="button" data-act="reset-no">Keep it</button>'; }
      else if (act === 'reset-yes') { Store.reset(); renderHome(); toast('Progress erased.'); }
      else if (act === 'reset-no') { renderProgress(); }
      else if (act === 'odd-next') { oddIdx++; renderOdd(); }
      return;
    }
    var q = t.getAttribute('data-q');
    if (q) {
      if (q === 'start') Quiz.start();
      else if (q === 'next') { if (Quiz.st.over) Quiz.renderOver(); else Quiz.next(); }
      else if (q === 'quit') Quiz.quit();
      else if (q === 'again') Quiz.start();
      else if (q === 'setup') { Quiz.st = null; Quiz.renderSetup(); }
      else if (q === 'clear-set') { Quiz.cfg.custom = null; Quiz.renderSetup(); }
      else if (q === 'drill') {
        var seen = {}, codes = Quiz.st.missed.map(function (m) { return m.c; }).filter(function (c) { if (seen[c]) return false; seen[c] = 1; return true; });
        Cards.cfg.custom = { id: 'missed', title: 'Flags you missed', codes: codes }; Cards.auto = true; go('flashcards');
      }
      return;
    }
    if (t.hasAttribute('data-i') && t.closest('#v-quiz')) { Quiz.answer(+t.getAttribute('data-i')); return; }
    var c = t.getAttribute('data-c');
    if (c) {
      if (c === 'start') Cards.start();
      else if (c === 'flip') Cards.flip();
      else if (c === 'end') { Cards.st.done = true; Cards.st.ended = true; Cards.renderDone(); }
      else if (c === 'again') { Cards.start(); }
      else if (c === 'setup') { Cards.st = null; Cards.cfg.custom = null; Cards.renderSetup(); }
      else if (c === 'clear-set') { Cards.cfg.custom = null; Cards.renderSetup(); }
      return;
    }
    if (t.hasAttribute('data-g') && t.closest('#fc-actions')) { Cards.grade(t.getAttribute('data-g') === '1'); }
  });
  document.addEventListener('click', function (e) {
    var card = e.target.closest('#fc-card');
    if (card && !e.target.closest('button,a')) Cards.flip();
  });

  var dlgEl = $('#dlg');
  $('#dlg-close').addEventListener('click', function () { dlgEl.close(); });
  $('#dlg-prev').addEventListener('click', function () { step(-1); });
  $('#dlg-next').addEventListener('click', function () { step(1); });
  dlgEl.addEventListener('click', function (e) { if (e.target === dlgEl) dlgEl.close(); });
  dlgEl.addEventListener('close', function () {
    if (current === 'start') renderHome();
    if (current === 'explore') renderExplore();
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    var onControl = !!e.target.closest('button,a,[role="button"]');
    if (dlgEl.open) {
      if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
      return;
    }
    if (current === 'quiz' && Quiz.st && Quiz.view === 'game') {
      if (/^[1-4]$/.test(e.key) && !Quiz.st.answered) { Quiz.answer(+e.key - 1); e.preventDefault(); return; }
      if (e.key === 'Enter' && Quiz.st.answered && !onControl) { if (Quiz.st.over) Quiz.renderOver(); else Quiz.next(); e.preventDefault(); return; }
    }
    if (current === 'flashcards' && Cards.st && Cards.view === 'card') {
      if (e.key === ' ' && (!onControl || e.target.id === 'fc-card')) { Cards.flip(); e.preventDefault(); return; }
      if (e.key === 'Enter' && e.target.id === 'fc-card') { Cards.flip(); e.preventDefault(); return; }
      if (Cards.st.flipped && (e.key === '1' || e.key === 'ArrowLeft')) { Cards.grade(false); e.preventDefault(); return; }
      if (Cards.st.flipped && (e.key === '2' || e.key === 'ArrowRight')) { Cards.grade(true); e.preventDefault(); return; }
    }
    if (current === 'explore' && e.key === '/') { $('#ex-q').focus(); e.preventDefault(); }
  });

  Store.onChange(function () {
    if ($('#dlg').open) return;
    if (current === 'start') { renderProgress(); renderReview(); }
  });

  /* ================= theme (dark by default, remembered on this device) ================= */
  var THEME_KEY = 'hoistfly.theme';
  function savedTheme() { try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } }
  function applyTheme(t, remember) {
    document.documentElement.setAttribute('data-hf-theme', t);
    $$('[data-theme-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-set') === t)); });
    if (remember) { try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* storage unavailable: choice lasts for this visit */ } }
  }
  $$('[data-theme-set]').forEach(function (b) { b.addEventListener('click', function () { applyTheme(b.getAttribute('data-theme-set'), true); }); });
  applyTheme(savedTheme(), false);

  /* ================= boot ================= */
  setupExplore();
  window.addEventListener('hashchange', route);
  route();
  Store.connect();
})();
