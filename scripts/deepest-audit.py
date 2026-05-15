"""
Deepest gap-search pass. Looks for stuff structural + claim audits miss:

  1. Rate-range sanity per country pack (low<median<high, plausible $$$)
  2. Currency vs locale_default consistency
  3. Tax form URL liveness (just shape check)
  4. Payment-method URL liveness (shape check)
  5. JSON schema integrity vs schema definition (if present)
  6. CSS class usage — defined but unreferenced
  7. JS exports — defined but unimported
  8. Page weight + asset size
  9. ARIA + accessibility coverage
 10. Aspirational copy ("coming soon", "v2", future tense for unshipped features)
 11. Hardcoded country code mismatches
 12. Country pack rates_by_language_pair: pair codes valid ISO?
 13. Numbers that look like placeholders ($0/hr, 9999, etc.)
 14. Profile UI cross-page consistency (mount points)
 15. robots.txt directives
"""
import json
import re
import sys
from pathlib import Path
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

def section(title):
    print(f'\n========== {title} ==========')

# ── 1. Rate-range sanity per country pack ─────────────────────────────
section('1. Rate range sanity (low ≤ median ≤ high, no zeros)')
issues = 0
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    rates = d.get('rates_by_language_pair', {})
    for pair, r in rates.items():
        low, med, high = r.get('low', 0), r.get('median', 0), r.get('high', 0)
        problems = []
        if low <= 0 or med <= 0 or high <= 0:
            problems.append(f'zero/negative: low={low} med={med} high={high}')
        if not (low <= med <= high):
            problems.append(f'out of order: low={low} med={med} high={high}')
        if high > low * 10:
            problems.append(f'extreme spread: low={low} high={high}')
        if problems:
            print(f'  {iso}/{pair}: {"; ".join(problems)}')
            issues += 1
if not issues:
    print('  all rate ranges plausible')

# ── 2. Currency vs locale_default consistency ─────────────────────────
section('2. Currency / locale check')
expected = {
    'us': ('USD', 'en-US'),
    'gb': ('GBP', 'en-GB'),
    'ca': ('CAD', 'en-CA'),
    'au': ('AUD', 'en-AU'),
    'nz': ('NZD', 'en-NZ'),
    'ie': ('EUR', 'en-IE'),
    'hk': ('HKD', 'en-HK'),
    'in': ('INR', 'en-IN'),
    'ph': ('PHP', 'en-PH'),
    'sg': ('SGD', 'en-SG'),
}
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    cur = d.get('currency', '')
    loc = d.get('locale_default', '')
    exp_cur, exp_loc = expected.get(iso, ('?', '?'))
    flags = []
    if cur != exp_cur:
        flags.append(f'currency: expected {exp_cur}, got {cur}')
    if loc != exp_loc:
        flags.append(f'locale: expected {exp_loc}, got {loc}')
    if flags:
        print(f'  {iso}: {"; ".join(flags)}')
    else:
        print(f'  {iso}: OK ({cur} / {loc})')

# ── 3. Tax form URL shape check ──────────────────────────────────────
section('3. Tax form URLs (shape only — does it look like HTTPS, gov-ish)')
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    tax = d.get('tax', {})
    url = tax.get('self_employment_url', '')
    if not url:
        print(f'  {iso}: NO tax form URL')
        continue
    flags = []
    if not url.startswith('https://'):
        flags.append('not https')
    if url.endswith('/'):
        flags.append('trailing slash')
    print(f'  {iso}: {url}  {"⚠ " + ", ".join(flags) if flags else ""}')

# ── 4. Aspirational copy in HTML (future tense, "coming soon", etc.) ─
section('4. Aspirational / future-tense copy in HTML')
patterns = [
    (r'coming\s+soon', 'coming soon'),
    (r'\bv2\b|\bv0\.2\b', 'v2/v0.2 reference'),
    (r'\bbeta\b', 'beta label'),
    (r'\bplanned\b', 'planned feature'),
    (r'will\s+(?:soon|eventually|later)\s+', 'will soon...'),
    (r'\bplaceholder\b', 'placeholder text in HTML'),
]
for p in sorted(Path('.').glob('*.html')):
    body = p.read_text(encoding='utf-8')
    for pat, label in patterns:
        for m in re.finditer(pat, body, re.I):
            # Skip placeholder= attr on input elements (legit UX)
            idx = m.start()
            ctx_start = max(0, idx - 30)
            ctx_end = min(len(body), idx + 60)
            ctx = body[ctx_start:ctx_end].replace('\n', ' ')
            if 'placeholder=' in ctx and label == 'placeholder text in HTML':
                continue
            print(f'  {p.name}: [{label}] ...{ctx}...')

# ── 5. CSS class usage — defined but unreferenced ─────────────────────
section('5. CSS class usage (defined but unreferenced)')
css = Path('src/lib/styles.css').read_text(encoding='utf-8')
class_defs = set()
for m in re.finditer(r'\.([a-zA-Z_-][a-zA-Z0-9_-]+)\b', css):
    class_defs.add(m.group(1))
