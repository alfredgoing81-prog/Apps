const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./core.js');
const D = require('./daily.js');
const bible = require('./kjv.json');

function sentences(s) {
  return String(s).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
}

test('daily study and prayer stay tied to the date and the KJV text', () => {
  assert.ok(D.STUDIES.length >= 60);
  assert.equal(D.STUDIES.length, D.PRAYERS.length);
  const seen = new Set();
  D.STUDIES.forEach((s, i) => {
    assert.ok(!seen.has(s.ref), 'duplicate ' + s.ref);
    seen.add(s.ref);
    const r = C.resolveRef(bible.books, s.ref);
    assert.ok(r, 'unresolved ' + s.ref);
    assert.equal(r.v, r.v2, 'expected one verse: ' + s.ref);
    assert.ok(r.text.length > 10);
    const ns = sentences(s.message);
    const np = sentences(D.PRAYERS[i]);
    assert.ok(ns.length >= 3 && ns.length <= 5, s.ref + ' study sentences ' + ns.length);
    assert.ok(np.length >= 4 && np.length <= 6, s.ref + ' prayer sentences ' + np.length);
    assert.equal(D.forDate(i).index, i);
    assert.equal(D.forDate(i).study.ref, s.ref);
    assert.equal(D.forDate(i).prayer, D.PRAYERS[i]);
  });
  const day = C.dayNumber(new Date(2026, 9, 15));
  assert.equal(D.pickIndex(day, D.STUDIES.length), D.forDate(day).index);
  assert.notEqual(D.pickIndex(day, D.STUDIES.length), D.pickIndex(day + 1, D.STUDIES.length));
  const seenIdx = new Set();
  for (let n = 0; n < D.STUDIES.length; n++) seenIdx.add(D.pickIndex(n, D.STUDIES.length));
  assert.equal(seenIdx.size, D.STUDIES.length);
});

test('verse for right now follows 90-minute local slots and skips today\'s study', () => {
  assert.ok(C.NOW_VERSES.length >= 100);
  assert.equal(C.NOW_SLOT_MINUTES, 90);
  assert.equal((24 * 60) % C.NOW_SLOT_MINUTES, 0);
  const seen = new Set();
  C.NOW_VERSES.forEach(ref => {
    assert.ok(!seen.has(ref), 'duplicate ' + ref);
    seen.add(ref);
    const r = C.resolveRef(bible.books, ref);
    assert.ok(r, 'unresolved ' + ref);
    assert.ok(r.text.length > 10, ref);
    assert.ok(r.text.length <= 320, ref + ' is long for a phone card (' + r.text.length + ')');
  });

  const slotStart = new Date(2026, 9, 15, 9, 0, 0);
  const sameSlot = new Date(2026, 9, 15, 10, 29, 59);
  const nextSlot = new Date(2026, 9, 15, 10, 30, 0);
  assert.equal(C.verseForNow(slotStart).ref, C.verseForNow(sameSlot).ref);
  assert.equal(C.verseForNow(slotStart).slot, C.verseForNow(new Date(slotStart.getTime())).slot);
  assert.notEqual(C.verseForNow(slotStart).ref, C.verseForNow(nextSlot).ref);
  assert.equal(C.nextVerseAt(sameSlot).getTime(), nextSlot.getTime());
  assert.equal(C.nextVerseAt(new Date(2026, 9, 15, 22, 45, 10)).getTime(), new Date(2026, 9, 16, 0, 0, 0).getTime());
  assert.equal(C.nowSlot(new Date(2026, 9, 15, 0, 0, 0)) % 16, 0);
  assert.equal(C.nowSlot(new Date(2026, 9, 15, 1, 29, 0)) % 16, 0);
  assert.equal(C.nowSlot(new Date(2026, 9, 15, 1, 30, 0)) % 16, 1);
  assert.notEqual(C.nowSlot(new Date(2026, 9, 15, 23, 59, 0)), C.nowSlot(new Date(2026, 9, 16, 0, 0, 0)));

  const daySlots = new Set();
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) daySlots.add(C.verseForNow(new Date(2026, 9, 15, h, m, 0)).slot);
  }
  assert.equal(daySlots.size, 16);

  const acrossDays = [];
  for (let i = 0; i < 48; i++) acrossDays.push(C.verseForNow(new Date(2026, 9, 15, 0, i * 90, 0)).ref);
  assert.equal(new Set(acrossDays).size, 48);

  const hit = C.verseForNow(slotStart);
  const avoided = C.verseForNow(slotStart, null, hit.ref);
  assert.notEqual(avoided.ref, hit.ref);
  assert.equal(C.verseRefsOverlap(hit.ref, avoided.ref), false);
  assert.equal(avoided.slot, hit.slot);
  assert.notEqual(avoided.ref, C.verseForNow(nextSlot).ref);
  assert.equal(C.verseRefsOverlap('Proverbs 3:5-6', 'Proverbs 3:5'), true);
  assert.equal(C.verseRefsOverlap('Romans 8:38-39', 'Romans 8:39'), true);
  assert.equal(C.verseRefsOverlap('John 3:16', 'John 14:27'), false);

  const day = C.dayNumber(slotStart);
  const before = D.forDate(day);
  C.verseForNow(slotStart, null, before.study.ref);
  const after = D.forDate(day);
  assert.equal(after.index, before.index);
  assert.equal(after.study.ref, before.study.ref);
  assert.equal(after.prayer, before.prayer);
  assert.equal(C.dailyVerseRef(slotStart), C.DAILY_VERSES[((day % C.DAILY_VERSES.length) + C.DAILY_VERSES.length) % C.DAILY_VERSES.length]);
});

