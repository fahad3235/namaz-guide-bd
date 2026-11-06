// Namaz Guide BD - logic unit tests. Plain node assert, no deps.
// Run: node tests/logic.test.js
const assert = require('assert');
const DATA = require('../js/data');
const I18N = require('../js/i18n');

let n = 0;
function check(name, fn) { n += 1; fn(); console.log('ok - ' + name); }

// --- wudu ---
check('wudu has 9 steps', () => assert.strictEqual(DATA.wudu.length, 9));
check('wudu has exactly 4 fard steps (face, arms, head, feet)', () => {
  const fard = DATA.wudu.filter(s => s.tag === 'fard').map(s => s.id).sort();
  assert.deepStrictEqual(fard, ['arms', 'face', 'feet', 'head']);
});
check('wudu step times are 1 or 3, fard wash steps are 3', () => {
  DATA.wudu.forEach(s => {
    assert.ok(s.times === 1 || s.times === 3, s.id + ' times=' + s.times);
    if (s.tag === 'fard' && s.id !== 'head') assert.strictEqual(s.times, 3, s.id);
  });
});
check('wudu steps all have EN+BN title and detail', () => {
  DATA.wudu.forEach(s => {
    assert.ok(s.en.title && s.en.detail, s.id + ' en');
    assert.ok(s.bn.title && s.bn.detail, s.id + ' bn');
  });
});
check('wudu breakers: 5, all bilingual', () => {
  assert.strictEqual(DATA.wuduBreakers.length, 5);
  DATA.wuduBreakers.forEach(b => assert.ok(b.en && b.bn, 'breaker text'));
});

// --- rakats ---
check('rakats: 5 prayers, parts sum to stated total', () => {
  assert.strictEqual(DATA.rakats.length, 5);
  DATA.rakats.forEach(p => {
    const sum = p.parts.reduce((a, x) => a + x.count, 0);
    assert.strictEqual(sum, p.total, p.id + ' parts=' + sum + ' total=' + p.total);
  });
});
check('rakats totals are Fajr 4 / Dhuhr 12 / Asr 8 / Maghrib 7 / Isha 17', () => {
  const t = {};
  DATA.rakats.forEach(p => { t[p.id] = p.total; });
  assert.deepStrictEqual(t, { fajr: 4, dhuhr: 12, asr: 8, maghrib: 7, isha: 17 });
});
check('fard rakats total 17 per day', () => {
  let f = 0;
  DATA.rakats.forEach(p => p.parts.forEach(x => { if (x.kind === 'fard') f += x.count; }));
  assert.strictEqual(f, 17);
});
check('isha has 3 witr rakats', () => {
  const isha = DATA.rakats.find(p => p.id === 'isha');
  const w = isha.parts.find(x => x.kind === 'witr');
  assert.ok(w && w.count === 3);
});

