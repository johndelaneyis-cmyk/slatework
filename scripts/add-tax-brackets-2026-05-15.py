"""
Add income_tax_brackets to AU, CA, NZ, IE country packs.

All four were flagged in the deepest audit as missing this field — GB / HK /
IN / PH / SG already had it. Researched 2026 brackets from official sources:

  AU: Australian Taxation Office (ato.gov.au), 2025-26 financial year rates
      https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
  CA: Canada Revenue Agency (canada.ca), 2026 federal brackets (post the
      14% lowest-rate change effective 2025-07).
      https://www.canada.ca/en/revenue-agency/services/tax/individuals/...
  NZ: Inland Revenue NZ, 2025-26 PAYE tax-year brackets (current).
      https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-rates-for-individuals
  IE: Revenue Ireland, 2026 single-person income tax bands.
      https://www.revenue.ie/en/jobs-and-pensions/calculating-your-income-tax/tax-rate-band.aspx

Schema (matches GB pack):
  rate: decimal (0.2 = 20%)
  upper_bound_amount: local-currency threshold for top of band (null = open)

Notes field per country documents:
  - what's covered by the brackets vs separate levies/charges
  - which tax-year these represent
  - any near-term legislated changes
"""
import json
import pathlib

TODAY = '2026-05-15'

# ── AU — Australian Taxation Office 2025-26 financial year ─────────────
AU_BRACKETS = [
    {'rate': 0,    'upper_bound_amount': 18200},   # tax-free threshold
    {'rate': 0.16, 'upper_bound_amount': 45000},
    {'rate': 0.30, 'upper_bound_amount': 135000},
    {'rate': 0.37, 'upper_bound_amount': 190000},
    {'rate': 0.45, 'upper_bound_amount': None},
]
AU_NOTE = ' Brackets verified against ATO 2025-26 financial year (Jul 2025 - Jun 2026). Medicare Levy (2% of taxable income) is calculated separately, not included here. A legislated reduction to 15% on the $18,201-$45,000 bracket is scheduled from 1 July 2026.'
AU_SOURCE = 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents'

# ── CA — federal 2026 (provincial tax stacked on top, not modeled) ─────
CA_BRACKETS = [
    {'rate': 0,     'upper_bound_amount': 16452},  # Basic Personal Amount — effectively zero-tax via non-refundable credit
    {'rate': 0.14,  'upper_bound_amount': 58523},  # reduced from 15% effective 2025-07
    {'rate': 0.205, 'upper_bound_amount': 117045},
    {'rate': 0.26,  'upper_bound_amount': 181440},
    {'rate': 0.29,  'upper_bound_amount': 258482},
    {'rate': 0.33,  'upper_bound_amount': None},
]
CA_NOTE = ' Federal brackets only — provincial income tax stacks on top and varies by province (ranges roughly 4-21% depending on bracket). 2026 lowest-rate is 14% (dropped from 15% on 1 July 2025). The 0% band above represents the Basic Personal Amount credit (CA$16,452 in 2026) which effectively zeroes federal tax on income below it.'
CA_SOURCE = 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html'

# ── NZ — Inland Revenue 2025-26 (Apr 2025 - Mar 2026) ──────────────────
NZ_BRACKETS = [
    {'rate': 0.105, 'upper_bound_amount': 15600},
    {'rate': 0.175, 'upper_bound_amount': 53500},
    {'rate': 0.30,  'upper_bound_amount': 78100},
    {'rate': 0.33,  'upper_bound_amount': 180000},
    {'rate': 0.39,  'upper_bound_amount': None},
]
NZ_NOTE = ' NZ has no tax-free threshold — tax starts at 10.5% from the first dollar. Brackets verified against IRD 2025-26 PAYE tax year (Apr 2025 - Mar 2026). ACC Earners Levy (~1.39%) is separate and not in these rates.'
NZ_SOURCE = 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals/tax-rates-for-individuals'

# ── IE — Revenue Ireland 2026 (single person, civil partner +€9k band) ─
IE_BRACKETS = [
    {'rate': 0.20, 'upper_bound_amount': 44000},
    {'rate': 0.40, 'upper_bound_amount': None},
]
IE_NOTE = ' Single-person bands. Married/civil-partnership single-earner band is €53,000 (not modeled here). Income tax bands only — USC (Universal Social Charge, 0.5-8% tiered) and PRSI (4% Class S for self-employed) are separate levies. Single Person Tax Credit + PAYE Tax Credit (~€4,000 combined) further reduces effective tax on the first ~€20,000.'
IE_SOURCE = 'https://www.revenue.ie/en/jobs-and-pensions/calculating-your-income-tax/tax-rate-band.aspx'

PATCHES = {
    'au': (AU_BRACKETS, AU_NOTE, AU_SOURCE),
    'ca': (CA_BRACKETS, CA_NOTE, CA_SOURCE),
    'nz': (NZ_BRACKETS, NZ_NOTE, NZ_SOURCE),
    'ie': (IE_BRACKETS, IE_NOTE, IE_SOURCE),
}

for iso, (brackets, addendum, source) in PATCHES.items():
    pth = pathlib.Path(f'data/countries/{iso}.json')
    d = json.loads(pth.read_text(encoding='utf-8'))
    tax = d.setdefault('tax', {})
    tax['income_tax_brackets'] = brackets
    # Append note rather than overwrite
    existing = tax.get('notes', '').strip()
    if 'Brackets verified' not in existing:
        tax['notes'] = (existing + addendum).strip() if existing else addendum.strip()
    tax['income_tax_source'] = source
    d['data_source_last_verified'] = TODAY
    pth.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{iso}.json: {len(brackets)} brackets added, source recorded')

print('\nAll four packs updated. Bumping countries.js cache key separately.')
