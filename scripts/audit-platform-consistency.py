"""Cross-country audit: platform-fee consistency, missing sources, version stamps."""
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

plat_fees = defaultdict(dict)
plat_curves = defaultdict(dict)
plat_sources = defaultdict(set)

for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    for p in d.get('platforms', []):
        k = p['key']
        plat_fees[k][iso] = p['fee_pct']
        if p.get('fee_curve'):
            plat_curves[k][iso] = tuple((c['after_hours'], c['fee_pct']) for c in p['fee_curve'])
        if p.get('data_source'):
            plat_sources[k].add(p['data_source'])

print('=== Platform fee consistency (multi-country) ===')
issues = 0
for k, fees in plat_fees.items():
    if len(fees) <= 1:
        continue
    unique_vals = set(fees.values())
    if len(unique_vals) > 1:
        print(f'  INCONSISTENT  {k}: {fees}')
        issues += 1
if not issues:
    print('  all consistent across countries')

print()
print('=== Platform curve consistency ===')
issues = 0
for k, curves in plat_curves.items():
    if len(curves) <= 1:
        continue
    if len(set(curves.values())) > 1:
        print(f'  INCONSISTENT  {k}: {curves}')
        issues += 1
if not issues:
    print('  all consistent across countries')

print()
print('=== Platform missing data_source ===')
issues = 0
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    for p in d.get('platforms', []):
        if not p.get('data_source'):
            print(f'  {iso}: {p["key"]}')
            issues += 1
if not issues:
    print('  every platform has a data_source URL')

print()
print('=== Country pack version stamps ===')
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    print(f'  {iso}: {d.get("data_source_last_verified")}')

print()
print('=== Country pack field coverage ===')
required = ['currency', 'locale_default', 'platforms', 'rates_by_language_pair', 'data_source_last_verified']
for pth in sorted(Path('data/countries').glob('*.json')):
    iso = pth.stem
    d = json.loads(pth.read_text(encoding='utf-8'))
    missing = [r for r in required if r not in d]
    optional = [k for k in ['payment_methods', 'tax', 'business_registration', 'safeguarding'] if k not in d]
    if missing:
        print(f'  {iso} MISSING REQUIRED: {missing}')
    if optional:
        print(f'  {iso} missing optional: {optional}')
    n_pairs = len(d.get('rates_by_language_pair', {}))
    print(f'  {iso}: {n_pairs} language pairs')
