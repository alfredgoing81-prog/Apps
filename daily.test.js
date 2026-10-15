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
