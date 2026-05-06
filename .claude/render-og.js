// Render og.png from og.svg. Run with: node .claude/render-og.js
// Requires `sharp` — install transiently via npx so we don't add a dependency.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const svg = readFileSync(join(root, 'og.svg'));

sharp(svg, { density: 192 })
  .resize(1200, 630, { fit: 'contain', background: '#fafaf7' })
  .png({ compressionLevel: 9 })
  .toBuffer()
  .then(buf => {
    writeFileSync(join(root, 'og.png'), buf);
    console.log('Rendered og.png:', buf.length, 'bytes');
  })
  .catch(e => { console.error(e); process.exit(1); });
