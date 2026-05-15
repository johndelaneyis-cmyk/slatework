"""
Final cleanup pass after researching ALL platforms across country packs.

Findings: a significant portion of the original platform data was either
structurally wrong (flat-rate employers modelled as commission marketplaces)
or referenced platforms that aren't tutor marketplaces at all.

Decisions per platform (each cited inline):

  REMODEL — flat-rate employers (fee_pct=0, notes describe real pay):
    cluey       AU/NZ  AUD$25-35/hr (qualified teacher tier higher)
    51talk      PH     ~PHP 76-104/hr
    engoo       PH     $2.4-10/hr depending on native/non-native
    nativecamp  PH     ~PHP 51 per 25-min class (~$1.70/class)
    rarejob     PH     ~PHP 55/class, ~PHP 85-107/hr
    vedantu     IN     ₹500-1500/hr by subject (effectively an employer)
    filo        IN     ₹200-400/hr per session
    urbanpro    IN     flat fee + %; varies by subject

  REMODEL — intro-fee / no-commission agencies (fee_pct=0, notes):
    championtutor  SG  No agency fee on tutor (parents pay direct rates)
    mindflex       SG  Same (sub-brand of ChampionTutor)
    familytutor    SG  Personalized matchmaking; no commission cited
    tueetor        SG  Self-serve directory, no middleman/referral fees

  REMOVE — not tutor marketplaces:
    lessonspace    AU/NZ  Whiteboard software; tutors pay $9-29/mo to USE it
    chegg_india    IN     Q&A program ended 2026-03-18

  KEEP (already correct from previous passes):
    italki, preply, verbling, wyzant, mytutor, tutorhouse, lingoda,
    cambly, tutorocean, tutorcircle, snapask, afterschool (already removed)
"""

import json
import pathlib

# ── Flat-rate employer patches ───────────────────────────────────────────
CLUEY_PATCH = {
    'fee_pct': 0,
    'notes': 'Flat hourly pay (employer model): AUD$30-35 (qualified teacher) or AUD$25 (non-qualified tutor) per hour, plus superannuation. NZD$22-30 equivalent. Not commission-based — Cluey sets the tutor pay regardless of student rate.',
    'data_source': 'https://onlineteachingreview.com/cluey-learning-review/',
}

FIFTYONETALK_PATCH = {
    'fee_pct': 0,
    'notes': 'Flat hourly pay (employer model) for Filipino teachers — ~PHP 76-104/hour. Not commission-based.',
    'data_source': 'https://ph.indeed.com/cmp/51talk/salaries',
}

ENGOO_PATCH = {
    'fee_pct': 0,
    'notes': 'Flat per-class pay (employer model). Native speakers ≈ $10/hr; non-native (e.g. Filipino tutors) ≈ $1.20 per 25-min class ($2.40/hr). Not commission-based.',
    'data_source': 'https://onlineteachingreview.com/engoo-review/',
}

NATIVECAMP_PATCH = {
    'fee_pct': 0,
    'notes': 'Flat per-class pay (employer model): ~PHP 51 per 25-min class (~$1.70/class) for Filipino tutors. Not commission-based.',
    'data_source': 'https://www.indeed.com/cmp/Nativecamp./reviews?ftopic=paybenefits',
}

RAREJOB_PATCH = {
    'fee_pct': 0,
    'notes': 'Flat per-class pay (employer model): ~PHP 55/class (~PHP 85-107/hour avg). Not commission-based.',
    'data_source': 'https://ph.indeed.com/cmp/Rarejob-Philippines/salaries',
}

VEDANTU_PATCH = {
    'fee_pct': 0,
    'notes': 'Flat hourly pay (employer model): ₹500-1500/hour depending on subject + experience. Min 3-4 hours/day, IST evening slots. Not commission-based — Vedantu sets the rate.',
    'data_source': 'https://www.glassdoor.co.in/Hourly-Pay/Vedantu-Teacher-Hourly-Pay-E923744_D_KO8,15.htm',
}

FILO_PATCH = {
    'fee_pct': 0,
    'notes': 'Per-session pay (~₹200-400/hour live; ₹546/hour avg per Indeed). Bonuses on reaching 30 / 40 sessions/month with ≥4/5 rating. Not commission-based.',
    'data_source': 'https://askfilo.com/blog/how-to-be-a-filo-tutor/',
}

URBANPRO_PATCH = {
    'fee_pct': 0,
    'notes': 'Two-component model: one-time flat fee on first payment from each new student + percentage on earnings above the flat fee. Both components vary by subject. Tutors verify on the payment dashboard.',
    'data_source': 'https://help.urbanpro.com/hc/en-us/articles/360054824934',
}

CHAMPIONTUTOR_PATCH = {
    'fee_pct': 0,
    'notes': 'Matchmaking agency, no agency fee on tutor — parents pay the tutor-set rate directly. Tutor keeps 100%.',
    'data_source': 'https://www.akstech.com.sg/tuition-agencies-in-singapore/',
}

MINDFLEX_PATCH = {
    'fee_pct': 0,
    'notes': 'Premium tier of ChampionTutor — same model: no agency fee on tutor; parents pay tutor-set rate directly.',
    'data_source': 'https://singaporetuitionteachers.com/',
}

FAMILYTUTOR_PATCH = {
    'fee_pct': 0,
    'notes': 'Matchmaking agency model. Tutor sets the rate; parents pay direct. (Some Singapore agencies charge tutors a one-time intro fee — verify on signup.)',
    'data_source': 'https://www.akstech.com.sg/tuition-agencies-in-singapore/',
}

TUEETOR_PATCH = {
    'fee_pct': 0,
    'notes': 'Self-serve directory model — no middleman, no referral fees. Tutors and learners connect direct, tutor keeps 100% of agreed rate.',
    'data_source': 'https://www.tueetor.com/en/about',
}

PATCHES = {
    'cluey': CLUEY_PATCH,
    'fiftyonetalk': FIFTYONETALK_PATCH,
    'engoo': ENGOO_PATCH,
    'nativecamp': NATIVECAMP_PATCH,
    'rarejob': RAREJOB_PATCH,
    'vedantu': VEDANTU_PATCH,
    'filo': FILO_PATCH,
    'urbanpro': URBANPRO_PATCH,
    'championtutor': CHAMPIONTUTOR_PATCH,
    'mindflex': MINDFLEX_PATCH,
    'familytutor': FAMILYTUTOR_PATCH,
    'tueetor': TUEETOR_PATCH,
}

REMOVE_KEYS = {'lessonspace', 'chegg_india'}

# ── Apply across all country packs ───────────────────────────────────────
for pth in sorted(pathlib.Path('data/countries').glob('*.json')):
    d = json.loads(pth.read_text(encoding='utf-8'))
    new_plats = []
    changed = []
    for p in d['platforms']:
        key = p.get('key', '')
        if key in REMOVE_KEYS:
            changed.append(f'-{key}')
            continue
        if key in PATCHES:
            p.update(PATCHES[key])
            changed.append(f'~{key}')
        new_plats.append(p)
    d['platforms'] = new_plats
    pth.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    if changed:
        print(f'{pth.name}: {", ".join(changed)}')

print('\nAll patches applied. data_source_last_verified already 2026-05-15 from prior passes.')
