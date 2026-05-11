
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const brand = 'C:\\Users\\darre\\slatework\\brand';
const downloads = 'C:\\Users\\darre\\Downloads';

const bannerSvg = readFileSync(join(brand, 'banner-social.svg'));
const logoSvg = readFileSync(join(brand, 'logo.svg'));

async function render(svg, w, h, outPath, label) {
  const buf = await sharp(svg, { density: 300 })
    .resize(w, h, { fit: 'contain', background: '#0f172a' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(outPath, buf);
  console.log(`${label.padEnd(35)} ${w}x${h}  ${Math.round(buf.length/1024)} KB  -> ${outPath}`);
}

(async () => {
  // Banner: X (1500x500) and Bluesky (3000x1000)
  await render(bannerSvg, 1500, 500, join(brand, 'banner-x.png'), 'banner-x.png');
  await render(bannerSvg, 1500, 500, join(downloads, 'slatework-banner-x.png'), 'downloads/banner-x');

  await render(bannerSvg, 3000, 1000, join(brand, 'banner-bsky.png'), 'banner-bsky.png');
  await render(bannerSvg, 3000, 1000, join(downloads, 'slatework-banner-bsky.png'), 'downloads/banner-bsky');

  // Avatar: 1024x1024 retina from logo.svg
  await render(logoSvg, 1024, 1024, join(brand, 'logo-pfp-retina.png'), 'logo-pfp-retina.png');
  await render(logoSvg, 1024, 1024, join(downloads, 'slatework-avatar-retina.png'), 'downloads/avatar-retina');
})().catch(e => { console.error(e); process.exit(1); });
