"""
Follow-up HK/SG correction pass after researching the platforms not covered
in the global migration. Two structural errors found:

  1. Snapask was modelled as a 30% commission platform. It's actually a
     flat per-session pay model (HK$5/session, HK$1/session bonus tier
     after 200 questions). Re-model as fee_pct=0 with notes, like Cambly.
     Affects: hk.json, sg.json.
     Source: https://tutor-handbook.snapask.com/hk/qa

  2. AfterSchool (afterschool.com.hk) is NOT a marketplace for independent
     tutors — it's a course-producer that hires tutors to record video
     courses. Remove from hk.json (doesn't fit the rate-calculator model).
     Source: afterschool.com.hk + LinkedIn confirms course-production model

  3. TutorCircle notes expanded with researched specifics from
     https://www.tutorcircle.hk/en-hk/Q&A.php — admin fee = 2 weeks of
     predicted tuition, capped at HK$700 (general) / HK$1000 (international).
"""

import json
import pathlib

SNAPASK_PATCH = {
    'fee_pct': 0,
    'notes': 'Per-session flat rate: HK$5 per question answered (bonus tiers add HK$1/session per 25 questions above 200/month). Not a commission on tutor-set rates.',
    'data_source': 'https://tutor-handbook.snapask.com/hk/qa',
}

TUTORCIRCLE_PATCH = {
    'fee_pct': 0,
    'notes': 'Introduction fee model: tutor pays an admin fee equal to ~2 weeks of expected tuition (capped HK$700 general / HK$1000 international/instrument), paid once per matched student. Tutor keeps 100% of all subsequent lessons.',
    'data_source': 'https://www.tutorcircle.hk/en-hk/Q&A.php',
}

# ── hk.json ────────────────────────────────────────────────────────────────
hk_path = pathlib.Path('data/countries/hk.json')
hk = json.loads(hk_path.read_text(encoding='utf-8'))
new_plats = []
for p in hk['platforms']:
    key = p.get('key')
    if key == 'afterschool':
        # Skip — not a tutor marketplace
        continue
    if key == 'snapask':
        p.update(SNAPASK_PATCH)
    if key == 'tutorcircle':
        p.update(TUTORCIRCLE_PATCH)
    new_plats.append(p)
hk['platforms'] = new_plats
hk_path.write_text(json.dumps(hk, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print('hk.json platforms after correction:', [p['key'] for p in new_plats])

# ── sg.json ────────────────────────────────────────────────────────────────
sg_path = pathlib.Path('data/countries/sg.json')
sg = json.loads(sg_path.read_text(encoding='utf-8'))
for p in sg['platforms']:
    if p.get('key') == 'snapask':
        p.update(SNAPASK_PATCH)
        # SG-specific URL override
        p['data_source'] = 'https://tutor-handbook.snapask.com/sg/qa'
sg_path.write_text(json.dumps(sg, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print('sg.json Snapask updated to flat-rate model')

print('\nDone. data_source_last_verified already 2026-05-15 from prior migration.')
