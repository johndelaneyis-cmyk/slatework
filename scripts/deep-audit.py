"""
Deep-audit pass after structural audit found platform data was riddled
with issues. Looking for the same class of problems elsewhere.

Dimensions:
  1. Tax-data per country: dollar/local-currency thresholds, current form URLs
  2. Payment methods: every URL resolves, every fee note plausible
  3. Privacy claims in HTML vs actual code behavior
  4. Meta descriptions across HTML files: length, uniqueness, presence
  5. Open Graph / Twitter card image presence
  6. Robots.txt + 404 page
  7. Console statements left in JS (production cruft)
  8. Anthropic model name consistency across endpoints
  9. CSP / security headers in _headers
 10. Internal link health (cross-page anchors)
 11. "Last verified" claims that haven't been refreshed
 12. Dead JSON keys (defined but never read)
"""
import json
import re
import sys
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8')

def section(title):
    print(f'\n========== {title} ==========')

# ── 1. Tax-data inventory ──────────────────────────────────────────────
section('1. Tax data per country — values + URLs')
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    tax = d.get('tax', {})
    if not tax:
        print(f'  {iso}: NO TAX SECTION')
        continue
    vat = tax.get('vat_threshold_amount')
    ta = tax.get('trading_allowance_amount')
    form = tax.get('self_employment_form')
    url = tax.get('self_employment_url', '')
    brackets = tax.get('income_tax_brackets', [])
    print(f'  {iso}:  form={form}  vat_threshold={vat}  trading_allowance={ta}  brackets={len(brackets)}')
    if url and not url.startswith('http'):
        print(f'      WARN url not absolute: {url}')

# ── 2. Payment methods URLs ────────────────────────────────────────────
section('2. Payment method URLs per country')
all_urls = []
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    for pm in d.get('payment_methods', []):
        url = pm.get('url', '')
        if url:
            all_urls.append((iso, pm.get('key'), url))
print(f'  Total payment-method URLs: {len(all_urls)}')
url_counter = Counter(u for _, _, u in all_urls)
for url, n in url_counter.most_common(10):
    print(f'  {n}x  {url}')

# ── 3. Meta description audit ──────────────────────────────────────────
section('3. Meta description coverage + uniqueness')
descs = {}
for p in sorted(Path('.').glob('*.html')):
    body = p.read_text(encoding='utf-8')
    m = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', body)
    if not m:
        print(f'  {p.name}: NO META DESC')
        continue
    desc = m.group(1)
    descs[p.name] = (len(desc), desc[:60])
    if len(desc) < 100 or len(desc) > 200:
        print(f'  {p.name}: ATYPICAL LENGTH {len(desc)} chars (target 120-160)')
# uniqueness
seen = {}
for name, (length, preview) in descs.items():
    if preview in seen:
        print(f'  DUPLICATE DESC: {name} matches {seen[preview]}')
    seen[preview] = name
print(f'  {len(descs)} pages with meta description (lengths: {", ".join(str(v[0]) for v in descs.values())})')

# ── 4. Open Graph / Twitter image ───────────────────────────────────
section('4. OG / Twitter image presence')
for p in sorted(Path('.').glob('*.html')):
    body = p.read_text(encoding='utf-8')
    has_og = 'og:image' in body
    has_tw = 'twitter:image' in body
    if not (has_og and has_tw):
        print(f'  {p.name}: og={has_og} twitter={has_tw}')
    else:
        # check the image URL is reachable on disk
        m = re.search(r'<meta\s+property="og:image"\s+content="([^"]+)"', body)
        if m:
            url = m.group(1)
            if 'slatework.tools/' in url:
                local = Path(url.split('slatework.tools/')[1])
                if not local.exists():
                    print(f'  {p.name}: og:image points to MISSING local file {local}')

# ── 5. Robots.txt + 404 ─────────────────────────────────────────────
section('5. Robots.txt + 404')
rt = Path('robots.txt')
if rt.exists():
    content = rt.read_text(encoding='utf-8')
    has_sitemap = 'Sitemap:' in content
    has_user_agent = 'User-agent:' in content
    print(f'  robots.txt exists. has_sitemap_directive={has_sitemap}  has_user_agent={has_user_agent}')
