// Exhaustive offline tests for the OCR text-cleanup pipeline.
//
// Tests the two pure functions:
//   1. collapseSoftWraps  — from functions/_lib.js (dynamic import)
//   2. detectSuspectOcrTokens — inlined copy from src/lib/page-marking.js
//      (browser code — copied so we can run under Node without bundling)
//
// Run:  node tests/ocr-unit-tests.mjs
// Exits 0 on all-pass, 1 on any failure.

import { collapseSoftWraps } from '../functions/_lib.js';

// ───────────────────────────────────────────────────────────────────────────
// detectSuspectOcrTokens — VERBATIM COPY from src/lib/page-marking.js
// (must match — update both sides if you change the heuristic)
// ───────────────────────────────────────────────────────────────────────────
const COMMON_SHORT_EN = new Set([
  'a','i','am','an','as','at','be','by','do','go','he','hi','if','in','is',
  'it','me','my','no','of','oh','ok','on','or','so','to','up','us','we','ye',
  'add','age','ago','aid','aim','air','all','and','any','are','arm','art',
  'ask','ate','bad','bag','bar','bat','bed','bee','beg','bet','big','bit',
  'box','boy','bus','but','buy','can','car','cat','cup','cut','day','did',
  'dog','don','dry','due','ear','eat','egg','end','era','eye','far','fat',
  'few','fit','fix','fly','for','fun','get','god','got','gun','guy','had',
  'has','hat','her','hey','him','his','hit','hot','how','its','job','key',
  'kid','lay','led','let','lie','log','lot','low','man','may','men','met',
  'mid','mix','mom','net','new','non','nor','not','now','nut','odd','off',
  'oil','old','one','our','out','own','par','pay','pen','pet','put','ran',
  'red','rid','run','sad','sat','saw','say','sea','see','set','she','sir',
  'sit','six','sky','son','sun','tax','tea','ten','the','tie','tip','too',
  'top','toy','try','two','use','van','vet','war','was','way','who','why',
  'win','won','yes','yet','you','zoo',
]);