// --- salah steps ---
check('salah has 13 steps from niyyah to salam', () => {
  assert.strictEqual(DATA.salah.length, 13);
  assert.strictEqual(DATA.salah[0].id, 'niyyah');
  assert.strictEqual(DATA.salah[DATA.salah.length - 1].id, 'salam');
});
check('every salah step has EN+BN title, detail and meaning-or-empty', () => {
  DATA.salah.forEach(s => {
    assert.ok(s.en.title && s.en.detail, s.id + ' en');
    assert.ok(s.bn.title && s.bn.detail, s.id + ' bn');
    assert.ok(typeof s.en.meaning === 'string' && typeof s.bn.meaning === 'string', s.id + ' meaning');
  });
});
check('recitation steps carry Arabic + transliteration; niyyah carries none', () => {
  const niyyah = DATA.salah.find(s => s.id === 'niyyah');
  assert.strictEqual(niyyah.ar, '');
  assert.strictEqual(niyyah.translit, '');
  ['takbir', 'sana', 'fatiha', 'ruku', 'sujud', 'tashahhud', 'durood', 'dua', 'salam'].forEach(id => {
    const s = DATA.salah.find(x => x.id === id);
    assert.ok(s.ar.length > 3, id + ' arabic');
    assert.ok(s.translit.length > 3, id + ' translit');
  });
});
check('fatiha arabic has 7 verses worth of words (spot-check key phrases)', () => {
  const f = DATA.salah.find(s => s.id === 'fatiha');
  assert.ok(f.ar.indexOf('\u0627\u0644\u062d\u0645\u062f \u0644\u0644\u0647 \u0631\u0628 \u0627\u0644\u0639\u0627\u0644\u0645\u064a\u0646') !== -1, 'fatiha contains Alhamdu lillahi Rabbil alamin');
  assert.ok(f.ar.indexOf('\u0645\u0627\u0644\u0643 \u064a\u0648\u0645 \u0627\u0644\u062f\u064a\u0646') !== -1, 'fatiha contains Maliki yawmid din');
  assert.ok(f.ar.indexOf('\u0627\u0647\u062f\u0646\u0627 \u0627\u0644\u0635\u0631\u0627\u0637 \u0627\u0644\u0645\u0633\u062a\u0642\u064a\u0645') !== -1, 'fatiha contains Ihdinas siratal mustaqim');
});
check('ikhlas example contains the full short surah', () => {
  const s = DATA.salah.find(x => x.id === 'surah');
  assert.ok(s.ar.indexOf('\u0642\u0644 \u0647\u0648 \u0627\u0644\u0644\u0647 \u0623\u062d\u062f') !== -1);
  assert.ok(s.ar.indexOf('\u0648\u0644\u0645 \u064a\u0643\u0646 \u0644\u0647 \u0643\u0641\u0648\u0627 \u0623\u062d\u062f') !== -1);
});

// --- mistakes ---
check('mistakes: 8, all bilingual with title+detail', () => {
  assert.strictEqual(DATA.mistakes.length, 8);
  DATA.mistakes.forEach((m, i) => {
    assert.ok(m.en.title && m.en.detail, 'mistake ' + i + ' en');
    assert.ok(m.bn.title && m.bn.detail, 'mistake ' + i + ' bn');
  });
});

// --- quiz ---
check('quiz: 10 questions, 4 options each, answer index valid, why present', () => {
  assert.strictEqual(DATA.quiz.length, 10);
  DATA.quiz.forEach((q, i) => {
    assert.strictEqual(q.en.options.length, 4, 'q' + i + ' en options');
    assert.strictEqual(q.bn.options.length, 4, 'q' + i + ' bn options');
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, 'q' + i + ' answer');
    assert.ok(q.en.q && q.en.why && q.bn.q && q.bn.why, 'q' + i + ' text');
  });
});
check('quiz answers match the guide (fard prayers 5, fajr fard 2, fatiha, ruku tasbih, 2 sujud, wind, face x3, salam, 17 fard, witr)', () => {
  const a = DATA.quiz.map(q => q.answer);
  assert.deepStrictEqual(a, [1, 1, 0, 2, 1, 3, 0, 2, 3, 1]);
});
check('quiz correct options are the expected strings', () => {
  assert.strictEqual(DATA.quiz[0].en.options[1], '5');
  assert.strictEqual(DATA.quiz[2].en.options[0], 'Surah Al-Fatiha');
  assert.strictEqual(DATA.quiz[3].en.options[2], 'Subhana Rabbiyal Azeem');
  assert.strictEqual(DATA.quiz[8].en.options[3], '17');
});

// --- i18n ---
check('i18n EN and BN have identical key sets', () => {
  const ek = Object.keys(I18N.I18N.en).sort();
  const bk = Object.keys(I18N.I18N.bn).sort();
  assert.deepStrictEqual(bk, ek);
});
check('i18n: every string non-empty in both languages', () => {
  Object.keys(I18N.I18N.en).forEach(k => {
    assert.ok(I18N.I18N.en[k].length > 0, 'en.' + k);
    assert.ok(I18N.I18N.bn[k].length > 0, 'bn.' + k);
  });
});
check('bnDigits converts 0-9 to Bengali digits', () => {
  assert.strictEqual(I18N.bnDigits('17'), '\u09e7\u09ed');
  assert.strictEqual(I18N.bnDigits('2026'), '\u09e8\u09e6\u09e8\u09ec');
  assert.strictEqual(I18N.bnDigits('Question 3 of 10'), 'Question \u09e9 of \u09e7\u09e6');
});

console.log('\n' + n + '/' + n + ' unit tests passed');
