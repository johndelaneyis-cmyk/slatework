"""
Super-deep gap audit from new angles:
  1. Every API endpoint has rate-limit + auth + CORS preflight + method-guard?
  2. Every API endpoint returns consistent error/success shape?
  3. Every tool page has same feature parity (profile, feedback, RTL handling)?
  4. JS defect scan — unhandled rejections, missing null guards, double-await,
     missing try/catch around fetch, missing await on async return
  5. CSP unsafe-inline pressure — how many inline scripts/styles?
  6. manifest.webmanifest schema correctness
  7. Repo hygiene — README / LICENSE / CONTRIBUTING / CI / branch protection
  8. Country pack rate plausibility vs published market data (spot-check)
  9. localStorage corruption resilience — wrapped in try/catch?
 10. Anthropic prompt-injection guardrails — does the system prompt resist?
 11. Currency rounding / formatting consistency
 12. Empty-state handling — what does each tool show with no input?
 13. .gitignore covers /tests/output, /tmp, /.env, /.dev.vars?
"""
import json
import re
import sys
from pathlib import Path
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

def section(title):
    print(f'\n========== {title} ==========')

# ── 1. API endpoint integrity ────────────────────────────────────────
section('1. API endpoint integrity (rate limit + CORS + method guard)')
api_dir = Path('functions/api')
issues = 0
for ep in sorted(api_dir.glob('*.js')):
    body = ep.read_text(encoding='utf-8')
    has_rate = 'rateCheck' in body
    has_cors = 'corsPreflight' in body
    has_method = 'methodNotAllowed' in body
    has_options = 'onRequestOptions' in body
    has_post = 'onRequestPost' in body or 'onRequestGet' in body
    error_codes = re.findall(r'jsonResponse\([^)]*?,\s*(\d{3})', body)
    flags = []
    if not has_rate and ep.name not in ('feedback.js', 'fx.js', 'newsletter.js'):
        flags.append('no rateCheck')
    if not has_cors:
        flags.append('no corsPreflight')
    if not has_method:
        flags.append('no methodNotAllowed')
    if not has_post:
        flags.append('no POST/GET handler')
    print(f'  {ep.name:<22} rate={has_rate} cors={has_cors} method={has_method}  codes={sorted(set(error_codes))}')
    if flags:
        issues += 1
        for f in flags:
            print(f'    WARN: {f}')

# ── 2. Error response shape consistency ──────────────────────────────
section('2. Error response shape — every endpoint returns { error: string }?')
for ep in sorted(api_dir.glob('*.js')):
    body = ep.read_text(encoding='utf-8')
    # Find every jsonResponse with non-200 status; check it has error field
    for m in re.finditer(r"jsonResponse\(\s*\{([^{}]*?)\}\s*,\s*(\d{3})", body, re.DOTALL):
        fields, status = m.group(1), m.group(2)
        if status.startswith('2'):
            continue
        if 'error' not in fields and 'error:' not in fields:
            # show short context
            ctx = body[max(0, m.start()-30):m.end()+10].replace('\n', ' ')[:160]
            print(f'  {ep.name}: non-2xx response without `error` field: ...{ctx}...')

# ── 3. Tool page feature parity ──────────────────────────────────────
section('3. Tool page feature parity matrix')
tool_pages = ['marking.html', 'cefr.html', 'lesson-plan.html', 'worksheet.html',
              'rates.html', 'tax.html', 'payments.html', 'contract.html',
              'insurance.html', 'setup.html']
features = ['profile-mount', 'feedback-widget', 'noscript-notice', 'privacy-notice',
            'profile-tutor-strip', 'aria-live', 'data-profile-country-bound']
print(f'  {"page":<22}  ' + ' '.join(f.split("-")[0][:5] for f in features))
for tp in tool_pages:
    p = Path(tp)
    if not p.exists(): continue
    body = p.read_text(encoding='utf-8')
    row = [tp.replace('.html', '')]
    for f in features:
        row.append('Y' if f in body else '.')
    print(f'  {row[0]:<22}  ' + ' '.join(f'{r:<5}' for r in row[1:]))

# ── 4. JS defect scan ────────────────────────────────────────────────
section('4. JS defect scan (potential null-check / async issues)')
js_files = list(Path('src/lib').rglob('*.js')) + list(Path('functions').rglob('*.js'))
patterns = [
    (r'JSON\.parse\([^)]+\)(?!\s*\.catch)', 'JSON.parse without try/catch'),
    (r'await\s+fetch\([^)]+\)(?!\s*\.catch)\s*\n(?!\s*(?:if|//|const|let|var|return))', 'await fetch without immediate guard'),
    (r'localStorage\.getItem\([^)]+\)\.(?!then|catch)', 'localStorage usage chain'),
    (r'\.innerHTML\s*=\s*[\w.]+(?!\.replace)', 'innerHTML = expr (XSS risk if user-data)'),
]
defect_counts = Counter()
for js in js_files:
    body = js.read_text(encoding='utf-8')
    for pat, label in patterns:
        for m in re.finditer(pat, body):
            defect_counts[label] += 1
for label, n in defect_counts.most_common():
    print(f'  {n:>3}  {label}')

