// Final verification: every company folder, every PNG (alpha + coverage),
// sources.json completeness. Exits non-zero on failure.
// Usage: node scripts/verify.mjs
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const slugs = readdirSync(join(ROOT, 'companies')).filter(s => !s.startsWith('.')).sort();

let errors = [];
let counts = { svg: 0, png: 0, json: 0, txt: 0 };

for (const slug of slugs) {
  const dir = join(ROOT, 'companies', slug);
  const files = readdirSync(dir);
  for (const f of files) {
    const p = join(dir, f);
    if (f.endsWith('.svg')) counts.svg++;
    else if (f.endsWith('.png')) counts.png++;
    else if (f.endsWith('.json')) counts.json++;
    else if (f.endsWith('.txt')) counts.txt++;
    if (statSync(p).size < 100) errors.push(`${slug}/${f}: suspiciously small (${statSync(p).size}b)`);
  }
  // PNG checks
  for (const f of files.filter(f => f.endsWith('.png'))) {
    const p = join(dir, f);
    try {
      const img = sharp(p);
      const m = await img.metadata();
      if (!m.hasAlpha) errors.push(`${slug}/${f}: no alpha channel`);
      const size = parseInt((f.match(/-(\d+)\.png$/) || [])[1] || '0');
      if (size && (m.width !== size || m.height !== size))
        errors.push(`${slug}/${f}: expected ${size}x${size}, got ${m.width}x${m.height}`);
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      let opaque = 0;
      for (let i = 3; i < data.length; i += info.channels) if (data[i] > 16) opaque++;
      const cov = opaque / (info.width * info.height);
      if (cov < 0.005) errors.push(`${slug}/${f}: near-empty (${(cov * 100).toFixed(2)}%)`);
    } catch (e) { errors.push(`${slug}/${f}: unreadable (${e.message})`); }
  }
  // sources.json checks
  const sp = join(dir, 'sources.json');
  if (!existsSync(sp)) { errors.push(`${slug}: sources.json missing`); continue; }
  try {
    const sj = JSON.parse(readFileSync(sp, 'utf8'));
    for (const f of files.filter(f => f.endsWith('.svg') || (f.endsWith('.png') && f !== 'mascot.png'))) {
      if (!sj[f]) errors.push(`${slug}: sources.json has no entry for ${f}`);
    }
    if (has => false) { }
    if (existsSync(join(dir, 'mascot.png')) && !sj['mascot.png']) errors.push(`${slug}: sources.json has no entry for mascot.png`);
  } catch (e) { errors.push(`${slug}: sources.json invalid JSON`); }
  // expected core files
  if (!existsSync(join(dir, 'icon-512.png')) || !existsSync(join(dir, 'icon-1024.png')))
    errors.push(`${slug}: icon PNGs incomplete`);
  if (!existsSync(join(dir, 'logo-512.png')) || !existsSync(join(dir, 'logo-1024.png')))
    errors.push(`${slug}: logo PNGs incomplete`);
}

console.log(`companies: ${slugs.length}`);
console.log(`files: ${counts.svg} svg, ${counts.png} png, ${counts.json} json, ${counts.txt} txt`);
if (errors.length) {
  console.log('\nERRORS:');
  errors.forEach(e => console.log(' -', e));
  process.exit(1);
} else {
  console.log('\nALL CHECKS PASSED');
}
