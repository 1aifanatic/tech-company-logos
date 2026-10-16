// For companies with no standalone brand-icon file published anywhere:
// use the official full logo SVG as icon.svg too, with a clear note.
// (Never redraw or approximate a mark.)
// Usage: node scripts/build-icon-fallbacks.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// slug -> note about why the logo file doubles as the icon
const FALLBACKS = {
  'servicenow': 'no standalone brand icon published; icon.svg is the official full logo',
  'workday': 'no standalone brand icon published; icon.svg is the official full logo',
  'cohere': 'no standalone brand icon published; icon.svg is the official full logo',
  'runway': 'no standalone brand icon published; icon.svg is the official full logo',
  'scale-ai': 'no standalone brand icon published; icon.svg is the official full logo',
  'cerebras': 'no standalone brand icon published; icon.svg is the official full logo',
  'groq': 'no standalone brand icon published; icon.svg is the official full logo',
  'character-ai': 'no standalone brand icon published; icon.svg is the official full logo',
  'xai': "xAI's logo is the X mark itself, so the logo file serves as the icon",
  'midjourney': "Midjourney's emblem is the brand mark, so the logo file serves as the icon",
};

function mergeSources(slug, entries) {
  const p = join(ROOT, 'companies', slug, 'sources.json');
  const cur = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  writeFileSync(p, JSON.stringify({ ...cur, ...entries }, null, 2) + '\n');
}

for (const [slug, note] of Object.entries(FALLBACKS)) {
  const dir = join(ROOT, 'companies', slug);
  const logoSvg = join(dir, 'logo.svg');
  if (!existsSync(logoSvg)) { console.log(`SKIP ${slug}: no logo.svg`); continue; }
  copyFileSync(logoSvg, join(dir, 'icon.svg'));
  const buf = readFileSync(join(dir, 'icon.svg'));
  for (const size of [512, 1024]) {
    const img = sharp(buf).resize(size, size, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    const canvas = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
    await canvas.composite([{ input: await img.toBuffer(), gravity: 'center' }]).png().toFile(join(dir, `icon-${size}.png`));
  }
  mergeSources(slug, {
    'icon.svg': `copied from logo.svg — ${note}`,
    'icon-512.png': 'rendered from icon.svg via scripts/build-icon-fallbacks.mjs (sharp, transparent 512px)',
    'icon-1024.png': 'rendered from icon.svg via scripts/build-icon-fallbacks.mjs (sharp, transparent 1024px)',
  });
  console.log(`ok ${slug}: icon from logo (${note.slice(0, 50)}...)`);
}

// stability-ai: official logo is PNG-only; no SVG icon exists -> MISSING.txt
{
  const dir = join(ROOT, 'companies', 'stability-ai');
  writeFileSync(join(dir, 'MISSING.txt'),
    'icon.svg / icon-512.png / icon-1024.png are missing for Stability AI.\n\n' +
    'Why: no standalone brand-icon SVG is published anywhere we could verify.\n' +
    'Searched: Wikimedia Commons ("Stability AI icon", "Stability AI logo" — only the\n' +
    'wordmark PNG and an animated emblem GIF exist) and simple-icons (no entry).\n' +
    'The official wordmark is present as logo.png / logo-512.png / logo-1024.png.\n' +
    'We do not redraw or approximate brand marks, so the icon files are intentionally absent.\n');
  console.log('ok stability-ai: MISSING.txt written');
}