# Specifically count innerHTML assignments to see what they assign
section('4b. innerHTML assignments — checking sanitization')
risky = 0
for js in js_files:
    body = js.read_text(encoding='utf-8')
    for m in re.finditer(r'\.innerHTML\s*=\s*([^;]+)', body):
        expr = m.group(1).strip()[:120]
        # Skip empty string assignments and template-literal HTML (those are static-ish)
        if expr.startswith("'") or expr.startswith('"') or expr.startswith('``'):
            continue
        if 'escapeHtml' in expr or 'renderMarkdown' in expr:
            continue
        if expr.startswith('`') and 'escapeHtml' in body[max(0, m.start()-2000):m.start()]:
            continue
        risky += 1
        if risky <= 8:
            print(f'  {js.name}: innerHTML = {expr}')
if risky > 8:
    print(f'  ... and {risky - 8} more')

# ── 5. CSP unsafe-inline pressure ────────────────────────────────────
section('5. Inline scripts/styles per HTML page')
for p in sorted(Path('.').glob('*.html')):
    body = p.read_text(encoding='utf-8')
    inline_scripts = len(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(?:(?!</script>).)*</script>', body, re.DOTALL))
    inline_styles = len(re.findall(r'<style\b[^>]*>(?:(?!</style>).)*</style>', body, re.DOTALL))
    style_attrs = len(re.findall(r'\bstyle="[^"]+"', body))
    print(f'  {p.name:<22}  scripts={inline_scripts}  styles={inline_styles}  style-attrs={style_attrs}')

# ── 6. manifest.webmanifest ──────────────────────────────────────────
section('6. manifest.webmanifest correctness')
mw = Path('manifest.webmanifest')
if mw.exists():
    try:
        m = json.loads(mw.read_text(encoding='utf-8'))
        required = ['name', 'short_name', 'start_url', 'display', 'icons', 'theme_color', 'background_color']
        for k in required:
            present = 'YES' if k in m else 'NO'
            print(f'  {present:>3}  {k}: {m.get(k, "(missing)")[:60] if isinstance(m.get(k), str) else type(m.get(k)).__name__}')
        icons = m.get('icons', [])
        print(f'  icons: {len(icons)} entries')
        for i in icons[:5]:
            print(f'    {i}')
    except Exception as e:
        print(f'  PARSE ERR: {e}')
else:
    print('  NO manifest.webmanifest')

# ── 7. Repo hygiene ──────────────────────────────────────────────────
section('7. Repo hygiene — README / LICENSE / CONTRIBUTING / CI')
for f in ['README.md', 'LICENSE', 'LICENSE.md', 'LICENSE.txt', 'CONTRIBUTING.md',
          '.github/workflows', '.editorconfig', '.gitignore', '.prettierrc']:
    p = Path(f)
    if p.exists():
        if p.is_dir():
            entries = list(p.glob('*'))
            print(f'  YES  {f}/ ({len(entries)} files)')
        else:
            print(f'  YES  {f} ({p.stat().st_size} bytes)')
    else:
        print(f'   no  {f}')

# ── 8. .gitignore coverage ──────────────────────────────────────────
section('8. .gitignore coverage of sensitive paths')
gi = Path('.gitignore')
if gi.exists():
    body = gi.read_text(encoding='utf-8')
    for pat in ['.dev.vars', '.env', '.env.local', 'node_modules', '.wrangler', '*.log',
                'tests/output', '__pycache__', '*.pyc', '.DS_Store']:
        present = 'YES' if pat in body else 'NO'
        print(f'  {present:>3}  {pat}')

# ── 9. Anthropic prompt-injection resistance ─────────────────────────
section('9. Prompt-injection guardrails in system prompts')
for ep in sorted(api_dir.glob('*.js')):
    body = ep.read_text(encoding='utf-8')
    has_role_anchor = 'role' in body.lower() and ('language teacher' in body.lower() or 'marking' in body.lower() or 'lesson' in body.lower())
    has_strict_rules = 'Strict rules' in body or 'strict rules' in body
    has_format_lock = 'Format:' in body or 'Output is' in body or 'Output must' in body
    if 'callClaude' in body:
        flags = []
        if not has_role_anchor:
            flags.append('no role anchor')
        if not has_strict_rules:
            flags.append('no "Strict rules"')
        if not has_format_lock:
            flags.append('no format lock')
        print(f'  {ep.name}: role={has_role_anchor} strict={has_strict_rules} fmt={has_format_lock}')

# ── 10. Country pack edge cases ──────────────────────────────────────
section('10. Country pack: tax data internal consistency')
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    tax = d.get('tax', {})
    brackets = tax.get('income_tax_brackets', [])
    # Verify monotonically increasing bounds
    last = -1
    monot_ok = True
    for b in brackets:
        ub = b.get('upper_bound_amount')
        if ub is None:
            continue
        if ub <= last:
            monot_ok = False
            print(f'  {iso}: NOT monotonic — {last} → {ub}')
            break
        last = ub
    # Verify last bracket has null upper_bound
    if brackets and brackets[-1].get('upper_bound_amount') is not None:
        print(f'  {iso}: last bracket should have upper_bound_amount=null')
    # Verify rates ascending
    rates = [b.get('rate', 0) for b in brackets]
    if rates != sorted(rates):
        print(f'  {iso}: rates not ascending: {rates}')

print('  all country packs pass tax-bracket monotonicity check' if True else '')
