/* Bible app core logic: pure functions shared by the app (browser) and the tests (node). No scripture text lives here. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BibleCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Short names for book buttons (display only).
  const SHORT = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1 Sam','2 Sam','1 Kgs','2 Kgs','1 Chr','2 Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal','Matt','Mark','Luke','John','Acts','Rom','1 Cor','2 Cor','Gal','Eph','Phil','Col','1 Thess','2 Thess','1 Tim','2 Tim','Titus','Phlm','Heb','Jas','1 Pet','2 Pet','1 John','2 John','3 John','Jude','Rev'];

  // Curated verse-of-the-day references (references only; text comes from the KJV data).
  const DAILY_VERSES = [
    'Genesis 1:1','Genesis 1:27','Genesis 28:15','Genesis 50:20','Exodus 14:14','Exodus 15:2','Exodus 33:14','Numbers 6:24-26','Numbers 23:19',
    'Deuteronomy 6:5','Deuteronomy 7:9','Deuteronomy 31:6','Deuteronomy 31:8','Deuteronomy 33:27','Joshua 1:8','Joshua 1:9','Joshua 24:15',
    '1 Samuel 2:2','1 Samuel 16:7','2 Samuel 22:2-3','2 Samuel 22:31','1 Chronicles 16:11','1 Chronicles 16:34','1 Chronicles 29:11',
    '2 Chronicles 7:14','2 Chronicles 15:7','2 Chronicles 16:9','2 Chronicles 20:15','Nehemiah 8:10','Nehemiah 9:6','Job 1:21','Job 19:25','Job 23:10','Job 42:2',
    'Psalms 1:1-2','Psalms 1:3','Psalms 4:8','Psalms 5:3','Psalms 5:11','Psalms 9:9-10','Psalms 16:8','Psalms 16:11','Psalms 18:2','Psalms 18:30','Psalms 19:1',
    'Psalms 19:14','Psalms 23:1','Psalms 23:4','Psalms 23:6','Psalms 25:4-5','Psalms 27:1','Psalms 27:14','Psalms 28:7','Psalms 29:11','Psalms 30:5','Psalms 31:24',
    'Psalms 32:8','Psalms 33:4','Psalms 34:4','Psalms 34:8','Psalms 34:17','Psalms 34:18','Psalms 37:4','Psalms 37:5','Psalms 37:7','Psalms 40:1','Psalms 42:11',
    'Psalms 46:1','Psalms 46:10','Psalms 51:10','Psalms 55:22','Psalms 56:3','Psalms 57:10','Psalms 61:2','Psalms 62:1-2','Psalms 62:8','Psalms 63:1','Psalms 63:3',
    'Psalms 68:19','Psalms 71:5','Psalms 73:26','Psalms 84:11','Psalms 86:5','Psalms 90:12','Psalms 91:1-2','Psalms 91:4','Psalms 91:11','Psalms 94:19','Psalms 95:1',
    'Psalms 96:1','Psalms 100:4-5','Psalms 103:2-3','Psalms 103:11-12','Psalms 106:1','Psalms 107:1','Psalms 107:9','Psalms 112:7','Psalms 116:1-2','Psalms 118:6',
    'Psalms 118:24','Psalms 119:11','Psalms 119:105','Psalms 119:114','Psalms 119:165','Psalms 121:1-2','Psalms 121:7-8','Psalms 126:5','Psalms 127:1','Psalms 130:5',
    'Psalms 136:1','Psalms 138:3','Psalms 139:14','Psalms 139:23-24','Psalms 143:8','Psalms 145:18','Psalms 147:3','Psalms 150:6',
    'Proverbs 3:5-6','Proverbs 3:24','Proverbs 4:23','Proverbs 11:25','Proverbs 12:25','Proverbs 14:26','Proverbs 15:1','Proverbs 16:3','Proverbs 16:9','Proverbs 17:17',
    'Proverbs 17:22','Proverbs 18:10','Proverbs 18:24','Proverbs 19:21','Proverbs 21:21','Proverbs 22:6','Proverbs 27:17','Proverbs 30:5','Proverbs 31:25',
    'Ecclesiastes 3:1','Ecclesiastes 3:11','Ecclesiastes 4:9-10','Ecclesiastes 12:13','Song of Solomon 8:7',
    'Isaiah 1:18','Isaiah 9:6','Isaiah 12:2','Isaiah 25:1','Isaiah 26:3','Isaiah 26:4','Isaiah 30:15','Isaiah 30:18','Isaiah 30:21','Isaiah 40:8','Isaiah 40:29','Isaiah 40:31',
    'Isaiah 41:10','Isaiah 41:13','Isaiah 43:1','Isaiah 43:2','Isaiah 43:18-19','Isaiah 43:25','Isaiah 46:4','Isaiah 49:15-16','Isaiah 53:5','Isaiah 54:10','Isaiah 54:17',
    'Isaiah 55:8-9','Isaiah 55:11','Isaiah 58:11','Isaiah 60:1','Isaiah 61:1','Isaiah 61:3','Isaiah 64:8','Isaiah 65:24',
    'Jeremiah 15:16','Jeremiah 17:7-8','Jeremiah 29:11','Jeremiah 29:12-13','Jeremiah 31:3','Jeremiah 32:17','Jeremiah 32:27','Jeremiah 33:3',
    'Lamentations 3:22-23','Lamentations 3:24','Lamentations 3:25','Ezekiel 34:26','Ezekiel 36:26','Daniel 12:3','Joel 2:13','Joel 2:25','Micah 6:8','Micah 7:7','Micah 7:18',
    'Nahum 1:7','Habakkuk 2:3','Habakkuk 3:17-18','Habakkuk 3:19','Zephaniah 3:17','Zechariah 4:6','Malachi 3:6','Malachi 3:10','Malachi 4:2',
    'Matthew 5:4','Matthew 5:5','Matthew 5:6','Matthew 5:8','Matthew 5:9','Matthew 5:14','Matthew 5:16','Matthew 5:44','Matthew 6:6','Matthew 6:21','Matthew 6:26',
    'Matthew 6:33','Matthew 6:34','Matthew 7:7','Matthew 7:11','Matthew 7:12','Matthew 11:28','Matthew 11:29-30','Matthew 17:20','Matthew 18:20','Matthew 19:26',
    'Matthew 21:22','Matthew 22:37-39','Matthew 28:19-20','Mark 9:23','Mark 10:27','Mark 11:24','Mark 11:25','Mark 12:30-31','Mark 16:15',
    'Luke 1:37','Luke 1:45','Luke 2:10-11','Luke 6:31','Luke 6:38','Luke 10:27','Luke 11:9','Luke 12:7','Luke 12:32','Luke 18:27','Luke 19:10',
    'John 1:1','John 1:5','John 1:12','John 3:16','John 3:17','John 4:14','John 6:35','John 8:12','John 8:32','John 8:36','John 10:10','John 10:11','John 10:27-28',
    'John 11:25','John 13:34','John 14:1','John 14:2','John 14:6','John 14:13','John 14:27','John 15:5','John 15:7','John 15:11','John 15:12','John 15:13','John 15:16',
    'John 16:22','John 16:33','John 20:29','Acts 1:8','Acts 3:19','Acts 4:12','Acts 16:31','Acts 17:28','Acts 20:35',
    'Romans 1:16','Romans 3:23-24','Romans 5:1','Romans 5:3-4','Romans 5:5','Romans 5:8','Romans 6:23','Romans 8:1','Romans 8:18','Romans 8:26','Romans 8:28','Romans 8:31',
    'Romans 8:37','Romans 8:38-39','Romans 10:9','Romans 10:13','Romans 10:17','Romans 12:1','Romans 12:2','Romans 12:10','Romans 12:12','Romans 12:21','Romans 13:8',
    'Romans 14:8','Romans 15:4','Romans 15:13','Romans 16:20','1 Corinthians 1:9','1 Corinthians 2:9','1 Corinthians 6:19-20','1 Corinthians 10:13','1 Corinthians 10:31',
    '1 Corinthians 13:4-5','1 Corinthians 13:7','1 Corinthians 13:13','1 Corinthians 15:57','1 Corinthians 15:58','1 Corinthians 16:13','1 Corinthians 16:14',
    '2 Corinthians 1:3-4','2 Corinthians 3:17','2 Corinthians 4:8-9','2 Corinthians 4:16','2 Corinthians 4:17','2 Corinthians 4:18','2 Corinthians 5:7','2 Corinthians 5:17',
    '2 Corinthians 9:7','2 Corinthians 9:8','2 Corinthians 12:9','2 Corinthians 12:10','Galatians 2:20','Galatians 5:1','Galatians 5:13','Galatians 5:22-23','Galatians 6:2',
    'Galatians 6:9','Galatians 6:10','Ephesians 1:3','Ephesians 1:7','Ephesians 2:8-9','Ephesians 2:10','Ephesians 3:20-21','Ephesians 4:2','Ephesians 4:26','Ephesians 4:29',
    'Ephesians 4:32','Ephesians 5:2','Ephesians 6:10','Ephesians 6:11','Philippians 1:6','Philippians 1:21','Philippians 2:3','Philippians 2:13','Philippians 3:13-14',
    'Philippians 3:20','Philippians 4:4','Philippians 4:6','Philippians 4:7','Philippians 4:8','Philippians 4:11','Philippians 4:13','Philippians 4:19',
    'Colossians 1:17','Colossians 2:6-7','Colossians 3:2','Colossians 3:12','Colossians 3:13','Colossians 3:14','Colossians 3:15','Colossians 3:16','Colossians 3:23','Colossians 4:2',
    '1 Thessalonians 5:11','1 Thessalonians 5:16-18','1 Thessalonians 5:24','2 Thessalonians 2:16-17','2 Thessalonians 3:3','2 Thessalonians 3:16',
    '1 Timothy 1:15','1 Timothy 2:5','1 Timothy 4:12','1 Timothy 6:6','1 Timothy 6:12','2 Timothy 1:7','2 Timothy 1:12','2 Timothy 2:13','2 Timothy 2:15','2 Timothy 3:16',
    '2 Timothy 4:7','2 Timothy 4:18','Titus 2:11','Titus 3:5','Hebrews 4:12','Hebrews 4:15','Hebrews 4:16','Hebrews 6:19','Hebrews 10:23','Hebrews 10:24','Hebrews 11:1',
    'Hebrews 11:6','Hebrews 12:1','Hebrews 12:2','Hebrews 12:11','Hebrews 13:5','Hebrews 13:6','Hebrews 13:8','Hebrews 13:16',
    'James 1:2-3','James 1:5','James 1:12','James 1:17','James 1:19','James 1:22','James 4:7','James 4:8','James 4:10','James 5:13','James 5:16',
    '1 Peter 1:3','1 Peter 1:8','1 Peter 2:9','1 Peter 2:24','1 Peter 3:15','1 Peter 4:8','1 Peter 4:10','1 Peter 5:6','1 Peter 5:7','1 Peter 5:10',
    '2 Peter 1:3','2 Peter 3:9','2 Peter 3:18','1 John 1:9','1 John 2:1','1 John 3:1','1 John 3:18','1 John 4:4','1 John 4:7','1 John 4:8','1 John 4:10','1 John 4:16',
    '1 John 4:18','1 John 4:19','1 John 5:4','1 John 5:14','3 John 1:2','Jude 1:21','Jude 1:24-25','Revelation 1:8','Revelation 3:20','Revelation 4:11','Revelation 21:4',
    'Revelation 21:5','Revelation 22:13'
  ];

  // Short encouraging passages for "Verse for right now".
  // References only; the KJV text is loaded with the rest of the Bible.
  // One passage is chosen per 90-minute block of the local clock.
  const NOW_VERSES = [
    'Genesis 28:15','Exodus 14:14','Exodus 33:14','Numbers 6:24-26','Deuteronomy 31:6','Deuteronomy 31:8','Deuteronomy 33:27',
    'Joshua 1:9','1 Chronicles 16:34','2 Chronicles 15:7','2 Chronicles 20:15','Nehemiah 8:10','Job 19:25',
    'Psalms 4:8','Psalms 9:9','Psalms 16:8','Psalms 16:11','Psalms 18:2','Psalms 18:30','Psalms 23:1','Psalms 23:2','Psalms 23:3','Psalms 23:4','Psalms 23:6',
    'Psalms 27:1','Psalms 27:14','Psalms 28:7','Psalms 29:11','Psalms 30:5','Psalms 31:24','Psalms 32:8','Psalms 34:4','Psalms 34:8','Psalms 34:17','Psalms 34:18',
    'Psalms 37:4','Psalms 37:5','Psalms 37:7','Psalms 40:1','Psalms 42:11','Psalms 46:1','Psalms 46:10','Psalms 55:22','Psalms 56:3','Psalms 62:1','Psalms 62:2','Psalms 62:8',
    'Psalms 63:3','Psalms 68:19','Psalms 73:26','Psalms 84:11','Psalms 86:5','Psalms 91:1','Psalms 91:4','Psalms 91:11','Psalms 94:19','Psalms 100:5','Psalms 103:8',
    'Psalms 107:1','Psalms 107:9','Psalms 112:7','Psalms 118:6','Psalms 118:24','Psalms 119:105','Psalms 119:114','Psalms 119:165',
    'Psalms 121:1','Psalms 121:2','Psalms 121:7','Psalms 121:8','Psalms 130:5','Psalms 136:1','Psalms 138:3','Psalms 139:14','Psalms 145:18','Psalms 147:3',
    'Proverbs 3:5','Proverbs 3:6','Proverbs 16:3','Proverbs 16:9','Proverbs 17:22','Proverbs 18:10','Proverbs 30:5',
    'Isaiah 12:2','Isaiah 26:3','Isaiah 26:4','Isaiah 30:21','Isaiah 40:8','Isaiah 40:29','Isaiah 40:31','Isaiah 41:10','Isaiah 41:13','Isaiah 43:1','Isaiah 43:2','Isaiah 43:25','Isaiah 46:4','Isaiah 54:10','Isaiah 54:17','Isaiah 65:24',
    'Jeremiah 29:11','Jeremiah 31:3','Jeremiah 32:17','Jeremiah 33:3','Lamentations 3:22','Lamentations 3:23','Lamentations 3:25',
    'Micah 7:7','Micah 7:8','Micah 7:18','Nahum 1:7','Habakkuk 3:19','Zephaniah 3:17','Zechariah 4:6','Malachi 3:6',
    'Matthew 6:26','Matthew 6:33','Matthew 6:34','Matthew 7:7','Matthew 11:28','Matthew 11:29','Matthew 11:30','Matthew 19:26','Matthew 28:20',
    'Luke 1:37','Luke 12:7','Luke 12:32',
    'John 1:5','John 3:16','John 3:17','John 6:35','John 8:12','John 8:36','John 10:10','John 10:11','John 11:25','John 14:1','John 14:6','John 14:27','John 15:5','John 15:13','John 16:33',
    'Acts 16:31',
    'Romans 5:1','Romans 5:8','Romans 8:1','Romans 8:18','Romans 8:28','Romans 8:31','Romans 8:37','Romans 8:38-39','Romans 10:13','Romans 15:13',
    '1 Corinthians 10:13','1 Corinthians 15:57','1 Corinthians 16:14',
    '2 Corinthians 4:16','2 Corinthians 4:17','2 Corinthians 5:7','2 Corinthians 5:17','2 Corinthians 9:8','2 Corinthians 12:9',
    'Galatians 2:20','Galatians 5:1','Galatians 6:9',
    'Ephesians 2:8','Ephesians 2:10','Ephesians 3:20','Ephesians 6:10',
    'Philippians 1:6','Philippians 4:4','Philippians 4:6','Philippians 4:7','Philippians 4:13','Philippians 4:19',
    'Colossians 1:17','Colossians 3:15',
    '1 Thessalonians 5:11','1 Thessalonians 5:16','1 Thessalonians 5:18','2 Thessalonians 3:3','2 Thessalonians 3:16',
    '1 Timothy 6:6','2 Timothy 1:7','2 Timothy 2:13',
    'Hebrews 4:16','Hebrews 6:19','Hebrews 10:23','Hebrews 13:5','Hebrews 13:6','Hebrews 13:8',
    'James 1:5','James 1:17','James 4:8',
    '1 Peter 1:3','1 Peter 5:7','1 Peter 5:10',
    '1 John 1:9','1 John 3:1','1 John 4:4','1 John 4:8','1 John 4:16','1 John 4:18','1 John 4:19',
    'Revelation 21:4','Revelation 21:5','Revelation 22:13'
  ];

  const NT_START = 39; // index of Matthew

  function norm(s) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); }

  // Parse "John 3:16", "Psalms 23", "1 Cor 13:4-5", "ps 23:1". Returns {b,c,v,v2} (0-based book, 1-based c/v) or null.
  function parseRef(str, bookNames) {
    if (!str) return null;
    const m = String(str).trim().match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z .]*?)\s*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
    if (!m) return null;
    const name = norm(m[1].replace(/\./g, '')).replace(/^([1-3])\s*/, '$1 ');
    let b = -1;
    const names = bookNames.map(norm), shorts = SHORT.map(s => norm(s));
    b = names.indexOf(name);
    if (b < 0) b = shorts.indexOf(name);
    if (b < 0 && (name === 'psalm' || name === 'psa')) b = 18;
    if (b < 0 && (name === 'revelations')) b = 65;
    if (b < 0) b = names.findIndex(n => name.length >= 3 && n.startsWith(name));
    if (b < 0) return null;
    const r = { b, c: +m[2], v: m[3] ? +m[3] : 0, v2: m[4] ? +m[4] : 0 };
    if (r.v2 && r.v2 < r.v) return null;
    return r;
  }

  function refLabel(bookNames, b, c, v, v2) {
    let s = bookNames[b] + ' ' + c;
    if (v) s += ':' + v + (v2 && v2 !== v ? '-' + v2 : '');
    return s;
  }

  // Resolve a reference against the data. Returns {label, text, verses:[{v,t}]} or null if anything is missing.
  function resolveRef(books, ref) {
    const bookNames = books.map(x => x.name);
    const r = typeof ref === 'string' ? parseRef(ref, bookNames) : ref;
    if (!r || !books[r.b]) return null;
    const ch = books[r.b].chapters[r.c - 1];
    if (!ch) return null;
    const from = r.v || 1, to = r.v2 || r.v || ch.length;
    const verses = [];
    for (let v = from; v <= to; v++) { if (!ch[v - 1]) return null; verses.push({ v, t: ch[v - 1] }); }
    return { b: r.b, c: r.c, v: from, v2: to, label: refLabel(bookNames, r.b, r.c, r.v, r.v2), text: verses.map(x => x.t).join(' '), verses };
  }

  // Local-date day number (days since 1970-01-01 in the device's own time zone).
  function dayNumber(date) {
    const d = date instanceof Date ? date : new Date(date);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  function isoToDayNumber(iso) { const [y, m, d] = iso.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); }
  function dayNumberToIso(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }
  function todayIso(date) { return dayNumberToIso(dayNumber(date || new Date())); }

  function dailyVerseRef(date, list) {
    list = list || DAILY_VERSES;
    const n = dayNumber(date);
    return list[((n % list.length) + list.length) % list.length];
  }

  // Clock slots for the rotating "right now" verse. A day divides evenly:
  // 24 * 60 / 90 = 16 slots, so the choice follows local time and not a timer.
  const NOW_SLOT_MINUTES = 90;
  const NOW_SLOTS_PER_DAY = (24 * 60) / NOW_SLOT_MINUTES;

  function asDate(date) { return date instanceof Date ? date : new Date(date); }

  function nowSlot(date) {
    const d = asDate(date);
    const slotOfDay = Math.floor((d.getHours() * 60 + d.getMinutes()) / NOW_SLOT_MINUTES);
    return dayNumber(d) * NOW_SLOTS_PER_DAY + slotOfDay;
  }

  function nextVerseAt(date) {
    const d = asDate(date);
    const slotOfDay = Math.floor((d.getHours() * 60 + d.getMinutes()) / NOW_SLOT_MINUTES);
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    next.setMinutes((slotOfDay + 1) * NOW_SLOT_MINUTES);
    return next;
  }

  // "John 3:16" and "John 3:16-17" share a verse. Used so the rotating verse
  // can step aside when it would repeat today's study.
  function verseSpan(ref) {
    const m = String(ref == null ? '' : ref).trim().match(/^(.*?)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!m) return null;
    const v = +m[3], v2 = m[4] ? +m[4] : v;
    return { book: m[1].replace(/\s+/g, ' ').toLowerCase(), c: +m[2], v: Math.min(v, v2), v2: Math.max(v, v2) };
  }

  function verseRefsOverlap(a, b) {
    const x = verseSpan(a), y = verseSpan(b);
    if (!x || !y) return false;
    return x.book === y.book && x.c === y.c && x.v <= y.v2 && y.v <= x.v2;
  }

  function verseForNow(date, list, avoidRef) {
    list = list && list.length ? list : NOW_VERSES;
    const len = list.length;
    if (!len) return null;
    const slot = nowSlot(date);
    let index = ((slot % len) + len) % len;
    if (avoidRef && len > 1 && verseRefsOverlap(list[index], avoidRef)) {
      // Jump well away from this slot so the next 90 minutes keeps its own verse.
      const jump = Math.max(1, Math.floor(len / 2));
      let alt = (index + jump) % len;
      let guard = 0;
      while (guard < len && verseRefsOverlap(list[alt], avoidRef)) {
        alt = (alt + 1) % len;
        guard++;
      }
      index = alt;
    }
    return { ref: list[index], index: index, slot: slot, nextAt: nextVerseAt(date) };
  }

  // Split an ordered list into `days` consecutive groups as evenly as possible, no gaps or overlaps.
  function splitEven(items, days) {
    const out = [];
    for (let i = 0; i < days; i++) out.push(items.slice(Math.round(i * items.length / days), Math.round((i + 1) * items.length / days)));
    return out;
  }

  function chapterList(books, fromBook, toBook) {
    const list = [];
    for (let b = fromBook; b <= toBook; b++) for (let c = 1; c <= books[b].chapters.length; c++) list.push({ b, c });
    return list;
  }

  const PLANS = {
    year: { name: 'Bible in a Year', desc: 'All 1,189 chapters, Genesis to Revelation, in 365 days (3 to 4 chapters a day).', days: 365 },
    gospels: { name: 'Gospels + Psalms in 90 Days', desc: 'Matthew, Mark, Luke and John alongside all 150 Psalms in 90 days.', days: 90 },
    nt: { name: 'New Testament in 90 Days', desc: 'Matthew to Revelation, all 260 chapters, in 90 days (about 3 a day).', days: 90 }
  };

  function buildPlan(books, id) {
    if (id === 'year') return splitEven(chapterList(books, 0, books.length - 1), 365);
    if (id === 'nt') return splitEven(chapterList(books, NT_START, books.length - 1), 90);
    if (id === 'gospels') {
      const g = splitEven(chapterList(books, 39, 42), 90), p = splitEven(chapterList(books, 18, 18), 90);
      return g.map((x, i) => x.concat(p[i]));
    }
    throw new Error('Unknown plan ' + id);
  }

  // Compact label for a day's chapters: "Genesis 1-3", "Matthew 1; Psalms 1-2".
  function describeReading(books, chapters) {
    const parts = [];
    chapters.forEach(({ b, c }) => {
      const last = parts[parts.length - 1];
      if (last && last.b === b && last.to === c - 1) last.to = c; else parts.push({ b, from: c, to: c });
    });
    return parts.map(p => books[p.b].name + ' ' + p.from + (p.to > p.from ? '-' + p.to : '')).join('; ');
  }

  // Day index (0-based) in the plan for a given date; may be negative (not started) or >= days (finished).
  function planDayIndex(startIso, date) { return dayNumber(date || new Date()) - isoToDayNumber(startIso); }

  // Streak: consecutive completed plan days ending today (or yesterday, if today isn't checked yet).
  function planStreak(done, todayIdx, days) {
    let i = Math.min(todayIdx, days - 1);
    if (i < 0) return 0;
    if (!done[i]) i--;
    let s = 0;
    while (i >= 0 && done[i]) { s++; i--; }
    return s;
  }

  // ---- Search ----
  function buildSearchIndex(books) {
    const idx = [];
    books.forEach((bk, b) => bk.chapters.forEach((ch, ci) => ch.forEach((t, vi) => idx.push({ b, c: ci + 1, v: vi + 1, t, l: t.toLowerCase().replace(/[’']/g, "'") }))));
    return idx;
  }

  // Query: words are ANDed; "quoted phrases" must appear as written. scope: 'all' | 'ot' | 'nt'.
  function search(idx, query, opts) {
    opts = opts || {};
    const q = String(query || '').toLowerCase().replace(/[’']/g, "'");
    const terms = [];
    q.replace(/"([^"]+)"|(\S+)/g, (_, ph, w) => { const t = (ph || w).replace(/^[^\w']+|[^\w']+$/g, ''); if (t) terms.push(t); return ''; });
    if (!terms.length) return { total: 0, results: [], terms };
    const limit = opts.limit || 500, scope = opts.scope || 'all';
    const results = []; let total = 0;
    for (let i = 0; i < idx.length; i++) {
      const e = idx[i];
      if (scope === 'ot' && e.b >= NT_START) continue;
      if (scope === 'nt' && e.b < NT_START) continue;
      let ok = true;
      for (let j = 0; j < terms.length; j++) if (e.l.indexOf(terms[j]) === -1) { ok = false; break; }
      if (ok) { total++; if (results.length < limit) results.push(e); }
    }
    return { total, results, terms };
  }

  // ---- Personal data ----
  function emptyData() {
    return { version: 1, bookmarks: {}, highlights: {}, journal: [], plans: {}, activePlan: null, settings: { font: 19, theme: 'dark' }, last: { b: 42, c: 1 } };
  }

  function sanitize(d) {
    const e = emptyData();
    if (!d || typeof d !== 'object') return e;
    const obj = x => (x && typeof x === 'object' && !Array.isArray(x)) ? x : {};
    e.bookmarks = obj(d.bookmarks); e.highlights = obj(d.highlights);
    e.journal = Array.isArray(d.journal) ? d.journal.filter(j => j && j.id) : [];
    e.plans = obj(d.plans); e.activePlan = PLANS[d.activePlan] ? d.activePlan : null;
    e.settings = Object.assign(e.settings, obj(d.settings));
    if (d.last && Number.isInteger(d.last.b) && Number.isInteger(d.last.c)) e.last = { b: d.last.b, c: d.last.c };
    return e;
  }

  // Merge an imported backup into existing data (nothing is deleted; newer journal edits win).
  function mergeData(cur, inc) {
    const a = sanitize(cur), b = sanitize(inc);
    Object.assign(a.bookmarks, b.bookmarks);
    Object.assign(a.highlights, b.highlights);
    const byId = new Map(a.journal.map(j => [j.id, j]));
    b.journal.forEach(j => { const o = byId.get(j.id); if (!o || (j.updated || 0) > (o.updated || 0)) byId.set(j.id, j); });
    a.journal = [...byId.values()];
    Object.keys(b.plans).forEach(id => {
      const p = b.plans[id]; if (!p) return;
      if (!a.plans[id]) a.plans[id] = { start: p.start, done: {} };
      Object.assign(a.plans[id].done, p.done || {});
    });
    if (!a.activePlan) a.activePlan = b.activePlan;
    return a;
  }

  return { SHORT, DAILY_VERSES, NOW_VERSES, NOW_SLOT_MINUTES, PLANS, NT_START, parseRef, refLabel, resolveRef, dayNumber, isoToDayNumber, dayNumberToIso, todayIso, dailyVerseRef,
    nowSlot, nextVerseAt, verseRefsOverlap, verseForNow,
    splitEven, chapterList, buildPlan, describeReading, planDayIndex, planStreak, buildSearchIndex, search, emptyData, sanitize, mergeData };
});
