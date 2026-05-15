"""
Add US income_tax_brackets + fix CA to match the gross-income convention
used by the other packs (GB / AU / IN / PH / SG).

Convention chosen across all country packs:
  Brackets express GROSS-income thresholds, with any tax-free band
  (UK Personal Allowance, AU Tax-Free Threshold, IN/PH/SG basic
  exemption, US standard deduction, CA Basic Personal Amount)
  modeled as the 0% band at the bottom. This lets the calculator
  apply brackets directly to gross income without separate
  deduction/credit logic.

US 2026 single filer:
  Standard deduction (single):    $16,100
  IRS published bracket cutoffs:  12,400 / 50,400 / 105,700 / 201,775 /
                                  256,225 / 640,600 (on TAXABLE income)
  Gross-income brackets used here add SD to each cutoff so the data is
  directly usable.
  Source: https://www.irs.gov/newsroom/irs-releases-tax-inflation-
          adjustments-for-tax-year-2026-including-amendments-from-the-
          one-big-beautiful-bill

CA 2026 federal:
  Basic Personal Amount:          $16,452
  CRA published bracket cutoffs:  58,523 / 117,045 / 181,440 / 258,482
                                  (on TAXABLE income)
  Gross-income brackets used here add BPA.
  (Previous version had BPA as 0% band but published cutoffs — math
  was internally inconsistent; this pass fixes the cutoffs.)
  Source: https://www.canada.ca/en/revenue-agency/services/tax/
          individuals/frequently-asked-questions-individuals/
          canadian-income-tax-rates-individuals-current-previous-years.html
"""
import json
import pathlib

TODAY = '2026-05-15'

# ── US 2026, single filer, gross-income brackets ──────────────────────
US_SD = 16100
US_TAXABLE_BRACKETS = [
    (0.10, 12400),
    (0.12, 50400),
    (0.22, 105700),
    (0.24, 201775),
    (0.32, 256225),
    (0.35, 640600),
    (0.37, None),
]
US_BRACKETS = [{'rate': 0, 'upper_bound_amount': US_SD}]
for rate, taxable_top in US_TAXABLE_BRACKETS:
    US_BRACKETS.append({
        'rate': rate,
        'upper_bound_amount': (taxable_top + US_SD) if taxable_top is not None else None,
    })
US_NOTE = ' Federal brackets only — state income tax stacks on top and varies (0%-13.3% depending on state). Brackets shown reflect single-filer gross income, treating the $16,100 standard deduction as the 0% band. 2026 tax year (returns filed in 2027). Self-employment tax (15.3% on net earnings) is separate; tutors filing Schedule C should add it on top of these federal income-tax rates.'
US_SOURCE = 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill'

# ── CA 2026 federal, corrected to gross-income equivalents ────────────
CA_BPA = 16452
CA_TAXABLE_BRACKETS = [
    (0.14,  58523),
    (0.205, 117045),
    (0.26,  181440),
    (0.29,  258482),
    (0.33,  None),
]
CA_BRACKETS = [{'rate': 0, 'upper_bound_amount': CA_BPA}]
for rate, taxable_top in CA_TAXABLE_BRACKETS:
    CA_BRACKETS.append({
        'rate': rate,
        'upper_bound_amount': (taxable_top + CA_BPA) if taxable_top is not None else None,
    })

def patch(iso, brackets, note_marker, full_note, source):
    pth = pathlib.Path(f'data/countries/{iso}.json')
    d = json.loads(pth.read_text(encoding='utf-8'))
    tax = d.setdefault('tax', {})
    tax['income_tax_brackets'] = brackets
    tax['income_tax_source'] = source
    existing = tax.get('notes', '').strip()
    if note_marker not in existing:
        tax['notes'] = (existing + full_note).strip() if existing else full_note.strip()
    d['data_source_last_verified'] = TODAY
    pth.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{iso}.json: {len(brackets)} brackets, source set')

patch('us', US_BRACKETS, 'Federal brackets only', US_NOTE, US_SOURCE)

# Re-patch CA — overwrite the previously-shipped (internally-inconsistent) brackets
ca_pth = pathlib.Path('data/countries/ca.json')
ca = json.loads(ca_pth.read_text(encoding='utf-8'))
ca['tax']['income_tax_brackets'] = CA_BRACKETS
ca['data_source_last_verified'] = TODAY
ca_pth.write_text(json.dumps(ca, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'ca.json: corrected to gross-income convention ({len(CA_BRACKETS)} brackets)')

# Sanity-check all 10 packs
print('\n=== Final verification: all packs have income_tax_brackets ===')
for pth in sorted(pathlib.Path('data/countries').glob('*.json')):
    d = json.loads(pth.read_text(encoding='utf-8'))
    bs = d['tax'].get('income_tax_brackets', [])
    has_source = bool(d['tax'].get('income_tax_source'))
    print(f'  {pth.stem}: {len(bs)} brackets  source={"yes" if has_source else "no (older pack)"}')
