// Builds /tmp/contact-sheet.png: every company's logo-512.png on light gray
// (reveals transparency problems) with labels, for human QA.
// Usage: node scripts/contact-sheet.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const slugs = readdirSync(join(ROOT, 'companies')).filter(s => !s.startsWith('.')).sort();

const CELL = 240, LABEL_H = 36, COLS = 6;
const ROWS = Math.ceil(slugs.length / COLS);
const W = COLS * CELL, H = ROWS * (CELL + LABEL_H);

const composites = [];
for (let i = 0; i < slugs.length; i++) {
  const slug = slugs[i];
  const dir = join(ROOT, 'companies', slug);
  const candidates = ['logo-512.png', 'logo.png'].map(f => join(dir, f));
  const src = candidates.find(existsSync);
  if (!src) continue;
  const col = i % COLS, row = Math.floor(i / COLS);
  const x = col * CELL, y = row * (CELL + LABEL_H);
  const logo = await sharp(src).resize(CELL - 20, CELL - 20, { fit: 'inside' }).toBuffer();
  composites.push({ input: logo, left: x + 10, top: y + 10 });
  // alt variants for comparison
  for (const alt of ['logo-alt.svg']) {
    const ap = join(dir, alt);
    if (existsSync(ap)) {
      const ab = await sharp(readFileSync(ap)).resize(110, 110, { fit: 'inside' }).png().toBuffer();
      composites.push({ input: ab, left: x + CELL - 120, top: y + CELL - 120 });
    }
  }
  const label = Buffer.from(
    `<svg width="${CELL}" height="${LABEL_H}"><text x="${CELL / 2}" y="24" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#111">${slug}</text></svg>`);
  composites.push({ input: label, left: x, top: y + CELL });
}

await sharp({ create: { width: W, height: H, channels: 3, background: { r: 225, g: 225, b: 225 } } })
  .composite(composites)
  .png()
  .toFile('/tmp/contact-sheet.png');
console.log(`wrote /tmp/contact-sheet.png (${W}x${H}), ${slugs.length} companies`);
