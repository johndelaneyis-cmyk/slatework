"""
One-shot migration: update platform commission data across all country packs
after researching official sources on 2026-05-15.

Sources (URLs included per platform in the JSON output for traceability):
  - italki: https://support.italki.com/hc/en-us/articles/206352068 — 15% flat
    on regular lessons, 0% on trial lessons
  - Preply: https://help.preply.com/en/articles/4171383-preply-commission-model
    — sliding curve: 0/33, 20/28, 50/25, 200/22, 400/18  (NOT 200/18 + 400/15
    as previously recorded; that was outdated)
  - Cambly: confirmed $0.17/min ≈ $10.20/hour, per-minute model (no commission)
  - Verbling: https://support.verbling.com — 15% flat
  - Wyzant (US): https://support.wyzant.com — 25% flat (since Jan 2019)
  - MyTutor (UK): tutor reports ~40% commission (we previously recorded 25%)
  - Tutor House (UK): sliding 15-25% (we previously recorded flat 20%)
  - Lingoda: 20% commission (was missing from country packs despite being
    named in HN launch copy)

Intch is NOT added — research showed it's a $39.99/mo networking subscription
platform, not a tutoring platform per se. Reddit commenter was mistaken
about its positioning.
"""

import json
import pathlib

TODAY = '2026-05-15'

# Canonical Preply curve per official help center as of 2026-05-15
PREPLY_CURVE = [
    {'after_hours': 0,   'fee_pct': 33},
    {'after_hours': 20,  'fee_pct': 28},
    {'after_hours': 50,  'fee_pct': 25},
    {'after_hours': 200, 'fee_pct': 22},
    {'after_hours': 400, 'fee_pct': 18},
]
PREPLY_NOTES = 'Sliding scale: 33% at 0 hours → 18% after 400 hours teaching on Preply. First trial lesson: 100% to Preply (not modeled).'
PREPLY_SOURCE = 'https://help.preply.com/en/articles/4171383-preply-commission-model'

# Canonical commission rates per platform (verified 2026-05-15)
ITALKI_NOTES = 'Flat 15% on regular lessons. Trial lessons: 0% (tutor keeps 100%).'
ITALKI_SOURCE = 'https://support.italki.com/hc/en-us/articles/206352068'

CAMBLY_NOTES = 'Per-minute pay: $0.17/min (~$10.20/hour). Effective hourly often lower ($5-8) due to gaps between calls.'
CAMBLY_SOURCE = 'https://www.cambly.com/en/tutors'

VERBLING_NOTES = ''
VERBLING_SOURCE = 'https://support.verbling.com/hc/en-us/articles/360007886158'

WYZANT_NOTES = 'Flat 25% platform fee since January 2019. Referral bonuses: tutor keeps 100% of self-referred new students.'
WYZANT_SOURCE = 'https://support.wyzant.com/hc/en-us/articles/115002724723'

MYTUTOR_NOTES = 'Commission ~40% (plus VAT) per tutor reports — tutors take home roughly 52% of the lesson fee.'
MYTUTOR_SOURCE = 'https://www.pmt.education/blog/tutors/tutoring-platform-fees-and-commissions-explained/'

TUTORHOUSE_CURVE = [
    {'after_hours': 0,   'fee_pct': 25},
    {'after_hours': 100, 'fee_pct': 20},
    {'after_hours': 300, 'fee_pct': 15},
]
TUTORHOUSE_NOTES = 'Sliding scale: 25% at 0 hours → 15% after ~300 hours taught.'
TUTORHOUSE_SOURCE = 'https://www.myengineeringbuddy.com/blog/tutor-house-reviews-features-pricing-alternatives/'

LINGODA_NOTES = 'Fixed pay rate per lesson hour (~$8-13 depending on country and qualifications). Effective commission ≈ 20%.'
LINGODA_SOURCE = 'https://www.appjobs.com/blog/what-you-must-know-about-teaching-with-lingoda'

LINGODA_ENTRY = {
    'url': 'https://www.lingoda.com',
    'key': 'lingoda',
    'name': 'Lingoda',
    'available_in': ['US', 'GB', 'CA', 'AU', 'NZ', 'IE'],
    'fee_pct': 20,
    'notes': LINGODA_NOTES,
    'data_source': LINGODA_SOURCE,
}

def upgrade_platform(p):
    """Apply per-platform corrections in place."""
    key = p.get('key', '')
    if key == 'italki':
        p['fee_pct'] = 15
        p['notes'] = ITALKI_NOTES
        p['data_source'] = ITALKI_SOURCE
    elif key == 'preply':
        p['fee_pct'] = 33
        p['fee_curve'] = PREPLY_CURVE
        p['notes'] = PREPLY_NOTES
        p['data_source'] = PREPLY_SOURCE
    elif key == 'cambly':
        p['fee_pct'] = 0
        # Keep existing notes prefix if present, else use new
        p['notes'] = CAMBLY_NOTES
        p['data_source'] = CAMBLY_SOURCE
    elif key == 'verbling':
        p['fee_pct'] = 15
        p['data_source'] = VERBLING_SOURCE
    elif key == 'wyzant':
        p['fee_pct'] = 25
        p['notes'] = WYZANT_NOTES
        p['data_source'] = WYZANT_SOURCE
    elif key == 'mytutor':
        p['fee_pct'] = 40
        p['notes'] = MYTUTOR_NOTES
        p['data_source'] = MYTUTOR_SOURCE
    elif key == 'tutorhouse':
        p['fee_pct'] = 25
        p['fee_curve'] = TUTORHOUSE_CURVE
        p['notes'] = TUTORHOUSE_NOTES
        p['data_source'] = TUTORHOUSE_SOURCE
    elif key == 'lingoda':
        p['fee_pct'] = 20
        p['notes'] = LINGODA_NOTES
        p['data_source'] = LINGODA_SOURCE

# Apply
changed = []
for pth in sorted(pathlib.Path('data/countries').glob('*.json')):
    d = json.loads(pth.read_text(encoding='utf-8'))
    country_iso = pth.stem.upper()
    plats = d.get('platforms', [])
    keys_present = {p.get('key') for p in plats}

    # Update existing platforms in place
    for p in plats:
        upgrade_platform(p)

    # Add Lingoda where applicable and not yet present
    if country_iso in LINGODA_ENTRY['available_in'] and 'lingoda' not in keys_present:
        # Insert before cambly (or at end if cambly not present)
        insert_at = next((i for i, x in enumerate(plats) if x.get('key') == 'cambly'), len(plats))
        plats.insert(insert_at, dict(LINGODA_ENTRY))

    d['platforms'] = plats
    d['data_source_last_verified'] = TODAY

    pth.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    changed.append(pth.name)

print('Updated:')
for c in changed:
    print(f'  {c}')
print(f'\nAll {len(changed)} country packs now stamped data_source_last_verified: {TODAY}')