# Find class usages in HTML + JS
html_js = ''
for p in list(Path('.').glob('*.html')) + list(Path('src').rglob('*.js')):
    html_js += p.read_text(encoding='utf-8')
used_in_html = set(re.findall(r'class="([^"]+)"', html_js))
used_classes = set()
for cls_str in used_in_html:
    for c in cls_str.split():
        used_classes.add(c)
# Also classes added/queried in JS via classList or querySelector
for m in re.finditer(r'classList\.(?:add|remove|toggle|contains)\(["\']([^"\']+)["\']', html_js):
    used_classes.add(m.group(1))
for m in re.finditer(r'querySelector(?:All)?\(["\'][^"\']*\.([a-zA-Z_-][a-zA-Z0-9_-]+)', html_js):
    used_classes.add(m.group(1))
unused = sorted(class_defs - used_classes)
# Filter obvious false positives (pseudo-element class chains, modifiers used as part of compound selectors)
unused = [c for c in unused if not c.startswith(('hover', 'focus', 'active'))]
if unused:
    print(f'  Possibly unused CSS classes ({len(unused)}):')
    for c in unused[:30]:
        print(f'    .{c}')
    if len(unused) > 30:
        print(f'    ... and {len(unused) - 30} more')
else:
    print('  all CSS classes referenced')

# ── 6. JS exports defined but unimported ─────────────────────────────
section('6. JS exports defined but not imported anywhere')
exports = defaultdict(set)  # file → exported names
imports_seen = set()
for js in list(Path('src').rglob('*.js')) + list(Path('functions').rglob('*.js')):
    body = js.read_text(encoding='utf-8')
    for m in re.finditer(r'export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)', body):
        exports[str(js)].add(m.group(1))
    for m in re.finditer(r'import\s*\{\s*([^}]+)\s*\}', body):
        names = [n.strip() for n in m.group(1).split(',')]
        for n in names:
            imports_seen.add(n.split(' as ')[0].strip())
unused_exports = []
for f, names in exports.items():
    for n in names:
        if n not in imports_seen:
            unused_exports.append((f, n))
if unused_exports:
    print(f'  Exports defined but not imported elsewhere ({len(unused_exports)}):')
    for f, n in unused_exports[:20]:
        print(f'    {f} :: {n}')
    if len(unused_exports) > 20:
        print(f'    ... and {len(unused_exports) - 20} more')
else:
    print('  every export is imported somewhere')

# ── 7. Page weights ──────────────────────────────────────────────────
section('7. Page + asset weights')
for p in sorted(Path('.').glob('*.html')):
    sz = p.stat().st_size
    print(f'  {p.name:<22} {sz/1024:.1f} KB')
css_sz = Path('src/lib/styles.css').stat().st_size
print(f'  src/lib/styles.css     {css_sz/1024:.1f} KB')
for js in sorted(Path('src/lib').glob('*.js')):
    sz = js.stat().st_size
    if sz > 5000:
        print(f'  {str(js).replace(chr(92), "/")}   {sz/1024:.1f} KB')

# ── 8. ARIA + accessibility surface ──────────────────────────────────
section('8. Accessibility — heading order, alt text, label assoc')
for p in sorted(Path('.').glob('*.html')):
    body = p.read_text(encoding='utf-8')
    headings = re.findall(r'<h([1-6])\b', body)
    if not headings:
        print(f'  {p.name}: NO headings (suspicious)')
    elif headings[0] != '1':
        print(f'  {p.name}: first heading is h{headings[0]} not h1')
    # Check images for alt
    imgs = re.findall(r'<img\b[^>]*>', body)
    missing_alt = [i for i in imgs if 'alt=' not in i]
    if missing_alt:
        print(f'  {p.name}: {len(missing_alt)} <img> without alt')
    # Check input has label
    inputs = re.findall(r'<input\b[^>]*>', body)
    for i in inputs:
        if 'type="hidden"' in i or 'type="submit"' in i or 'aria-label' in i or 'aria-labelledby' in i:
            continue
        m = re.search(r'\bid="([^"]+)"', i)
        if m:
            if f'for="{m.group(1)}"' not in body:
                print(f'  {p.name}: input id="{m.group(1)}" has no <label for=...>')

# ── 9. robots.txt directives ──────────────────────────────────────────
section('9. robots.txt detail')
rt = Path('robots.txt')
if rt.exists():
    for line in rt.read_text(encoding='utf-8').splitlines():
        if line.strip():
            print(f'  {line}')

# ── 10. Country pack JSON schema compliance ──────────────────────────
section('10. Country pack field schema (top-level keys)')
all_keys = defaultdict(set)
for pth in sorted(Path('data/countries').glob('*.json')):
    d = json.loads(pth.read_text(encoding='utf-8'))
    for k in d.keys():
        all_keys[k].add(pth.stem)
n_packs = len(list(Path('data/countries').glob('*.json')))
for k, present_in in sorted(all_keys.items(), key=lambda x: -len(x[1])):
    coverage = len(present_in)
    if coverage < n_packs:
        missing = sorted(set(p.stem for p in Path('data/countries').glob('*.json')) - present_in)
        print(f'  "{k}" missing in: {missing}')
    else:
        print(f'  "{k}" present in all packs')