test('spoken passages use a clear english voice and start at the current verse', () => {
  const voices = [
    { name: 'Amelie', lang: 'fr-FR', localService: true },
    { name: 'Google US English', lang: 'en-US', localService: false },
    { name: 'Samantha', lang: 'en-US', localService: true },
    { name: 'Daniel', lang: 'en-GB', localService: true }
  ];
  assert.equal(C.pickEnglishVoice(voices).name, 'Samantha');
  assert.equal(C.pickEnglishVoice([{ name: 'Daniel', lang: 'en-GB', localService: true }]).name, 'Daniel');
  assert.equal(C.pickEnglishVoice([]), null);
  assert.equal(C.pickEnglishVoice([{ name: 'Amelie', lang: 'fr-FR', localService: true }]), null);
  assert.equal(C.SPEECH_RATE, 0.92);

  const chapter = C.chapterSpeechParts('Psalms', 23, ['The LORD is my shepherd.', 'He leadeth me.', 'He restoreth my soul.'], 2);
  assert.equal(chapter[0].text, 'Psalms chapter 23.');
  assert.equal(chapter[0].verse, 0);
  assert.ok(chapter.some(p => p.verse === 2 && p.text.indexOf('leadeth') >= 0));
  assert.ok(chapter.some(p => p.verse === 3));
  assert.equal(chapter.some(p => p.verse === 1), false);

  const study = C.passageSpeechParts('John 14:6', 'I am the way, the truth, and the life.', 'Follow him in an ordinary choice today.');
  assert.ok(study[0].text.indexOf('John chapter 14, verse 6') === 0);
  assert.ok(study.some(p => p.text.indexOf('the way') >= 0));
  assert.ok(study.some(p => p.text.indexOf('ordinary choice') >= 0));
  assert.equal(C.speakRef('Numbers 6:24-26'), 'Numbers chapter 6, verses 24 to 26');

  const pieces = C.speechPieces('Alpha. ' + 'word '.repeat(80), 220);
  assert.ok(pieces.length > 1);
  assert.ok(pieces.every(p => p.length <= 220));
  assert.equal(C.speechPieces('   ').length, 0);
});