function detectSuspectOcrTokens(text) {
  if (!text) return [];
  const tokens = text.split(/\s+/).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const raw of tokens) {
    const clean = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    let suspect = false;
    if (clean.length === 1 && !/^[aIoAOiu]$/.test(clean)) suspect = true;
    else if (/^(ing|ed|ly|tion|sion|ness|ment|ous|ful|less)$/i.test(clean)) suspect = true;
    else if (clean.includes('-') && !/^[A-Z]/.test(clean) && clean.length < 12) suspect = true;
    else if (clean.length >= 2 && clean.length <= 3 && /^[a-zA-Z]+$/.test(clean) && !COMMON_SHORT_EN.has(key)) suspect = true;
    if (suspect) {
      out.push(raw);
      seen.add(key);
      if (out.length >= 8) break;
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Test runner
// ───────────────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const fails = [];

function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else {
    fail++;
    fails.push({ label, actual, expected });
  }
}

// ───────────────────────────────────────────────────────────────────────────
// collapseSoftWraps tests
// ───────────────────────────────────────────────────────────────────────────
console.log('── collapseSoftWraps ──');

eq('empty', collapseSoftWraps(''), '');
eq('null',  collapseSoftWraps(null), '');
eq('undefined', collapseSoftWraps(undefined), '');
eq('single line, no break', collapseSoftWraps('hello world'), 'hello world');

// Essie's failure mode
eq('Essie soft-wrap mid-word',
   collapseSoftWraps('we ar hav\ning a great class'),
   'we ar hav ing a great class');

// Hyphenated wrap
eq('hyphen end-of-line + lowercase next',
   collapseSoftWraps('the lesson was inter-\nesting and fun'),
   'the lesson was interesting and fun');

// Real paragraph (terminal punctuation)
eq('period keeps newline',
   collapseSoftWraps('First sentence here.\nSecond paragraph.'),
   'First sentence here.\nSecond paragraph.');

eq('question mark keeps newline',
   collapseSoftWraps('Are you sure?\nYes I am.'),
   'Are you sure?\nYes I am.');

eq('exclamation keeps newline',
   collapseSoftWraps('Wow!\nThat was great.'),
   'Wow!\nThat was great.');

eq('semicolon keeps newline',
   collapseSoftWraps('first item;\nsecond item;'),
   'first item;\nsecond item;');

eq('colon keeps newline',
   collapseSoftWraps('Items needed:\nbread, milk'),
   'Items needed:\nbread, milk');

// Uppercase next line (new sentence)
eq('uppercase next line keeps newline',
   collapseSoftWraps('the cat sat\nThe dog ran'),
   'the cat sat\nThe dog ran');

eq('uppercase I as continuation — kept (false positive but safe)',
   collapseSoftWraps('the cat sat\nI saw it'),
   'the cat sat\nI saw it');

// Multiple newlines = paragraph break
eq('double newline preserved',
   collapseSoftWraps('paragraph one\n\nparagraph two'),
   'paragraph one\n\nparagraph two');

eq('triple newline collapsed to double',
   collapseSoftWraps('paragraph one\n\n\nparagraph two'),
   'paragraph one\n\nparagraph two');

// Whitespace edge cases
eq('trailing whitespace before newline cleaned',
   collapseSoftWraps('hello   \nworld'),
   'hello world');

eq('leading whitespace next line cleaned',
   collapseSoftWraps('hello\n   world'),
   'hello world');

eq('only newlines → empty',
   collapseSoftWraps('\n\n\n'),
   '');

eq('newline at start',
   collapseSoftWraps('\nhello'),
   'hello');

eq('newline at end',
   collapseSoftWraps('hello\n'),
   'hello');

// Real handwriting scenarios
eq('three-line soft wrap chain',
   collapseSoftWraps('we are\nhaving a\ngreat lesson'),
   'we are having a great lesson');

eq('soft wrap then real period then soft wrap',
   collapseSoftWraps('first phrase\ncontinues here.\nSecond starts.\nThird wraps\nand finishes.'),
   'first phrase continues here.\nSecond starts.\nThird wraps and finishes.');

// Numbers (no terminal punct, no uppercase) → join
eq('numbers across lines join with space',
   collapseSoftWraps('100\n200'),
   '100 200');

// Hyphenated compound, not wrap — heuristic should leave alone if no \n
eq('intact compound stays',
   collapseSoftWraps('mother-in-law lives here'),
   'mother-in-law lives here');

// Em-dash (not hyphen) before newline → soft wrap rules apply
eq('em-dash + newline + lowercase = space (rule 4)',
   collapseSoftWraps('hello—\nworld'),
   'hello— world');

// Non-Latin script — heuristic uses [a-zA-Z] checks so non-Latin chars fall
// through Rules 1-3 and hit Rule 4 (space). Acceptable.
eq('Cantonese soft wrap → space',
   collapseSoftWraps('我食緊\n飯'),
   '我食緊 飯');

eq('Arabic soft wrap → space',
   collapseSoftWraps('أنا أحب\nالقهوة'),
   'أنا أحب القهوة');

// Mixed punctuation edge
eq('comma does NOT keep newline',
   collapseSoftWraps('the cat,\nthe dog'),
   'the cat, the dog');

eq('parenthesis close does NOT keep newline',
   collapseSoftWraps('the cat (orange)\nis cute'),
   'the cat (orange) is cute');

// Long real-world handwriting sample
const handwriting = `we ar hav
ing a wonderful
day at school.

today we lear
ned about
maths and sci-
ence.`;
const expectedHW = `we ar hav ing a wonderful day at school.\n\ntoday we lear ned about maths and science.`;
eq('long realistic handwriting sample', collapseSoftWraps(handwriting), expectedHW);

// ───────────────────────────────────────────────────────────────────────────
// detectSuspectOcrTokens tests
// ───────────────────────────────────────────────────────────────────────────
console.log('── detectSuspectOcrTokens ──');

eq('empty string → []', detectSuspectOcrTokens(''), []);
eq('null → []', detectSuspectOcrTokens(null), []);

eq('clean text → []',
   detectSuspectOcrTokens('we are having a great lesson today'),
   []);

// Suffix fragments
eq('"ing" standalone → flagged (and ar/hav also via length-allowlist rule)',
   detectSuspectOcrTokens('we ar hav ing'),
   ['ar', 'hav', 'ing']);

eq('"tion" standalone → flagged',
   detectSuspectOcrTokens('the situa tion was complex'),
   ['tion']);

eq('"ness" standalone → flagged',
   detectSuspectOcrTokens('happi ness is key'),
   ['ness']);

// All-consonant fragments
eq('"tht" + "mat" both flagged — uncommon 3-letter tokens not in allowlist',
   detectSuspectOcrTokens('the cat sat tht mat'),
   ['tht', 'mat']);
// "mat" is a real word but not in our common-word allowlist. False positive
// is acceptable — biased toward flagging > missing real misreads.

// Essie's exact reported tokens
eq('Essie "ar" 2-letter not-in-list → flagged',
   detectSuspectOcrTokens('we ar a class'),
   ['ar']);

eq('Essie "hav" 3-letter not-in-list → flagged',
   detectSuspectOcrTokens('we are hav lunch'),
   ['hav']);

eq('full Essie sentence → both fragments flagged',
   detectSuspectOcrTokens('we ar hav ing a great class'),
   ['ar', 'hav', 'ing']);

// Single-char non-words
eq('single "x" → flagged',
   detectSuspectOcrTokens('the cat x sat'),
   ['x']);

eq('single "a" → NOT flagged (valid word)',
   detectSuspectOcrTokens('a cat sat there'),
   []);

eq('single "I" → NOT flagged (valid word)',
   detectSuspectOcrTokens('I am tired'),
   []);

eq('single "i" lowercase → NOT flagged (rule allows)',
   detectSuspectOcrTokens('it was i'),
   []);

// Hyphens
eq('lowercase mid-hyphen → flagged',
   detectSuspectOcrTokens('the wri-ting was bad'),
   ['wri-ting']);

eq('Capitalized hyphenated (proper noun) → NOT flagged',
   detectSuspectOcrTokens('Mother-in-law was here'),
   []);

// Dedup
eq('duplicate suspect tokens shown once',
   detectSuspectOcrTokens('ing ing ing other text'),
   ['ing']);

// Punctuation cleanup
eq('trailing comma stripped for analysis',
   detectSuspectOcrTokens('hav, ing! the day.'),
   ['hav,', 'ing!']);

// Limit to 8 suspects
eq('caps at 8 suspect tokens',
   detectSuspectOcrTokens('x y z q w p k j m n b'),
   ['x', 'y', 'z', 'q', 'w', 'p', 'k', 'j']);

// Common short words NOT flagged (every word in our allowlist)
eq('"the" not flagged', detectSuspectOcrTokens('the dog ran'), []);
eq('"and" not flagged', detectSuspectOcrTokens('cats and dogs'), []);
eq('"you" not flagged', detectSuspectOcrTokens('how are you'), []);
eq('"for" not flagged', detectSuspectOcrTokens('this is for you'), []);
eq('"are" not flagged', detectSuspectOcrTokens('we are happy'), []);
eq('"was" not flagged', detectSuspectOcrTokens('it was fun'), []);
eq('"can" not flagged', detectSuspectOcrTokens('you can do it'), []);
eq('"but" not flagged', detectSuspectOcrTokens('yes but no'), []);
eq('"got" not flagged', detectSuspectOcrTokens('we got it'), []);
eq('"new" not flagged', detectSuspectOcrTokens('a new day'), []);

// Long words with internal "ing" etc — should NOT be flagged (full word)
eq('"having" not flagged',
   detectSuspectOcrTokens('we were having lunch'),
   []);

eq('"running" not flagged',
   detectSuspectOcrTokens('the boy was running'),
   []);

eq('"action" not flagged (contains "tion" as substring)',
   detectSuspectOcrTokens('the action was fast'),
   []);

// 4+ letter unusual tokens — NOT flagged by current rules (length-bounded)
eq('"xyzq" 4-letter weird → NOT flagged (rules only fire on 2-3 letters)',
   detectSuspectOcrTokens('a xyzq word'),
   []);

// Capital letter words 2-3 letters not in list (e.g. acronyms)
eq('"USA" → flagged (3 letters, not in lowercase common list)',
   detectSuspectOcrTokens('the USA is big'),
   ['USA']);
// Note: this is a false positive but acceptable — most OCR'd handwriting
// won't include real acronyms, and if it does the user can ignore the
// flag (the textarea is still editable).

// Numbers — NOT flagged
eq('numbers not flagged',
   detectSuspectOcrTokens('there are 100 cats and 200 dogs'),
   []);

// Punctuation-only "tokens" — defensive
eq('punctuation-only tokens not flagged',
   detectSuspectOcrTokens('hello — , . world'),
   []);

// Mixed: real handwriting recovery scenario after collapseSoftWraps
eq('post-collapseSoftWraps Essie chain',
   detectSuspectOcrTokens(collapseSoftWraps('we ar hav\ning a great class')),
   ['ar', 'hav', 'ing']);

// Mixed: post-collapse with internal hyphenation recovered
eq('post-collapse hyphenated wrap leaves no suspects',
   detectSuspectOcrTokens(collapseSoftWraps('the lesson was inter-\nesting and fun')),
   []);

// Stress: very long input — performance + correctness
const longClean = 'the dog ran around the park and then the cat came over to play with him for a while before they both got tired and went home to sleep '.repeat(20);
eq('long clean text → empty suspect list', detectSuspectOcrTokens(longClean), []);

// ───────────────────────────────────────────────────────────────────────────
// Report
// ───────────────────────────────────────────────────────────────────────────
console.log(`\n── RESULT ──`);
console.log(`PASS: ${pass}`);
console.log(`FAIL: ${fail}`);
if (fail) {
  console.log(`\nFAILURES:`);
  for (const f of fails) {
    console.log(`\n  ${f.label}`);
    console.log(`    actual:   ${JSON.stringify(f.actual)}`);
    console.log(`    expected: ${JSON.stringify(f.expected)}`);
  }
  process.exit(1);
}
process.exit(0);
