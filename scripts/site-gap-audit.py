"""
Site-wide gap audit covering multiple dimensions:
  - Tax-data freshness per country pack
  - Payment-methods coverage
  - Language-pair coverage
  - Privacy page outdated claims
  - Sitemap completeness vs HTML files on disk
  - External link health (count, doesn't fetch)
  - Stale dates / version stamps in HTML
"""
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

def section(title):
    print(f'\n=== {title} ===')

# ── 1. Tax data per country ────────────────────────────────────────────
section('Tax data per country')
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    tax = d.get('tax') or {}
    if not tax:
        print(f'  {iso}: NO tax data')
        continue
    print(f'  {iso}: keys={list(tax.keys())}')

# ── 2. Payment methods per country ─────────────────────────────────────
section('Payment-method count per country')
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    pm = d.get('payment_methods') or []
    print(f'  {iso}: {len(pm)} payment methods')

# ── 3. Language pair coverage ──────────────────────────────────────────
section('Language pair coverage')
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    pairs = list(d.get('rates_by_language_pair', {}).keys())
    print(f'  {iso}: {len(pairs)} pairs → {pairs[:6]}{"..." if len(pairs) > 6 else ""}')

# ── 4. Sitemap vs HTML files ───────────────────────────────────────────
section('Sitemap vs HTML files on disk')
html_files = sorted([p.name for p in Path('.').glob('*.html') if p.name not in ('404.html',)])
sitemap_path = Path('sitemap.xml')
if sitemap_path.exists():
    sm_content = sitemap_path.read_text(encoding='utf-8')
    sm_urls = re.findall(r'<loc>([^<]+)</loc>', sm_content)
    sm_paths = [u.rstrip('/').split('/')[-1] or 'index' for u in sm_urls]
    sm_paths_norm = set()
    for p in sm_paths:
        if p in ('index', ''):
            sm_paths_norm.add('index.html')
        elif not p.endswith('.html'):
            sm_paths_norm.add(p + '.html')
        else:
            sm_paths_norm.add(p)
    on_disk = set(html_files)
    missing_in_sitemap = on_disk - sm_paths_norm
    in_sitemap_not_disk = sm_paths_norm - on_disk
    print(f'  HTML pages on disk: {len(on_disk)}')
    print(f'  URLs in sitemap:    {len(sm_urls)}')
    if missing_in_sitemap:
        print(f'  Missing from sitemap: {sorted(missing_in_sitemap)}')
    if in_sitemap_not_disk:
        print(f'  In sitemap but no HTML: {sorted(in_sitemap_not_disk)}')
    if not missing_in_sitemap and not in_sitemap_not_disk:
        print('  Sitemap matches HTML files perfectly')
else:
    print('  no sitemap.xml')

# ── 5. Stale dateModified in HTML JSON-LD ──────────────────────────────
section('JSON-LD dateModified per page')
for html in sorted(Path('.').glob('*.html')):
    content = html.read_text(encoding='utf-8')
    dates = re.findall(r'"dateModified":\s*"([^"]+)"', content)
    if dates:
        latest = max(dates)
        print(f'  {html.name}: {latest}')

# ── 6. data_source_last_verified on country packs ──────────────────────
section('Country pack version stamps (already shown above for context)')
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    print(f'  {iso}: {d.get("data_source_last_verified")}')

# ── 7. External link domains (extract, don't fetch) ────────────────────
section('External link domain frequency')
from collections import Counter
import urllib.parse as up
domains = Counter()
for html in Path('.').glob('*.html'):
    content = html.read_text(encoding='utf-8')
    for href in re.findall(r'href="(https?://[^"]+)"', content):
        domain = up.urlparse(href).netloc.lstrip('www.')
        if domain and 'slatework.tools' not in domain:
            domains[domain] += 1
for d, n in domains.most_common(20):
    print(f'  {n:>3}  {d}')
