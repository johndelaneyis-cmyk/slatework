"""Check whether placeholder SVGs are actually served by the slideshow."""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

yld = Path('assets/illustrations/young-learner')
placeholder_files = set()
for s in yld.rglob('*.svg'):
    body = s.read_text(encoding='utf-8', errors='replace')
    if 'Placeholder for' in body:
        rel = str(s.relative_to(yld)).replace('\\', '/')
        placeholder_files.add(rel)

# Manifest schema: {schema: 1, illustrations: [{file, keywords}]}
m = json.loads((yld / 'manifest.json').read_text(encoding='utf-8'))
served_files = {e['file'] for e in m['illustrations']}
total_keywords = sum(len(e['keywords']) for e in m['illustrations'])

placeholders_in_manifest = placeholder_files & served_files
placeholders_orphaned = placeholder_files - served_files

print(f'Total .svg files on disk: {len(list(yld.rglob("*.svg")))}')
print(f'Placeholder .svg files:   {len(placeholder_files)}')
print(f'Manifest entries:         {len(served_files)}')
print(f'Manifest keyword aliases: {total_keywords}')
print()
if placeholders_in_manifest:
    print(f'PLACEHOLDERS WIRED INTO MANIFEST ({len(placeholders_in_manifest)}):')
    for p in sorted(placeholders_in_manifest):
        keywords = next((e['keywords'] for e in m['illustrations'] if e['file'] == p), [])
        print(f'  {p}  → keywords: {keywords}')
else:
    print('No placeholders are wired into the manifest. They will NEVER be served.')
    print()
    print('Orphaned placeholder files (on disk but unused):')
    for p in sorted(placeholders_orphaned)[:5]:
        print(f'  {p}')
    if len(placeholders_orphaned) > 5:
        print(f'  ... and {len(placeholders_orphaned) - 5} more')
