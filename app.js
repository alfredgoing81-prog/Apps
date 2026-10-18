/* Bible app UI. All personal data stays in localStorage on this device. */
(function () {
  'use strict';
  const C = window.BibleCore;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const KEY = 'kjv-bible-app:v1';
  // Reading place is its own key so other pages cannot move it.
  const READ_KEY = 'kjv-bible-app:reading-place';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let BOOKS = [], NAMES = [], IDX = null;
  let D = load();
  let reading = loadReading();
  let cur = { b: reading.b, c: reading.c };
  let view = 'home';
  let peek = null;
  let ignoreScroll = false;
  let saveTimer = 0;

  const PEEK_FROM = {
    verse: 'the verse of the day',
    now: 'the verse for right now',
    study: "today's study",
    prayer: "today's prayer",
    plan: 'your reading plan',
    journal: 'your journal'
  };

  // ---------- storage ----------
  function load() { try { return C.sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return C.emptyData(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { toast('Could not save. Storage may be full.'); } }
  function loadReading() {
    try {
      const r = JSON.parse(localStorage.getItem(READ_KEY) || 'null');
      if (r && Number.isInteger(r.b) && Number.isInteger(r.c)) {
        return {
          b: r.b,
          c: r.c,
          v: Number.isInteger(r.v) && r.v > 0 ? r.v : 1,
          offset: Number.isFinite(+r.offset) ? Math.round(+r.offset) : 0
        };
      }
    } catch (e) { /* use the older chapter, or John 1 */ }
    if (D.last && Number.isInteger(D.last.b) && Number.isInteger(D.last.c)) return { b: D.last.b, c: D.last.c, v: 1, offset: 0 };
    return { b: 42, c: 1, v: 1, offset: 0 };
  }
  function saveReading() {
    try { localStorage.setItem(READ_KEY, JSON.stringify(reading)); }
    catch (e) { toast('Could not save your place. Storage may be full.'); }
  }
  function clampReading() {
    if (!BOOKS.length) return;
    if (!BOOKS[reading.b]) reading = { b: Math.min(42, BOOKS.length - 1), c: 1, v: 1, offset: 0 };
    const bk = BOOKS[reading.b];
    if (reading.c < 1 || reading.c > bk.chapters.length) reading.c = 1;
    const len = bk.chapters[reading.c - 1].length;
    if (!reading.v || reading.v < 1) reading.v = 1;
    if (reading.v > len) reading.v = len;
    if (!Number.isFinite(reading.offset) || Math.abs(reading.offset) > 8000) reading.offset = 0;
  }
  function placeLabel() {
    const bk = BOOKS[reading.b];
    if (!bk) return '';
    return bk.name + ' ' + reading.c + ':' + (reading.v || 1);
  }

  // ---------- helpers ----------
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  function vkey(b, c, v) { return b + '.' + c + '.' + v; }
  function parseKey(k) { const [b, c, v] = k.split('.').map(Number); return { b, c, v }; }
  function verseText(b, c, v) { const ch = BOOKS[b] && BOOKS[b].chapters[c - 1]; return ch ? ch[v - 1] : ''; }
  function label(b, c, v, v2) { return C.refLabel(NAMES, b, c, v, v2); }
  function fmtDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  async function copyText(text) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); toast('Copied'); return; } } catch (e) { /* fall through */ }
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copied'); } catch (e) { toast('Copy not available'); }
    ta.remove();
  }
  async function shareText(text) {
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    copyText(text);
  }
  const quote = (text, ref) => '"' + text + '" (' + ref + ' KJV)';

  function closeDlg(d) { if (d.open) d.close(); }
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d) closeDlg(d); if (e.target.closest('[data-close]')) closeDlg(d); });
  });

  // ---------- data loading ----------
  async function loadBible() {
    try {
      const r = await fetch('kjv.json');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      // Opened as a local file (file://): browsers block fetch, so load the same text as a script.
      return new Promise((res, rej) => {
        if (window.KJV_DATA) return res(window.KJV_DATA);
        const s = document.createElement('script'); s.src = 'kjv.js';
        s.onload = () => window.KJV_DATA ? res(window.KJV_DATA) : rej(new Error('No data'));
        s.onerror = () => rej(new Error('Could not load kjv.json or kjv.js'));
        document.head.appendChild(s);
      });
    }
  }

  // ---------- navigation ----------
  function setHash(h) { if (location.hash !== h) history.replaceState(null, '', h); }
  function paint(name) {
    view = name;
    $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + name));
    $$('nav.tabs button').forEach(x => x.classList.toggle('on', x.dataset.go === name || (name === 'settings' && x.dataset.go === 'saved')));
  }
  function go(name) {
    if (name === 'read') { enterReading(); return; }
    if (view === 'read' && !peek) capturePlace();
    peek = null;
    paint(name);
    if (name === 'home') renderHome();
    if (name === 'plan') renderPlan();
    if (name === 'journal') renderJournal();
    if (name === 'saved') renderSaved();
    if (name === 'settings') renderSettings();
    if (name === 'study') renderStudy();
    if (name === 'prayer') renderPrayer();
    if (name === 'search') setTimeout(() => { if (!$('#q').value) $('#q').focus(); }, 50);
    window.scrollTo(0, 0);
    setHash('#' + name);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });

  function flashVerse(v) {
    const el = document.getElementById('v' + v);
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
  function capturePlace() {
    if (view !== 'read' || peek || ignoreScroll || !BOOKS[cur.b]) return;
    const verses = document.querySelectorAll('#chapter .vs');
    if (!verses.length) return;
    const bar = document.querySelector('.rbar');
    const topLine = bar ? bar.getBoundingClientRect().bottom : 0;
    let v = 1, offset = 0, found = false;
    for (let i = 0; i < verses.length; i++) {
      const rect = verses[i].getBoundingClientRect();
      if (rect.bottom > topLine + 1) {
        v = +verses[i].dataset.v;
        offset = Math.round(rect.top - topLine);
        found = true;
        break;
      }
    }
    if (!found) {
      const el = verses[verses.length - 1];
      v = +el.dataset.v;
      offset = 0;
    }
    reading = { b: cur.b, c: cur.c, v: v || 1, offset };
    saveReading();
  }
  function restorePlace(after) {
    clearTimeout(saveTimer);
    ignoreScroll = true;
    const apply = () => {
      const el = document.getElementById('v' + (reading.v || 1));
      if (!el) { window.scrollTo(0, 0); return false; }
      const bar = document.querySelector('.rbar');
      const topLine = bar ? bar.getBoundingClientRect().bottom : 0;
      const delta = el.getBoundingClientRect().top - topLine - (reading.offset || 0);
      if (Math.abs(delta) > 1) window.scrollTo(0, Math.max(0, window.scrollY + delta));
      const now = el.getBoundingClientRect().top - (bar ? bar.getBoundingClientRect().bottom : 0) - (reading.offset || 0);
      return Math.abs(now) <= 2;
    };
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(() => {
        const aligned = apply();
        ignoreScroll = false;
        // Only rewrite the saved place when the verse actually landed. A short
        // layout must not replace it with whatever happens to sit at the top.
        if (aligned && view === 'read' && !peek) capturePlace();
        if (after) after();
      });
    });
  }
  function updatePeekBar() {
    const bar = $('#peekBar');
    if (!bar) return;
    if (!peek || view !== 'read') { bar.classList.remove('on'); return; }
    const rbar = $('.rbar');
    if (rbar) bar.style.top = Math.ceil(rbar.offsetHeight) + 'px';
    $('#peekMsg').textContent = 'Opened from ' + (PEEK_FROM[peek.from] || 'another page') + '. Your saved place is still ' + placeLabel() + '.';
    bar.classList.add('on');
  }
  // Real reading. This is the only path that moves the saved place.
  function readAt(b, c, v, flash) {
    b = +b; c = +c || 1; v = +v || 1;
    const bk = BOOKS[b];
    if (!bk || c < 1 || c > bk.chapters.length) return;
    const len = bk.chapters[c - 1].length;
    if (v < 1) v = 1;
    if (v > len) v = len;
    clearTimeout(saveTimer);
    peek = null;
    cur = { b, c };
    reading = { b, c, v: flash ? v : 1, offset: 0 };
    saveReading();
    paint('read');
    renderChapter();
    updatePeekBar();
    setHash('#read');
    if (!flash) {
      ignoreScroll = true;
      window.scrollTo(0, 0);
      requestAnimationFrame(() => { ignoreScroll = false; capturePlace(); });
      return;
    }
    restorePlace(() => flashVerse(v));
  }
  function enterReading() {
    if (view === 'read' && !peek) capturePlace();
    peek = null;
    clampReading();
    cur = { b: reading.b, c: reading.c };
    paint('read');
    renderChapter();
    updatePeekBar();
    restorePlace();
    setHash('#read');
  }
  // A visit from another page. Scroll and chapter changes here do not touch the saved place.
  function openPeek(b, c, v, from) {
    b = +b; c = +c || 1; v = +v || 0;
    const bk = BOOKS[b];
    if (!bk || c < 1 || c > bk.chapters.length) return;
    const len = bk.chapters[c - 1].length;
    if (v < 0) v = 0;
    if (v > len) v = v ? len : 0;
    clearTimeout(saveTimer);
    if (view === 'read' && !peek) capturePlace();
    peek = { from: PEEK_FROM[from] ? from : 'verse', b, c, v };
    cur = { b, c };
    paint('read');
    renderChapter();
    updatePeekBar();
    setHash('#peek/' + b + '/' + c + '/' + v + '/' + peek.from);
    ignoreScroll = true;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      if (v) {
        const el = document.getElementById('v' + v);
        if (el) { el.scrollIntoView({ block: 'center' }); flashVerse(v); }
      }
      requestAnimationFrame(() => { ignoreScroll = false; });
    });
  }
  function goChapter(b, c) {
    if (peek) openPeek(b, c, 0, peek.from);
    else readAt(b, c, 1, false);
  }

  function todayEntry() {
    const Daily = window.BibleDaily;
    if (!Daily || !Daily.STUDIES || !Daily.STUDIES.length) return null;
    return Daily.forDate(C.dayNumber(new Date()));
  }
  function firstSentence(text) {
    const m = String(text || '').match(/^.+?[.!?](?:\s|$)/);
    return m ? m[0].trim() : String(text || '');
  }
  function paragraphs(el, text) {
    if (!el) return;
    const parts = String(text || '').split(/(?<=[.!?])\s+/).filter(Boolean);
    el.innerHTML = parts.map(s => '<p>' + esc(s) + '</p>').join('');
  }
  function longDate() {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // ---------- verse for right now ----------
  // Clock-based. Nothing here is stored, and opening it uses the peek reader,
  // so the saved place, daily study, and daily prayer stay where they are.
  let nowSlotShown = null;
  let nowTimer = 0;
  let nowPoll = 0;
  function studyRefNow() {
    const day = todayEntry();
    return day && day.study ? day.study.ref : '';
  }
  function nextVerseNote(now, next) {
    const time = next.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const sameDay = now.getFullYear() === next.getFullYear() && now.getMonth() === next.getMonth() && now.getDate() === next.getDate();
    return 'New verse every 90 minutes · Next at ' + time + (sameDay ? '' : ' tomorrow');
  }
  function renderNowVerse() {
    if (!BOOKS.length || !C.verseForNow) return;
    const now = new Date();
    const picked = C.verseForNow(now, null, studyRefNow());
    if (!picked || picked.slot === nowSlotShown) return;
    const r = C.resolveRef(BOOKS, picked.ref);
    nowSlotShown = picked.slot;
    const note = $('#nowNote'), text = $('#nowText'), ref = $('#nowRef');
    if (note) note.textContent = nextVerseNote(now, picked.nextAt);
    if (text) text.textContent = r ? r.text : '';
    if (ref) ref.textContent = r ? r.label : picked.ref;
    const copy = $('#nowCopy'), open = $('#nowOpen');
    if (copy) copy.onclick = () => r && copyText(quote(r.text, r.label));
    if (open) open.onclick = () => r && openPeek(r.b, r.c, r.v, 'now');
  }
  function watchNowVerse() {
    renderNowVerse();
    clearTimeout(nowTimer);
    clearInterval(nowPoll);
    if (!C.nextVerseAt) return;
    const wait = Math.max(500, C.nextVerseAt(new Date()).getTime() - Date.now() + 400);
    nowTimer = setTimeout(() => { nowSlotShown = null; watchNowVerse(); }, Math.min(wait, 2147483647));
    nowPoll = setInterval(() => {
      if (!BOOKS.length || !C.nowSlot) return;
      if (C.nowSlot(new Date()) !== nowSlotShown) renderNowVerse();
    }, 30000);
  }

  // ---------- home ----------
  function renderHome() {
    renderNowVerse();
    const ref = C.dailyVerseRef(new Date());
    const r = C.resolveRef(BOOKS, ref);
    $('#dvDate').textContent = longDate();
    $('#dvText').textContent = r ? r.text : '';
    $('#dvRef').textContent = r ? r.label : '';
    $('#dvCopy').onclick = () => r && copyText(quote(r.text, r.label));
    $('#dvShare').onclick = () => r && shareText(quote(r.text, r.label));
    $('#dvOpen').onclick = () => r && openPeek(r.b, r.c, r.v, 'verse');
    const hint = verseText(reading.b, reading.c, reading.v || 1);
    $('#contRef').textContent = placeLabel();
    $('#contHint').textContent = hint ? (hint.length > 110 ? hint.slice(0, 110) + '…' : hint) : 'Your place is saved on this device.';
    const day = todayEntry();
    if (day) {
      const sr = C.resolveRef(BOOKS, day.study.ref);
      $('#homeStudyRef').textContent = sr ? sr.label : day.study.ref;
      $('#homeStudyTease').textContent = firstSentence(day.study.message);
      $('#homePrayerTease').textContent = firstSentence(day.prayer);
    }
    const hp = $('#homePlan');
    const id = D.activePlan, p = id && D.plans[id];
    if (!p) { hp.innerHTML = '<h2>Reading plan</h2><div class="row"><div class="grow small">Read the Bible in a year, or the Gospels and Psalms in 90 days.</div><button class="primary" data-go="plan">Choose</button></div>'; return; }
    const plan = C.buildPlan(BOOKS, id), i = C.planDayIndex(p.start);
    if (i < 0) { hp.innerHTML = '<h2>' + esc(C.PLANS[id].name) + '</h2><div class="small">Starts ' + esc(fmtDate(p.start)) + '.</div>'; return; }
    if (i >= plan.length) { hp.innerHTML = '<h2>' + esc(C.PLANS[id].name) + '</h2><div class="row"><div class="grow">Plan period finished. ' + countDone(p, plan.length) + ' of ' + plan.length + ' days read.</div><button data-go="plan">View</button></div>'; return; }
    const done = !!p.done[i];
    hp.innerHTML = '<h2>Today\'s reading · Day ' + (i + 1) + ' of ' + plan.length + '</h2>' +
      '<div style="font-size:18px;font-weight:700">' + esc(C.describeReading(BOOKS, plan[i])) + '</div>' +
      '<div class="chips" id="hpChips"></div>' +
      '<div class="btns grow"><button id="hpDone" class="' + (done ? '' : 'primary') + '">' + (done ? '✓ Done today' : 'Mark today done') + '</button><button data-go="plan">Plan</button></div>';
    chapterChips($('#hpChips'), plan[i]);
    $('#hpDone').onclick = () => { toggleDay(id, i); renderHome(); };
  }
  function countDone(p, n) { let k = 0; for (let i = 0; i < n; i++) if (p.done[i]) k++; return k; }
  function chapterChips(el, chapters) {
    chapters.forEach(({ b, c }) => { const bt = document.createElement('button'); bt.textContent = C.SHORT[b] + ' ' + c; bt.onclick = () => openPeek(b, c, 0, 'plan'); el.appendChild(bt); });
  }

  // ---------- reader ----------
  function applyFont() { document.documentElement.style.setProperty('--font', D.settings.font + 'px'); }
  function setFont(n) {
    D.settings.font = Math.max(14, Math.min(34, n));
    applyFont();
    save();
    if (view !== 'read') return;
    if (peek && peek.v) {
      const el = document.getElementById('v' + peek.v);
      if (el) el.scrollIntoView({ block: 'center' });
    } else if (!peek) restorePlace();
  }
  function noteVerses(b, c) {
    const s = new Set();
    D.journal.forEach(j => { if (!j.ref) return; const r = C.parseRef(j.ref, NAMES); if (r && r.b === b && r.c === c && r.v) for (let v = r.v; v <= (r.v2 || r.v); v++) s.add(v); });
    return s;
  }
  function renderChapter() {
    const bk = BOOKS[cur.b]; if (!bk) return;
    if (cur.c < 1 || cur.c > bk.chapters.length) cur.c = 1;
    $('#pickBtn').textContent = bk.name + ' ' + cur.c;
    const notes = noteVerses(cur.b, cur.c);
    const html = ['<h2>' + esc(bk.name) + ' · Chapter ' + cur.c + '</h2>'];
    bk.chapters[cur.c - 1].forEach((t, i) => {
      const v = i + 1, k = vkey(cur.b, cur.c, v), cls = ['vs'];
      if (D.highlights[k]) cls.push('hl-' + D.highlights[k]);
      if (D.bookmarks[k]) cls.push('bm');
      if (notes.has(v)) cls.push('note');
      html.push('<span class="' + cls.join(' ') + '" id="v' + v + '" data-v="' + v + '"><sup>' + v + '</sup>' + esc(t) + '</span>');
    });
    $('#chapter').innerHTML = html.join('');
    const atStart = cur.b === 0 && cur.c === 1, atEnd = cur.b === BOOKS.length - 1 && cur.c === bk.chapters.length;
    ['#prevCh', '#prevCh2'].forEach(s => $(s).disabled = atStart);
    ['#nextCh', '#nextCh2'].forEach(s => $(s).disabled = atEnd);
  }
  function step(d) {
    let b = cur.b, c = cur.c + d;
    if (c < 1) { if (b === 0) return; b--; c = BOOKS[b].chapters.length; }
    else if (c > BOOKS[b].chapters.length) { if (b === BOOKS.length - 1) return; b++; c = 1; }
    goChapter(b, c);
  }
  $('#prevCh').onclick = $('#prevCh2').onclick = () => step(-1);
  $('#nextCh').onclick = $('#nextCh2').onclick = () => step(1);
  $('#fontDown').onclick = () => setFont(D.settings.font - 1);
  $('#fontUp').onclick = () => setFont(D.settings.font + 1);
  document.addEventListener('keydown', e => {
    if (view !== 'read' || document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1);
  });

  // Book / chapter picker
  function openPicker() {
    const dlg = $('#pickDlg'), body = $('#pickBody');
    $('#pickTitle').textContent = 'Choose a book';
    const sec = (title, from, to) => '<h2 class="small" style="margin:12px 0 8px;text-transform:uppercase;letter-spacing:.07em">' + title + '</h2><div class="grid">' +
      NAMES.slice(from, to).map((n, i) => '<button data-b="' + (from + i) + '" class="' + (from + i === cur.b ? 'cur' : '') + '">' + esc(C.SHORT[from + i]) + '</button>').join('') + '</div>';
    body.innerHTML = sec('Old Testament', 0, 39) + sec('New Testament', 39, 66);
    body.onclick = e => {
      const bb = e.target.closest('[data-b]'); if (bb) { showChapters(+bb.dataset.b); return; }
      const cb = e.target.closest('[data-c]'); if (cb) { closeDlg(dlg); goChapter(+cb.dataset.bk, +cb.dataset.c); }
    };
    if (!dlg.open) dlg.showModal();
    function showChapters(b) {
      const n = BOOKS[b].chapters.length;
      if (n === 1) { closeDlg(dlg); goChapter(b, 1); return; }
      $('#pickTitle').textContent = NAMES[b];
      let h = '<button class="link" id="pickBack">‹ All books</button><div class="grid ch" style="margin-top:6px">';
      for (let c = 1; c <= n; c++) h += '<button data-bk="' + b + '" data-c="' + c + '" class="' + (b === cur.b && c === cur.c ? 'cur' : '') + '">' + c + '</button>';
      body.innerHTML = h + '</div>';
      $('#pickBack').onclick = openPicker;
      dlg.scrollTop = 0;
    }
  }
  $('#pickBtn').onclick = openPicker;

  // Verse actions
  let sel = null;
  $('#chapter').addEventListener('click', e => {
    const el = e.target.closest('.vs'); if (!el) return;
    openVerse(cur.b, cur.c, +el.dataset.v);
  });
  function openVerse(b, c, v) {
    sel = { b, c, v, k: vkey(b, c, v), ref: label(b, c, v), text: verseText(b, c, v) };
    $('#vRef').textContent = sel.ref;
    $('#vText').textContent = sel.text;
    refreshVerseDlg();
    $('#verseDlg').showModal();
  }
  function refreshVerseDlg() {
    $('#vBm').textContent = D.bookmarks[sel.k] ? '★ Bookmarked' : '☆ Bookmark';
    $$('#vColors button').forEach(b => b.style.outline = (D.highlights[sel.k] || '') === b.dataset.c ? '3px solid var(--accent)' : 'none');
    const linked = D.journal.filter(j => { const r = j.ref && C.parseRef(j.ref, NAMES); return r && r.b === sel.b && r.c === sel.c && r.v && sel.v >= r.v && sel.v <= (r.v2 || r.v); });
    $('#vNotes').innerHTML = linked.length ? '<label>Your notes on this verse</label>' + linked.map(j => '<div class="item" data-j="' + esc(j.id) + '"><b>' + esc(j.title || '(untitled)') + '</b><div class="meta">' + esc(fmtDate(j.date)) + '</div></div>').join('') : '';
  }
  $('#vNotes').onclick = e => { const it = e.target.closest('[data-j]'); if (it) { closeDlg($('#verseDlg')); openJournal(it.dataset.j); } };
  $('#vBm').onclick = () => { if (D.bookmarks[sel.k]) delete D.bookmarks[sel.k]; else D.bookmarks[sel.k] = Date.now(); save(); refreshVerseDlg(); renderChapter(); toast(D.bookmarks[sel.k] ? 'Bookmarked' : 'Bookmark removed'); };
  $('#vColors').onclick = e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    if (b.dataset.c) D.highlights[sel.k] = b.dataset.c; else delete D.highlights[sel.k];
    save(); refreshVerseDlg(); renderChapter();
  };
  $('#vCopy').onclick = () => copyText(quote(sel.text, sel.ref));
  $('#vShare').onclick = () => shareText(quote(sel.text, sel.ref));
  $('#vNote').onclick = () => { closeDlg($('#verseDlg')); openJournal(null, { type: 'note', ref: sel.ref }); };

  // ---------- search ----------
  let scope = 'all', lastQ = '';
  $('#scopeSeg').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; scope = b.dataset.s; $$('#scopeSeg button').forEach(x => x.classList.toggle('on', x === b)); if (lastQ) runSearch(lastQ); };
  $('#searchForm').onsubmit = e => { e.preventDefault(); runSearch($('#q').value); $('#q').blur(); };
  function hlTerms(text, terms) {
    const pats = terms.slice().sort((a, b) => b.length - a.length).map(t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&#39;/g, "(?:&#39;|’)"));
    if (!pats.length) return esc(text);
    return esc(text).replace(new RegExp('(' + pats.join('|') + ')', 'gi'), '<mark>$1</mark>');
  }
  function runSearch(q, limit) {
    lastQ = q = q.trim();
    const out = $('#sResults'), cnt = $('#sCount');
    if (!q) { out.innerHTML = ''; cnt.textContent = ''; return; }
    // A reference like "John 3:16" or "Psalm 23" jumps straight there.
    const r = C.parseRef(q, NAMES);
    let refHtml = '';
    if (r && C.resolveRef(BOOKS, r)) {
      const rr = C.resolveRef(BOOKS, r);
      refHtml = '<div class="item" data-b="' + rr.b + '" data-c="' + rr.c + '" data-v="' + (r.v || '') + '"><div class="ref">Go to ' + esc(rr.label) + '</div><div class="txt">' + esc(rr.verses[0].t) + (rr.verses.length > 1 ? ' …' : '') + '</div></div>';
    }
    if (!IDX) IDX = C.buildSearchIndex(BOOKS);
    const t0 = performance.now();
    const res = C.search(IDX, q, { scope, limit: limit || 300 });
    const ms = Math.round(performance.now() - t0);
    cnt.textContent = res.total ? res.total.toLocaleString() + ' verse' + (res.total === 1 ? '' : 's') + ' found' + (res.total > res.results.length ? ', showing first ' + res.results.length : '') + ' (' + ms + ' ms)' : (refHtml ? '' : 'No verses found.');
    out.innerHTML = refHtml + res.results.map(e => '<div class="item" data-b="' + e.b + '" data-c="' + e.c + '" data-v="' + e.v + '"><div class="ref">' + esc(label(e.b, e.c, e.v)) + '</div><div class="txt">' + hlTerms(e.t, res.terms) + '</div></div>').join('') +
      (res.total > res.results.length ? '<div class="btns"><button id="sMore" style="width:100%">Show more</button></div>' : '');
    const more = $('#sMore'); if (more) more.onclick = () => runSearch(q, (limit || 300) + 500);
  }
  $('#sResults').onclick = e => { const it = e.target.closest('[data-b]'); if (it) readAt(+it.dataset.b, +it.dataset.c, +it.dataset.v || 1, true); };

  // ---------- reading plan ----------
  function toggleDay(id, i) {
    const p = D.plans[id]; if (!p) return;
    if (p.done[i]) delete p.done[i]; else p.done[i] = Date.now();
    save();
  }
  let showAllDays = false;
  function renderPlan() {
    const body = $('#planBody');
    const id = D.activePlan;
    const chooser = '<div class="card"><h2>' + (id ? 'Switch plan' : 'Choose a plan') + '</h2>' +
      Object.keys(C.PLANS).map(k => '<div class="item" data-plan="' + k + '"' + (k === id ? ' style="outline:2px solid var(--accent)"' : '') + '><div class="ref">' + esc(C.PLANS[k].name) + (D.plans[k] ? ' <span class="badge">' + countDone(D.plans[k], C.PLANS[k].days) + '/' + C.PLANS[k].days + '</span>' : '') + '</div><div class="meta">' + esc(C.PLANS[k].desc) + '</div></div>').join('') +
      '<label for="planStart">Start date</label><input type="date" id="planStart" value="' + esc(id ? D.plans[id].start : C.todayIso()) + '">' +
      '<p class="small">Tap a plan to make it active. Changing the start date keeps the days you have checked off.</p></div>';
    if (!id) { body.innerHTML = chooser; wirePlanChooser(); return; }
    const p = D.plans[id], plan = C.buildPlan(BOOKS, id), n = plan.length;
    const i = C.planDayIndex(p.start), done = countDone(p, n), pct = Math.round(done / n * 100);
    const streak = C.planStreak(p.done, i, n);
    let today = '';
    if (i < 0) today = '<p>This plan starts on ' + esc(fmtDate(p.start)) + '.</p>';
    else if (i >= n) today = '<p>The plan period is over. You read ' + done + ' of ' + n + ' days.</p>';
    else today = '<h2 style="margin-top:14px">Today · Day ' + (i + 1) + '</h2><div style="font-size:18px;font-weight:700">' + esc(C.describeReading(BOOKS, plan[i])) + '</div><div class="chips" id="todayChips"></div>' +
      '<div class="btns grow"><button id="todayDone" class="' + (p.done[i] ? '' : 'primary') + '">' + (p.done[i] ? '✓ Done' : 'Mark today done') + '</button></div>';
    // Show behind days (unchecked before today) up front.
    const behind = []; for (let d = 0; d < Math.min(i, n); d++) if (!p.done[d]) behind.push(d);
    body.innerHTML = '<div class="card"><h2>' + esc(C.PLANS[id].name) + '</h2><div class="small">Started ' + esc(fmtDate(p.start)) + '</div>' +
      '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
      '<div class="stats"><div class="stat"><div class="v">' + pct + '%</div><div class="k">complete</div></div><div class="stat"><div class="v">' + done + '/' + n + '</div><div class="k">days read</div></div><div class="stat"><div class="v">' + streak + '</div><div class="k">day streak</div></div></div>' +
      today + '</div>' +
      (behind.length ? '<div class="card"><h2>Catch up (' + behind.length + ')</h2><div id="behindList"></div></div>' : '') +
      '<div class="card"><h2>All days</h2><div id="dayList"></div><div class="btns"><button id="toggleDays" style="width:100%">' + (showAllDays ? 'Show fewer days' : 'Show all ' + n + ' days') + '</button></div></div>' + chooser;
    if (i >= 0 && i < n) { chapterChips($('#todayChips'), plan[i]); $('#todayDone').onclick = () => { toggleDay(id, i); renderPlan(); }; }
    const dayRow = d => '<div class="day' + (d === i ? ' today' : '') + '"><input type="checkbox" data-d="' + d + '"' + (p.done[d] ? ' checked' : '') + ' aria-label="Day ' + (d + 1) + ' done"><div class="grow" data-open="' + d + '"><b>Day ' + (d + 1) + '</b> <span class="small">' + esc(fmtDate(C.dayNumberToIso(C.isoToDayNumber(p.start) + d))) + '</span><div>' + esc(C.describeReading(BOOKS, plan[d])) + '</div></div></div>';
    if (behind.length) $('#behindList').innerHTML = behind.slice(0, 30).map(dayRow).join('') + (behind.length > 30 ? '<p class="small">…and ' + (behind.length - 30) + ' more below.</p>' : '');
    let from = 0, to = n;
    if (!showAllDays) { const c = Math.max(0, Math.min(i, n - 1)); from = Math.max(0, c - 3); to = Math.min(n, c + 8); }
    let rows = ''; for (let d = from; d < to; d++) rows += dayRow(d);
    $('#dayList').innerHTML = rows;
    $('#toggleDays').onclick = () => { showAllDays = !showAllDays; renderPlan(); };
    body.querySelectorAll('input[data-d]').forEach(cb => cb.onchange = () => { toggleDay(id, +cb.dataset.d); renderPlan(); });
    body.querySelectorAll('[data-open]').forEach(el => el.onclick = () => { const ch = plan[+el.dataset.open][0]; if (ch) openPeek(ch.b, ch.c, 0, 'plan'); });
    wirePlanChooser();
  }
  function wirePlanChooser() {
    $$('#planBody [data-plan]').forEach(el => el.onclick = () => {
      const k = el.dataset.plan, start = $('#planStart').value || C.todayIso();
      if (!D.plans[k]) D.plans[k] = { start, done: {} };
      D.activePlan = k; save(); renderPlan(); toast(C.PLANS[k].name + ' is active');
    });
    $('#planStart').onchange = e => {
      const id = D.activePlan; if (!id || !e.target.value) return;
      D.plans[id].start = e.target.value; save(); renderPlan();
    };
  }

  // ---------- journal ----------
  let jFilter = 'all', editing = null, jType = 'prayer';
  $('#jSeg').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; jFilter = b.dataset.f; $$('#jSeg button').forEach(x => x.classList.toggle('on', x === b)); renderJournal(); };
  $('#jSearch').oninput = () => renderJournal();
  $('#jNew').onclick = () => openJournal(null, { type: 'prayer' });
  $('#homeNewPrayer').onclick = () => { go('journal'); openJournal(null, { type: 'prayer' }); };
  function renderJournal() {
    const q = $('#jSearch').value.trim().toLowerCase();
    let list = D.journal.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.updated || 0) - (a.updated || 0));
    if (jFilter === 'prayer') list = list.filter(j => j.type === 'prayer' && !j.answered);
    if (jFilter === 'answered') list = list.filter(j => j.type === 'prayer' && j.answered);
    if (jFilter === 'note') list = list.filter(j => j.type === 'note');
    if (q) list = list.filter(j => ((j.title || '') + ' ' + (j.body || '') + ' ' + (j.ref || '')).toLowerCase().includes(q));
    $('#jList').innerHTML = list.length ? list.map(j => '<div class="item" data-j="' + esc(j.id) + '"><div class="row"><b class="grow">' + esc(j.title || '(untitled)') + '</b>' +
      (j.type === 'prayer' ? (j.answered ? '<span class="badge ok">Answered</span>' : '<span class="badge">Prayer</span>') : '<span class="badge">Note</span>') + '</div>' +
      '<div class="meta">' + esc(fmtDate(j.date)) + (j.ref ? ' · <button type="button" class="link" data-jref="' + esc(j.ref) + '">' + esc(j.ref) + '</button>' : '') + '</div>' +
      (j.body ? '<div class="meta" style="color:var(--text);white-space:pre-wrap">' + esc(j.body.length > 180 ? j.body.slice(0, 180) + '…' : j.body) + '</div>' : '') + '</div>').join('')
      : '<div class="empty">' + (D.journal.length ? 'No entries match.' : 'No entries yet. Tap “+ New” to write a prayer or a note.') + '</div>';
  }
  $('#jList').onclick = e => {
    const refBtn = e.target.closest('[data-jref]');
    if (refBtn) {
      const r = C.resolveRef(BOOKS, refBtn.dataset.jref);
      if (r) openPeek(r.b, r.c, r.v, 'journal');
      else toast('Reference not recognised');
      return;
    }
    const it = e.target.closest('[data-j]'); if (it) openJournal(it.dataset.j);
  };
  function setJType(t) { jType = t; $$('#jType button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); $('#jAnsweredRow').style.display = t === 'prayer' ? 'flex' : 'none'; }
  $('#jType').onclick = e => { const b = e.target.closest('[data-t]'); if (b) setJType(b.dataset.t); };
  function refPreview() {
    const v = $('#jRef').value.trim(), el = $('#jRefPreview');
    if (!v) { el.textContent = ''; return; }
    const r = C.resolveRef(BOOKS, v);
    el.innerHTML = r ? '<span class="dv-ref">' + esc(r.label) + '</span> ' + esc(r.text.length > 160 ? r.text.slice(0, 160) + '…' : r.text) : '<span style="color:var(--red)">Reference not recognised (try “John 3:16”).</span>';
  }
  $('#jRef').oninput = refPreview;
  function openJournal(id, preset) {
    editing = id ? D.journal.find(j => j.id === id) : null;
    const j = editing || Object.assign({ type: 'prayer', title: '', body: '', ref: '', date: C.todayIso(), answered: false }, preset || {});
    $('#jDlgTitle').textContent = editing ? 'Edit entry' : (j.type === 'note' ? 'New note' : 'New prayer');
    setJType(j.type);
    $('#jTitle').value = j.title || ''; $('#jDate').value = j.date || C.todayIso(); $('#jRef').value = j.ref || ''; $('#jBody').value = j.body || ''; $('#jAnswered').checked = !!j.answered;
    $('#jDelete').style.display = editing ? '' : 'none';
    refPreview();
    $('#jDlg').showModal();
  }
  $('#jForm').onsubmit = e => {
    e.preventDefault();
    let ref = $('#jRef').value.trim();
    if (ref) { const r = C.resolveRef(BOOKS, ref); if (!r) { toast('Check the verse reference'); return; } ref = r.label; }
    const title = $('#jTitle').value.trim(), body = $('#jBody').value.trim();
    if (!title && !body) { toast('Add a title or some text'); return; }
    const now = Date.now();
    const entry = editing || { id: uid(), created: now };
    const wasAnswered = !!entry.answered;
    Object.assign(entry, { type: jType, title, body, ref, date: $('#jDate').value || C.todayIso(), answered: jType === 'prayer' && $('#jAnswered').checked, updated: now });
    if (entry.answered && !wasAnswered) entry.answeredDate = C.todayIso();
    if (!entry.answered) delete entry.answeredDate;
    if (!editing) D.journal.push(entry);
    save(); closeDlg($('#jDlg')); toast('Saved');
    if (view === 'journal') renderJournal(); if (view === 'read') renderChapter(); if (view === 'home') renderHome();
  };
  $('#jDelete').onclick = () => {
    if (!editing || !confirm('Delete this entry? This cannot be undone.')) return;
    D.journal = D.journal.filter(j => j !== editing); save(); closeDlg($('#jDlg')); toast('Deleted');
    if (view === 'journal') renderJournal(); if (view === 'read') renderChapter();
  };

  // ---------- saved ----------
  let savedKind = 'bm';
  $('#savedSeg').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; savedKind = b.dataset.k; $$('#savedSeg button').forEach(x => x.classList.toggle('on', x === b)); renderSaved(); };
  function sortKeys(keys) { return keys.map(parseKey).filter(r => verseText(r.b, r.c, r.v)).sort((a, b) => a.b - b.b || a.c - b.c || a.v - b.v); }
  function renderSaved() {
    const el = $('#savedList');
    const bm = savedKind === 'bm';
    const src = bm ? D.bookmarks : D.highlights;
    let refs = sortKeys(Object.keys(src));
    if (bm) refs = refs.sort((a, b) => (src[vkey(b.b, b.c, b.v)] || 0) - (src[vkey(a.b, a.c, a.v)] || 0));
    el.innerHTML = refs.length ? refs.map(r => {
      const k = vkey(r.b, r.c, r.v);
      return '<div class="item" data-b="' + r.b + '" data-c="' + r.c + '" data-v="' + r.v + '"><div class="row"><div class="ref grow">' + (bm ? '' : '<span class="swatch" style="background:var(--hl-' + esc(src[k]) + ')"></span>') + esc(label(r.b, r.c, r.v)) + '</div><button class="link" data-rm="' + k + '">Remove</button></div><div class="txt">' + esc(verseText(r.b, r.c, r.v)) + '</div></div>';
    }).join('') : '<div class="empty">' + (bm ? 'No bookmarks yet. In the reader, tap a verse and choose Bookmark.' : 'No highlights yet. In the reader, tap a verse and pick a color.') + '</div>';
  }
  $('#savedList').onclick = e => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { e.stopPropagation(); delete (savedKind === 'bm' ? D.bookmarks : D.highlights)[rm.dataset.rm]; save(); renderSaved(); return; }
    const it = e.target.closest('[data-b]'); if (it) readAt(+it.dataset.b, +it.dataset.c, +it.dataset.v || 1, true);
  };

  // ---------- settings ----------
  function applyTheme() {
    document.documentElement.dataset.theme = D.settings.theme === 'light' ? 'light' : 'dark';
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = D.settings.theme === 'light' ? '#f6f3ec' : '#121418';
  }
  function renderSettings() {
    $('#fontRange').value = D.settings.font; $('#fontVal').textContent = D.settings.font;
    $('#fontSample').textContent = (C.resolveRef(BOOKS, 'Psalms 119:105') || {}).text || '';
    $$('#themeSeg button').forEach(b => b.classList.toggle('on', b.dataset.t === D.settings.theme));
    const plans = Object.keys(D.plans).length;
    $('#dataSummary').textContent = 'On this device: ' + Object.keys(D.bookmarks).length + ' bookmarks, ' + Object.keys(D.highlights).length + ' highlights, ' + D.journal.length + ' journal entries, ' + plans + ' reading plan' + (plans === 1 ? '' : 's') + '.';
  }
  $('#fontRange').oninput = e => { setFont(+e.target.value); $('#fontVal').textContent = D.settings.font; };
  $('#themeSeg').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; D.settings.theme = b.dataset.t; save(); applyTheme(); renderSettings(); };
  $('#exportBtn').onclick = () => {
    const data = Object.assign({ app: 'kjv-bible-app', exported: new Date().toISOString() }, D);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bible-app-backup-' + C.todayIso() + '.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Backup file saved');
  };
  let pendingImport = null;
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const raw = JSON.parse(await f.text());
      if (!raw || typeof raw !== 'object' || !('bookmarks' in raw || 'journal' in raw)) throw new Error('not a backup');
      pendingImport = C.sanitize(raw);
      $('#impInfo').textContent = 'This backup has ' + Object.keys(pendingImport.bookmarks).length + ' bookmarks, ' + Object.keys(pendingImport.highlights).length + ' highlights, ' + pendingImport.journal.length + ' journal entries and ' + Object.keys(pendingImport.plans).length + ' reading plan(s).';
      $('#impDlg').showModal();
    } catch (err) { toast('That file is not a Bible app backup'); }
  };
  $('#impMerge').onclick = () => { D = C.mergeData(D, pendingImport); finishImport('Backup merged'); };
  $('#impReplace').onclick = () => { if (!confirm('Replace all data on this device with the backup?')) return; D = C.sanitize(pendingImport); finishImport('Backup restored'); };
  function finishImport(msg) { save(); closeDlg($('#impDlg')); applyTheme(); applyFont(); renderSettings(); toast(msg); }
  $('#resetBtn').onclick = () => {
    if (!confirm('Erase all bookmarks, highlights, journal entries and plan progress on this device? Your reading place is kept. Export a backup first if you want to keep the rest.')) return;
    D = C.emptyData(); save(); applyTheme(); applyFont(); renderSettings(); toast('All data erased');
  };

  function renderStudy() {
    const day = todayEntry();
    $('#stDate').textContent = longDate();
    if (!day) { $('#stText').textContent = 'Daily study could not be loaded.'; return; }
    const r = C.resolveRef(BOOKS, day.study.ref);
    $('#stRef').textContent = r ? r.label : day.study.ref;
    $('#stText').textContent = r ? r.text : '';
    paragraphs($('#stBody'), day.study.message);
    $('#stContext').onclick = () => { if (r) openPeek(r.b, r.c, r.v, 'study'); };
    $('#stPrayer').onclick = () => go('prayer');
    const blob = (r ? quote(r.text, r.label) + '\n\n' : '') + day.study.message;
    $('#stCopy').onclick = () => copyText(blob);
    $('#stShare').onclick = () => shareText(blob);
  }
  function renderPrayer() {
    const day = todayEntry();
    $('#prDate').textContent = longDate();
    if (!day) { $('#prBody').textContent = 'Daily prayer could not be loaded.'; return; }
    const r = C.resolveRef(BOOKS, day.study.ref);
    $('#prRef').textContent = r ? r.label : day.study.ref;
    $('#prVerse').textContent = r ? r.text : '';
    paragraphs($('#prBody'), day.prayer);
    $('#prContext').onclick = () => { if (r) openPeek(r.b, r.c, r.v, 'prayer'); };
    $('#prStudy').onclick = () => go('study');
    const blob = (r ? r.label + ' (KJV)\n"' + r.text + '"\n\n' : '') + day.prayer;
    $('#prCopy').onclick = () => copyText(blob);
    $('#prShare').onclick = () => shareText(blob);
  }

  function route() {
    const parts = location.hash.replace(/^#/, '').split('/');
    const head = parts[0] || '';
    if (head === 'peek' && BOOKS[+parts[1]]) {
      openPeek(+parts[1], +parts[2] || 1, +parts[3] || 0, parts[4] || 'verse');
      return;
    }
    if (head === 'read' || head === '') { enterReading(); return; }
    if (['home', 'search', 'plan', 'journal', 'saved', 'settings', 'study', 'prayer'].includes(head)) { go(head); return; }
    enterReading();
  }

  // ---------- start ----------
  applyTheme(); applyFont();
  loadBible().then(data => {
    BOOKS = data.books; NAMES = BOOKS.map(b => b.name);
    clampReading();
    cur = { b: reading.b, c: reading.c };
    saveReading();
    $('#loading').remove();
    route();
    watchNowVerse();
    window.addEventListener('hashchange', route);
  }).catch(err => {
    $('#loadMsg').textContent = 'Could not load the Bible text: ' + err.message;
    document.querySelector('#loading .spin').style.display = 'none';
  });

  window.addEventListener('scroll', () => {
    if (ignoreScroll || view !== 'read' || peek) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!ignoreScroll && view === 'read' && !peek) capturePlace();
    }, 200);
  }, { passive: true });
  function persistReading() {
    if (view === 'read' && !peek && !ignoreScroll) capturePlace();
  }
  window.addEventListener('pagehide', persistReading);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistReading();
    else if (BOOKS.length) { nowSlotShown = null; watchNowVerse(); }
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
