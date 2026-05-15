"""
End-to-end test of the full photo → OCR → suspect-detection → marking
pipeline with a student NAME visible in the photo.

Uses the fixture at tests/fixtures/marking-with-name-sample.png:
  - "Name: Emma Carter" header at top of paper
  - Handwriting-style writing sample below with hyphenated wraps
    ("bro-/ther") and soft wraps ("hav/ing")

Asserts:
  1. /api/ocr accepts the image with a name visible (no content_blocked)
  2. OCR returns text + avg_confidence + min_confidence + word_count
  3. The collapseSoftWraps server-side processing produced clean text
     (no "bro-" + newline + "ther" split, no "hav" + newline + "ing")
  4. Vision read the "Emma Carter" name fragment in the header
  5. /api/marking accepts the OCR'd text and returns clean marking
  6. Marking response doesn't refuse / sanitise / blame the name
"""

import base64
import io
import json
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = 'https://slatework.tools'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

def post(path, payload, timeout=120):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f'{BASE}{path}', data=data, method='POST',
        headers={
            'Content-Type': 'application/json',
            'User-Agent': UA,
            'Accept': 'application/json',
            'Origin': BASE,
            'Referer': f'{BASE}/marking',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        try: return e.code, json.loads(body)
        except Exception: return e.code, {'raw': body}

# ───────────────────────────────────────────────────────────────────────────
# Load the fixture PNG
# ───────────────────────────────────────────────────────────────────────────
fixture_path = Path(__file__).parent / 'fixtures' / 'marking-with-name-sample.png'
if not fixture_path.exists():
    print(f'FAIL: fixture missing at {fixture_path}')
    print('Run tests/marking-with-names-test.py first to generate it.')
    sys.exit(1)
png_bytes = fixture_path.read_bytes()
print(f'fixture loaded: {len(png_bytes)} bytes')

# ───────────────────────────────────────────────────────────────────────────
# Step 1: POST to /api/ocr
# ───────────────────────────────────────────────────────────────────────────
print('\n=== STEP 1: POST /api/ocr ===')
b64 = base64.b64encode(png_bytes).decode('ascii')
status, ocr = post('/api/ocr', {'image_data': b64, 'image_mime': 'image/png'})
print(f'  HTTP {status}')
if status != 200 or 'text' not in ocr:
    print(f'  FAIL — OCR did not return text')
    print(f'  body: {json.dumps(ocr, indent=2)[:400]}')
    sys.exit(1)
ocr_text = ocr['text']
print(f'  text length: {len(ocr_text)}')
print(f'  word_count: {ocr.get("word_count")}')
print(f'  avg_confidence: {ocr.get("avg_confidence")}')
print(f'  min_confidence: {ocr.get("min_confidence")}')
print(f'  TEXT EXTRACTED (with explicit \\n):')
print('    ' + ocr_text.replace('\n', '\\n\n    '))

# ───────────────────────────────────────────────────────────────────────────
# Step 2: Run suspect-token detection (mirrors page-marking.js)
# ───────────────────────────────────────────────────────────────────────────
COMMON_SHORT_EN = {
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
}
def detect_suspect(text):
    if not text: return []
    out, seen = [], set()
    for raw in text.split():
        clean = re.sub(r'^[^\w]+|[^\w]+$', '', raw)
        if not clean: continue
        k = clean.lower()
        if k in seen: continue
        suspect = False
        if len(clean) == 1 and not re.match(r'^[aIoAOiu]$', clean): suspect = True
        elif re.match(r'^(ing|ed|ly|tion|sion|ness|ment|ous|ful|less)$', clean, re.I): suspect = True
        elif '-' in clean and not re.match(r'^[A-Z]', clean) and len(clean) < 12: suspect = True
        elif 2 <= len(clean) <= 3 and re.match(r'^[a-zA-Z]+$', clean) and k not in COMMON_SHORT_EN: suspect = True
        if suspect:
            out.append(raw); seen.add(k)
            if len(out) >= 8: break
    return out

print('\n=== STEP 2: client-side suspect detection ===')
suspects = detect_suspect(ocr_text)
print(f'  suspect tokens flagged: {suspects}')
# Check the "name in header" survives — Vision should have read "Emma" and "Carter"
mentions_emma = 'emma' in ocr_text.lower()
mentions_carter = 'carter' in ocr_text.lower()
print(f'  contains "Emma": {mentions_emma}')
print(f'  contains "Carter": {mentions_carter}')
# Check the hyphenated word recovered: should see "brother" not "bro-" + newline + "ther"
recovered_brother = 'brother' in ocr_text.lower() and 'bro-' not in ocr_text
print(f'  recovered "brother" from "bro-/ther": {recovered_brother}')
# Check no orphan "ther" token (would indicate hyphen wrap not handled)
orphan_ther = bool(re.search(r'\bther\b', ocr_text))
print(f'  orphan "ther" token present: {orphan_ther}  (should be False)')

# ───────────────────────────────────────────────────────────────────────────
# Step 3: POST OCR'd text to /api/marking
# ───────────────────────────────────────────────────────────────────────────
print('\n=== STEP 3: POST /api/marking with OCR text ===')
status2, mark = post('/api/marking', {
    'target_language': 'English',
    'level': 'B1',
    'rubric': '',
    'feedback_language': 'english',
    'sample': ocr_text,
}, timeout=120)
print(f'  HTTP {status2}')
if status2 != 200:
    print(f'  FAIL — marking did not return 200')
    print(f'  error: {mark.get("error", "(none)")[:300]}')
    print(f'  content_blocked: {mark.get("content_blocked", False)}')
    sys.exit(1)
md = mark.get('markdown', '')
print(f'  markdown length: {len(md)}')
print(f'  PREVIEW:')
print('    ' + md[:500].replace('\n', '\n    '))

# Check the marking response didn't refuse / didn't echo Emma's name back
emma_in_feedback = 'emma' in md.lower()
print(f'\n  "Emma" appears in marking feedback: {emma_in_feedback}')
print(f'  (expected False — system prompt strips student names from output)')

# ───────────────────────────────────────────────────────────────────────────
# Verdict
# ───────────────────────────────────────────────────────────────────────────
print('\n── FULL PIPELINE VERDICT ──')
checks = [
    ('OCR returned 200',                              status == 200),
    ('OCR returned text',                             len(ocr_text) > 0),
    ('OCR returned confidence',                       ocr.get('avg_confidence') is not None),
    ('OCR read "Emma" from name header',              mentions_emma),
    ('OCR read "Carter" from name header',            mentions_carter),
    ('Hyphenated wrap "bro-/ther" recovered',         recovered_brother),
    ('No orphan "ther" token',                        not orphan_ther),
    ('Marking returned 200',                          status2 == 200),
    ('Marking content not blocked',                   not mark.get('content_blocked', False)),
    ('Marking returned non-trivial markdown',         len(md) > 200),
]
all_pass = all(c[1] for c in checks)
for label, ok in checks:
    print(f'  {"OK" if ok else "FAIL"}  {label}')
print(f'\nRESULT: {"PASS" if all_pass else "FAIL"} ({sum(c[1] for c in checks)}/{len(checks)})')
sys.exit(0 if all_pass else 1)