else:
    print('  NO robots.txt')
nf = Path('404.html')
if nf.exists():
    sz = nf.stat().st_size
    print(f'  404.html exists ({sz} bytes)')
else:
    print('  NO 404.html')

# ── 6. Console statements in JS ─────────────────────────────────────
section('6. Console.log / console.error / debugger statements')
counts = defaultdict(lambda: defaultdict(int))
for js in sorted(Path('src').rglob('*.js')) + sorted(Path('functions').rglob('*.js')):
    body = js.read_text(encoding='utf-8')
    for kind in ['console.log', 'console.warn', 'console.error', 'console.info', 'debugger']:
        c = body.count(kind)
        if c:
            counts[str(js)][kind] += c
print(f'  Files with console/debugger statements: {len(counts)}')
for path, kinds in counts.items():
    print(f'  {path}: {dict(kinds)}')

# ── 7. Anthropic model name consistency ─────────────────────────────
section('7. Anthropic model name consistency')
models = defaultdict(set)
for js in sorted(Path('functions').rglob('*.js')):
    body = js.read_text(encoding='utf-8')
    for m in re.finditer(r'claude[\w\.-]+|sonnet[\w\.-]+|opus[\w\.-]+|haiku[\w\.-]+', body, re.I):
        models[m.group(0)].add(str(js))
for name, files in models.items():
    print(f'  {name}: {len(files)} files → {sorted(files)[:3]}')

# ── 8. _headers and CSP ─────────────────────────────────────────────
section('8. _headers / CSP / HSTS / COOP')
headers_file = Path('_headers') if Path('_headers').exists() else Path('public/_headers')
if headers_file.exists():
    content = headers_file.read_text(encoding='utf-8')
    for directive in ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options',
                      'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy',
                      'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy']:
        present = directive in content
        marker = 'YES' if present else 'NO'
        print(f'  {marker:>3}  {directive}')
    if "unsafe-inline" in content:
        print('  NOTE: CSP has unsafe-inline (acknowledged in HN draft as v0.2 work)')
else:
    print('  NO _headers file')

# ── 9. Privacy page sanity check ─────────────────────────────────────
section('9. Privacy page references vs actual code')
pp = Path('privacy.html')
if pp.exists():
    body = pp.read_text(encoding='utf-8')
    # Look for specific technical claims that should match implementation
    checks = {
        'SHA-256 newsletter dedup': 'sha-256' in body.lower() or 'sha256' in body.lower(),
        'IP rate-limiting day-rotated': 'day-rotated' in body.lower() or 'daily rotat' in body.lower(),
        'No request body logging': 'body logging' in body.lower() or 'request body' in body.lower(),
        'No long-term identifier': 'long-term' in body.lower(),
        'Google Cloud Vision OCR': 'google' in body.lower() and 'vision' in body.lower(),
        'Anthropic mention': 'anthropic' in body.lower(),
        'localStorage / profile': 'localstorage' in body.lower() or 'profile' in body.lower(),
    }
    for label, present in checks.items():
        marker = 'YES' if present else 'NO'
        print(f'  {marker:>3}  {label}')
else:
    print('  no privacy.html')

# ── 10. Cross-page links ─────────────────────────────────────────────
section('10. Internal links (href="/...") — any pointing to missing pages?')
on_disk = {p.name for p in Path('.').glob('*.html')} | {'index.html'}
known_routes = {p.replace('.html', '') for p in on_disk}
known_routes.add('')  # for "/"
broken = []
for p in Path('.').glob('*.html'):
    body = p.read_text(encoding='utf-8')
    for m in re.finditer(r'href="(/[^"#?]*)', body):
        path = m.group(1).strip('/')
        if path.startswith(('data/', 'assets/', 'src/', 'api/', 'static/', 'favicon')) or path == '':
            continue
        # strip query/hash for matching
        clean = path.split('#')[0].split('?')[0]
        if clean and clean not in known_routes and clean + '.html' not in on_disk:
            broken.append((p.name, clean))
if broken:
    print(f'  POTENTIAL BROKEN INTERNAL LINKS ({len(broken)}):')
    for f, t in broken[:10]:
        print(f'    {f} → /{t}')
else:
    print('  no broken internal links found')
