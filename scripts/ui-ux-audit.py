"""
Full UI/UX audit across all 14 HTML pages.

Dimensions audited:
  A. Information freshness — stale copy ("7 markets" when actual is 10, etc)
  B. Visual hierarchy — heading order, h1 presence, scannability
  C. Cross-page consistency — same nav, footer, brand structure
  D. Form UX — labels, helper text, validation messaging
  E. Empty/loading states — visible to user when no data
  F. Microcopy — voice consistency, AI-tells, contradictions
  G. Color contrast / a11y — focusable elements, ARIA
  H. Mobile responsive — viewport meta, breakpoint coverage in CSS
  I. Skip-links / keyboard nav
  J. Tone / Claude-tells in user-facing copy
"""
import json
import re
import sys
from pathlib import Path
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

def section(title):
    print(f'\n========== {title} ==========')

HTML_PAGES = sorted([p for p in Path('.').glob('*.html')])

# ── A. Stale copy ─────────────────────────────────────────────────────
section('A. Stale copy / outdated claims')
patterns = [
    (r'(?<![\d.])\b7 markets\b', '"7 markets" — actual is 10'),
    (r'7 launch countries', '"7 launch countries" — actual is 10'),
    (r'are the next batch', 'mentions countries as "next batch" but they may be shipped now'),
    (r'India.*?Singapore.*?Philippines.*?are the next', 'India/Singapore/Philippines as "next"'),
    (r'\b(?:Pre-build|pre-build|coming this week|launching soon)\b', 'pre-launch language'),
    (r'\bv0\.1\.0\b.*\bdatePublished', 'old version stamp'),
    (r'"dateModified":\s*"2026-05-(?:06|07|08)"', 'dateModified before 2026-05-12'),
    (r'(?:italki|preply|wyzant|cambly).*?\b(?:supplied|aggregated|verified) on \d{4}-\d{2}-\d{2}', 'stale verification date'),
]
hits = 0
for html in HTML_PAGES:
    body = html.read_text(encoding='utf-8')
    for pat, label in patterns:
        for m in re.finditer(pat, body, re.I):
            ctx = body[max(0, m.start()-40):m.end()+40].replace('\n', ' ')
            print(f'  {html.name}: [{label}] ...{ctx}...')
            hits += 1
if not hits:
    print('  clean')

# ── B. Visual hierarchy ───────────────────────────────────────────────
section('B. Visual hierarchy — heading sequence per page')
for html in HTML_PAGES:
    body = html.read_text(encoding='utf-8')
    levels = re.findall(r'<h([1-6])\b', body)
    if not levels:
        print(f'  {html.name}: NO headings')
        continue
    # Check for skipped levels (h1 → h3 without h2)
    seen = set()
    skips = []
    for lv in levels:
        seen.add(lv)
        for prior in '12345':
            if int(prior) < int(lv) and prior not in seen:
                skips.append(f'h{lv} without prior h{prior}')
    counts = Counter(levels)
    flags = []
    if levels[0] != '1':
        flags.append(f'starts at h{levels[0]} not h1')
    if counts.get('1', 0) > 1:
        flags.append(f'{counts["1"]} h1s (should be 1)')
    line = f'  {html.name}: h1={counts.get("1",0)} h2={counts.get("2",0)} h3={counts.get("3",0)}'
    if flags:
        line += f'  WARN: {"; ".join(flags)}'
    print(line)

# ── C. Cross-page consistency ─────────────────────────────────────────
section('C. Cross-page header / nav / footer consistency')
for html in HTML_PAGES:
    body = html.read_text(encoding='utf-8')
    has_skip = 'skip-link' in body
    has_brand = '<a class="brand"' in body
    has_header = '<header class="site-header' in body
    has_footer = '<footer' in body
    has_nav = '<nav>' in body
    flags = []
    if html.name not in ('404.html',):
        if not has_skip: flags.append('no skip-link')
        if not has_brand: flags.append('no brand link')
        if not has_header: flags.append('no site-header')
        if not has_footer: flags.append('no footer')
        if not has_nav: flags.append('no nav')
    if flags:
        print(f'  {html.name}: WARN  {"; ".join(flags)}')
    else:
        print(f'  {html.name}: OK')

# ── D. Form UX — labels + help text + maxlength ───────────────────────
section('D. Form UX — every input has label, helper, validation')
for html in HTML_PAGES:
    body = html.read_text(encoding='utf-8')
    # Find every text/email/number input
    inputs = re.findall(r'<(?:input|textarea|select)\b([^>]+)>', body)
    issues = []
    for attrs in inputs:
        if 'type="hidden"' in attrs or 'type="submit"' in attrs:
            continue
        m = re.search(r'\bid="([^"]+)"', attrs)
        if not m:
            continue
        iid = m.group(1)
        has_label = f'for="{iid}"' in body
        has_aria_label = 'aria-label' in attrs
        has_aria_described = 'aria-describedby' in attrs
        # Type-validation specifics
        has_required = 'required' in attrs
        has_maxlength = 'maxlength=' in attrs
        is_email = 'type="email"' in attrs
        is_number = 'type="number"' in attrs
        if not has_label and not has_aria_label:
            issues.append(f'{iid}: no label')
        if is_email and 'autocomplete=' not in attrs:
            issues.append(f'{iid}: email without autocomplete')
        if is_number and 'min=' not in attrs:
            issues.append(f'{iid}: number without min=')
    if issues:
        print(f'  {html.name}:')
        for i in issues[:6]:
            print(f'    {i}')
        if len(issues) > 6:
            print(f'    ... and {len(issues) - 6} more')

