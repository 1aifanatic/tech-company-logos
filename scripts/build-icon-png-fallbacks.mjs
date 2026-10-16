// For PNG-only official logos (cohere, stability-ai): render icon PNGs from the
// genuine transparent PNG logo; icon.svg stays missing with MISSING.txt.
// Usage: node scripts/build-icon-png-fallbacks.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTES = {
  'cohere': 'Wikimedia Commons ("Cohere icon" - no results; logo search returned only the PNG wordmark) and simple-icons (no entry).',
  'stability-ai': 'Wikimedia Commons ("Stability AI icon", "Stability AI logo" - only the wordmark PNG and an animated emblem GIF exist) and simple-icons (no entry).',
};
const NAMES = { 'cohere': 'Cohere', 'stability-ai': 'Stability AI' };

for (const slug of Object.keys(NOTES)) {
  const dir = join(ROOT, 'companies', slug);
  const logoPng = join(dir, 'logo.png');
  if (!existsSync(logoPng)) { console.log('SKIP', slug); continue; }
  const buf = readFileSync(logoPng);
  for (const size of [512, 1024]) {
    const img = sharp(buf).resize(size, size, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    const canvas = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
    await canvas.composite([{ input: await img.toBuffer(), gravity: 'center' }]).png().toFile(join(dir, `icon-${size}.png`));
  }
  const p = join(dir, 'sources.json');
  const cur = JSON.parse(readFileSync(p, 'utf8'));
  cur['icon-512.png'] = 'rendered from logo.png (sharp, transparent 512px) - no SVG icon published';
  cur['icon-1024.png'] = 'rendered from logo.png (sharp, transparent 1024px) - no SVG icon published';
  writeFileSync(p, JSON.stringify(cur, null, 2) + '\n');
  writeFileSync(join(dir, 'MISSING.txt'),
    `icon.svg is missing for ${NAMES[slug]}.\n\n` +
    `Why: no standalone brand-icon SVG is published anywhere we could verify.\n` +
    `Searched: ${NOTES[slug]}\n` +
    `The official logo is present as logo.png / logo-512.png / logo-1024.png, and\n` +
    `icon-512.png / icon-1024.png were rendered from that genuine PNG.\n` +
    `We do not redraw or approximate brand marks, so icon.svg is intentionally absent.\n`);
  console.log('ok', slug);
}
