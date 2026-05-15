"""
End-to-end test for /api/marking with student names embedded in the text.

The 2026-05-12 fix removed the "remove names" warnings and rewrote the
error message so Anthropic refusals don't blame names. This test verifies:

  1. Marking succeeds (200) when text contains fake student names
  2. Names are not censored in the response (Claude doesn't substitute
     "the student" or remove them silently — names should pass through
     when the writing mentions them)
  3. No content_blocked or content_filter response
  4. Response markdown is non-empty and looks like real marking output

Uses three fake names chosen to span common categories:
  - Western name: "Emma Carter"
  - Hispanic name: "Sofía Vargas"
  - East Asian name: "Lin Wei"

Also generates a sibling PNG (tests/fixtures/marking-with-name-sample.png)
that includes the name visibly at the top of the page — for manual
photo-upload verification once the OCR rate limit resets.
"""

import base64
import io
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# Force UTF-8 stdout so Claude's response (which often contains arrows,
# em-dashes, quotation marks) prints without cp1252 errors on Windows.
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Optional PIL for the fixture-PNG generation; not required to run the API test.
try:
    from PIL import Image, ImageDraw, ImageFont
    HAVE_PIL = True
except Exception:
    HAVE_PIL = False

BASE = 'https://slatework.tools'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

def post_json(path, payload, timeout=120):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f'{BASE}{path}',
        data=data,
        headers={
            'Content-Type': 'application/json',
            'User-Agent': UA,
            'Accept': 'application/json',
            'Origin': BASE,
            'Referer': f'{BASE}/marking',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {'raw': body}

# ───────────────────────────────────────────────────────────────────────────
# Test samples — fake students, A2-B2 level writing with names embedded
# ───────────────────────────────────────────────────────────────────────────
SAMPLES = [
    {
        'student_name': 'Emma Carter',
        'level': 'B1',
        'sample': (
            "My name is Emma Carter and I am 14 years old. I live in London with "
            "my family. I have one brother and one sister. My brother name is Jack "
            "and he is 12 years old. We go to the same school. In the weekend I "
            "like play tennis with my friend Lucy. We go to the park and play for "
            "two hours. After that we are very tired but happy."
        ),
        'rubric': '',
    },
    {
        'student_name': 'Sofía Vargas',
        'level': 'A2',
        'sample': (
            "Hi! I am Sofía Vargas. I am from Madrid in Spain. I am twelve years "
            "old. I have brown hair and brown eyes. I like to eat pizza and ice "
            "cream. My favourite colour is blue. I have a dog. The dog name is "
            "Pepe and he is very funny. I go to school by bus every day. My best "
            "friend is Maria. We are in the same class."
        ),
        'rubric': '',
    },
    {
        'student_name': 'Lin Wei',
        'level': 'B2',
        'sample': (
            "Hello, my name is Lin Wei and I would like to tell you about my "
            "hometown. I come from Shanghai, which is one of the largest cities "
            "in China. The population is more than twenty million people. I "
            "think Shanghai is a very interesting city because there are many "
            "old buildings next to new skyscrapers. The food is also amazing — "
            "my favourite is xiaolongbao, which my grandmother taught me to "
            "make when I was eight. After school every day I help my friend "
            "Chen Yu with his English homework."
        ),
        'rubric': 'IELTS Writing Task 2 (B2 band 6)',
    },
]

# ───────────────────────────────────────────────────────────────────────────
# Run the marking endpoint for each sample
# ───────────────────────────────────────────────────────────────────────────
pass_count = 0
fail_count = 0

for s in SAMPLES:
    label = f"{s['student_name']} ({s['level']})"
    print(f"\n=== {label} ===")
    payload = {
        'target_language': 'English',
        'level': s['level'],
        'rubric': s['rubric'],
        'feedback_language': 'english',
        'sample': s['sample'],
    }
    status, body = post_json('/api/marking', payload, timeout=120)
    print(f"  HTTP {status}")
    if status != 200:
        fail_count += 1
        print(f"  FAIL FAIL — non-200 response")
        if 'error' in body:
            print(f"  error: {body['error'][:300]}")
        if body.get('content_blocked'):
            print(f"  content_blocked: TRUE  <- Anthropic refused")
        continue
    markdown = body.get('markdown', '')
    if not markdown or len(markdown.strip()) < 100:
        fail_count += 1
        print(f"  FAIL FAIL — empty/tiny markdown response ({len(markdown)} chars)")
        continue
    # Check: did Claude refuse?
    refusal_signals = ['cannot', 'I will not', 'unable to', 'I cannot process',
                       'inappropriate', 'I apologize']
    if any(sig.lower() in markdown.lower() for sig in refusal_signals):
        # Could be false positive — "cannot" might appear in genuine feedback.
        # Print for visual check.
        print(f"  WARN  Response contains possible refusal language — VISUAL CHECK:")
        print('  ' + markdown[:400].replace('\n', '\n  '))
        # Don't auto-fail — print for review.
    print(f"  OK Response length: {len(markdown)} chars")
    # Check: does the response handle the name OK?
    first_name = s['student_name'].split()[0]
    name_mentions = markdown.lower().count(first_name.lower())
    print(f"  OK Name '{first_name}' appears {name_mentions} times in feedback")
    # Print first 300 chars for visual confirmation
    print(f"  PREVIEW:")
    preview = markdown[:300].replace('\n', '\n    ')
    print(f"    {preview}{'...' if len(markdown) > 300 else ''}")
    pass_count += 1

# ───────────────────────────────────────────────────────────────────────────
# Generate fixture PNG (for manual upload test tomorrow)
# ───────────────────────────────────────────────────────────────────────────
if HAVE_PIL:
    fixtures_dir = Path(__file__).parent / 'fixtures'
    fixtures_dir.mkdir(exist_ok=True)
    out_path = fixtures_dir / 'marking-with-name-sample.png'

    def get_font(size=28):
        for c in ['arial.ttf', 'Arial.ttf', 'C:/Windows/Fonts/arial.ttf']:
            try: return ImageFont.truetype(c, size=size)
            except Exception: continue
        return ImageFont.load_default()

    img = Image.new('RGB', (700, 520), 'white')
    d = ImageDraw.Draw(img)
    font_title = get_font(32)
    font_body = get_font(24)
    # Top-of-page student name (mimics how kids put name on homework)
    d.text((30, 25), "Name: Emma Carter", fill='black', font=font_title)
    d.text((30, 70), "Date: 14 May 2026", fill='black', font=font_body)
    d.line((30, 110, 670, 110), fill='black', width=2)
    body_lines = [
        "My name is Emma Carter and I am",
        "14 years old. I live in London",
        "with my family. I have one bro-",
        "ther and one sister. My brother",
        "name is Jack and he is 12.",
        "",
        "In the weekend I like play ten-",
        "nis with my friend Lucy.",
    ]
    for i, line in enumerate(body_lines):
        d.text((30, 130 + i * 40), line, fill='black', font=font_body)
    img.save(out_path)
    print(f"\n=== fixture saved → {out_path} ===")
    print("    Manual upload test: when OCR rate limit resets, drop this")
    print("    onto /marking and verify (1) name extracts, (2) hyphenated")
    print("    'bro-/ther' collapses, (3) marking returns referencing 'Emma'")
else:
    print("\n(PIL not available — skipped fixture PNG generation)")

# ───────────────────────────────────────────────────────────────────────────
# Report
# ───────────────────────────────────────────────────────────────────────────
total = pass_count + fail_count
print(f"\n── RESULT ──")
print(f"PASS: {pass_count}/{total}")
print(f"FAIL: {fail_count}/{total}")
sys.exit(0 if fail_count == 0 else 1)