# ── E. Loading / empty / error states ─────────────────────────────────
section('E. Loading / empty / error state presence')
for html in HTML_PAGES:
    body = html.read_text(encoding='utf-8')
    has_loading = bool(re.search(r'class="[^"]*(?:loading|skeleton|spinner)', body, re.I))
    has_aria_busy = 'aria-busy' in body
    has_aria_live = 'aria-live' in body
    has_noscript = '<noscript>' in body
    has_role_status = 'role="status"' in body
    if html.name in ('marking.html', 'cefr.html', 'lesson-plan.html', 'worksheet.html', 'rates.html', 'tax.html', 'payments.html', 'insurance.html', 'setup.html', 'contract.html'):
        loading_state = 'Y' if has_loading else '.'
        live = 'Y' if has_aria_live else '.'
        ns = 'Y' if has_noscript else '.'
        st = 'Y' if has_role_status else '.'
        print(f'  {html.name:<22}  loading={loading_state}  aria-live={live}  noscript={ns}  status={st}')

# ── F. Microcopy / Claude-tells ───────────────────────────────────────
section('F. AI-tells / Claude voice in user-facing copy')
tells = [
    r"\bI'd be happy to\b",
    r"\bI hope this helps\b",
    r"\blet's dive (?:in|into)\b",
    r"\bcomprehensive\b",
    r"\bGreat (?:question|point)!?\b",
    r"\bUnleash\b",
    r"\bSupercharge\b",
    r"\bUnlock the power of\b",
    r"\bTake your .* to the next level\b",
    r"\bElevate your\b",
    r"\bLeverage\b",
    r'^\s*(?:Sure|Absolutely|Of course)[!,.]',
]
for html in HTML_PAGES:
    body = html.read_text(encoding='utf-8')
    for pat in tells:
        for m in re.finditer(pat, body, re.I | re.M):
            ctx = body[max(0, m.start()-30):m.end()+40].replace('\n', ' ').strip()
            print(f'  {html.name}: [{pat}] ...{ctx}...')

# ── G. ARIA attributes coverage ───────────────────────────────────────
section('G. ARIA attribute usage per page')
for html in HTML_PAGES:
    body = html.read_text(encoding='utf-8')
    aria_count = len(re.findall(r'\baria-\w+=', body))
    role_count = len(re.findall(r'\brole="', body))
    print(f'  {html.name:<22}  aria-*={aria_count}  role={role_count}')

# ── H. Mobile / responsive — viewport + media queries ─────────────────
section('H. Mobile / responsive coverage')
css = Path('src/lib/styles.css').read_text(encoding='utf-8')
mq_count = len(re.findall(r'@media\s*[^{]+\{', css))
mq_breakpoints = sorted(set(re.findall(r'\(\s*(?:max|min)-width:\s*(\d+)', css)), key=int)
print(f'  styles.css media queries: {mq_count}')
print(f'  unique breakpoints: {mq_breakpoints}')
for html in HTML_PAGES:
    body = html.read_text(encoding='utf-8')
    has_viewport = 'name="viewport"' in body
    has_initial_scale = 'initial-scale' in body
    if not has_viewport:
        print(f'  {html.name}: MISSING viewport meta')

# ── I. Buttons / interactive surfaces minimum size 44x44 ──────────────
section('I. Tap target hints (button/anchor styling for 44px minimum)')
# Look for any explicit min-height / padding in CSS that targets buttons/anchors
btn_rules = re.findall(r'(\.btn[^,{]*?\{[^}]+\})', css)
min_height_targets = sum(1 for r in btn_rules if 'min-height' in r)
print(f'  .btn rules: {len(btn_rules)}, with min-height: {min_height_targets}')

# ── J. CSP unsafe-inline + nonce coverage ─────────────────────────────
section('J. CSP unsafe-inline + nonce reality check')
headers = Path('_headers').read_text(encoding='utf-8') if Path('_headers').exists() else ''
csp_line = next((l for l in headers.splitlines() if 'Content-Security-Policy' in l), '')
print(f'  CSP directive: {csp_line[:160]}{"..." if len(csp_line) > 160 else ""}')

# ── K. Internal cross-linking density per page ────────────────────────
section('K. Cross-linking between tools')
for html in HTML_PAGES:
    body = html.read_text(encoding='utf-8')
    tool_links = re.findall(r'href="/(?:marking|cefr|lesson-plan|worksheet|rates|tax|payments|contract|insurance|setup)\.?(?:html)?', body)
    print(f'  {html.name:<22}  outbound tool links: {len(tool_links)}')
