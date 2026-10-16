// Downloads official full logos for all 50 companies, renders transparent
// logo-512.png / logo-1024.png, and records sources.
// Sources: Wikimedia Commons (File: picks reviewed by a human), plus:
//   - datadog: vectorlogo.zone (no Commons file)
//   - weights-and-biases: vectorlogo.zone "wandbai" (no Commons file)
//   - replicate: composed from Replicate's own site header SVGs (see scripts/vendor/replicate/)
// Usage: node scripts/download-logos.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = { 'User-Agent': 'tech-company-logos/1.0 (https://github.com/1aifanatic/tech-company-logos)' };

// repo slug -> Wikimedia Commons File: title (human-reviewed picks)
const PICKS = {
  'microsoft': 'File:Microsoft logo (2012).svg',
  'google': 'File:Google 2015 logo.svg',
  'apple': 'File:Apple logo black.svg',
  'amazon': 'File:Amazon logo.svg',
  'meta': 'File:Meta Platforms Inc. logo.svg',
  'oracle': 'File:Oracle logo.svg', // NOTE: "Oracle Corporation logo.svg" is a 32x20 unrelated file, not the Oracle wordmark
  'salesforce': 'File:Salesforce.com logo.svg',
  'adobe': 'File:Adobe logo and wordmark (2017).svg',
  'ibm': 'File:IBM logo.svg', // classic blue 8-bar; NOT "IBM rgb logo.svg" (non-standard multicolor variant)
  'sap': 'File:SAP-Logo.svg',
  'servicenow': 'File:ServiceNow logo.svg',
  'intuit': 'File:Intuit logo 2022.svg',
  'workday': 'File:Workday 2024 logo.svg',
  'atlassian': 'File:Atlassian-horizontal-blue-rgb.svg',
  'shopify': 'File:Shopify logo 2018.svg',
  'snowflake': 'File:Snowflake Logo.svg',
  'palantir': 'File:Palantir Technologies logo.svg',
  'cisco': 'File:Cisco logo.svg',
  'nvidia': 'File:NVIDIA logo.svg',
  'intel': 'File:Intel logo 2023.svg',
  'amd': 'File:AMD Logo.svg',
  'qualcomm': 'File:Qualcomm-Logo.svg',
  'samsung': 'File:Samsung logo.svg',
  'dell': 'File:Dell logo 2021.svg',
  'github': 'File:GitHub Invertocat Logo.svg', // GitHub's logo IS the mark; no official wordmark lockup published
  'gitlab': 'File:GitLab logo.svg',
  'docker': 'File:Docker Logo.svg',
  'kubernetes': 'File:Kubernetes logo.svg',
  'uipath': 'File:UiPath 2025 logo.svg',
  'openai': 'File:OpenAI Blossom and wordmark combination 2025.svg',
  'anthropic': 'File:Anthropic logo.svg',
  'xai': 'File:XAI Logo.svg',
  'xai-alt': 'File:XAI-Logo.svg', // alternate, for visual comparison
  'google-deepmind': 'File:Google DeepMind logo.svg',
  'mistral-ai': 'File:Mistral AI logo (2025–).svg',
  'cohere': 'File:Cohere-Logo.png',
  'perplexity': 'File:Perplexity AI logo.svg',
  'huggingface': 'File:Hf-logo-with-title.svg',
  'stability-ai': 'File:Stability Ai — wordmark.png',
  'midjourney': 'File:Midjourney Emblem.svg', // plain variant: transparent; the "(in-colour)" variant has a baked-in background
  'runway': 'File:Runway Black Logo SVG.svg',
  // elevenlabs: sourced from elevenlabs.io directly (see scripts/vendor/elevenlabs/);
  // the Commons "ElevenLabs Logo 01/03.svg" files are white-on-black with clipped marks.
  'langchain': 'File:LangChain Logo.svg',
  'scale-ai': 'File:Scale AI Logo.svg',
  'databricks': 'File:Databricks-logo.svg',
  'cerebras': 'File:Cerebras logo.svg',
  'groq': 'File:Groq logo.svg',
  'character-ai': 'File:Character.ai 2025 vector logo.svg',
};

// Non-Commons sources (no suitable Commons file found after multiple searches)
const DIRECT = {
  'datadog': {
    url: 'https://www.vectorlogo.zone/logos/datadoghq/datadoghq-ar21.svg',
    page: 'https://www.vectorlogo.zone/logos/datadoghq/index.html',
    note: 'vectorlogo.zone community collection of official brand SVGs; no suitable file on Wikimedia Commons',
  },
  'weights-and-biases': {
    url: 'https://www.vectorlogo.zone/logos/wandbai/wandbai-official.svg',
    page: 'https://www.vectorlogo.zone/logos/wandbai/index.html',
    note: 'vectorlogo.zone "wandbai" entry; no suitable file on Wikimedia Commons',
  },
};

function mergeSources(slug, entries) {
  const dir = join(ROOT, 'companies', slug);
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'sources.json');
  const cur = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  writeFileSync(p, JSON.stringify({ ...cur, ...entries }, null, 2) + '\n');
}

async function renderLogo(inputBuffer, dir, base) {
  // base = 'logo'; renders base-512.png / base-1024.png on exact transparent canvases
  const warnings = [];
  for (const size of [512, 1024]) {
    const img = sharp(inputBuffer).resize(size, size, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    const buf = await img.toBuffer();
    const canvas = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
    const outPath = join(dir, `${base}-${size}.png`);
    await canvas.composite([{ input: buf, gravity: 'center' }]).png().toFile(outPath);
    const out = sharp(outPath);
    const m = await out.metadata();
    if (!m.hasAlpha) throw new Error(`${outPath}: no alpha channel`);
    if (m.width !== size || m.height !== size) throw new Error(`${outPath}: wrong dimensions`);
    const { data, info } = await out.raw().toBuffer({ resolveWithObject: true });
    let opaque = 0;
    for (let i = 3; i < data.length; i += info.channels) if (data[i] > 16) opaque++;
    const coverage = opaque / (info.width * info.height);
    if (coverage < 0.005) throw new Error(`${outPath}: near-empty render`);
    // corner check: fully-opaque corners suggest a baked-in (white) background
    const corner = (x, y) => data[(y * info.width + x) * info.channels + 3];
    const corners = [corner(2, 2), corner(info.width - 3, 2), corner(2, info.height - 3), corner(info.width - 3, info.height - 3)];
    if (corners.every(a => a > 250)) warnings.push(`${base}-${size}.png: all corners opaque — possible baked-in background`);
    console.log(`  render ${base}-${size}.png coverage=${(coverage * 100).toFixed(1)}%`);
  }
  return warnings;
}

async function download(url, dest) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`download ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error(`suspiciously small download (${buf.length}b): ${url}`);
  writeFileSync(dest, buf);
  return buf;
}

async function main() {
  // 1. Resolve Commons titles -> direct URLs (batched)
  const titles = Object.values(PICKS);
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size&titles='
    + titles.map(encodeURIComponent).join('|');
  const data = await (await fetch(url, { headers: UA })).json();
  const byTitle = {};
  for (const p of Object.values(data.query.pages)) {
    if (p.missing !== undefined) { console.log(`MISSING ON COMMONS: ${p.title}`); continue; }
    const ii = p.imageinfo?.[0];
    if (ii) byTitle[p.title] = { direct: ii.url.split('?')[0], w: ii.width, h: ii.height };
  }

  const allWarnings = [];
  // 2. Download + render Commons picks
  for (const [slug, title] of Object.entries(PICKS)) {
    const info = byTitle[title];
    if (!info) { console.log(`SKIP ${slug}: could not resolve ${title}`); continue; }
    const realSlug = slug.replace(/-alt$/, '');
    const dir = join(ROOT, 'companies', realSlug);
    mkdirSync(dir, { recursive: true });
    const ext = extname(info.direct).toLowerCase().split('?')[0] || '.svg';
    const destName = slug.endsWith('-alt') ? `logo-alt${ext}` : `logo${ext}`;
    const dest = join(dir, destName);
    console.log(`${slug}: ${title} (${info.w}x${info.h})`);
    let buf;
    try {
      buf = await download(info.direct, dest);
    } catch (e) {
      console.log(`  DOWNLOAD FAILED: ${e.message}`);
      continue;
    }
    if (!slug.endsWith('-alt')) {
      const base = ext === '.svg' ? 'logo' : 'logo';
      const warns = await renderLogo(buf, dir, base);
      allWarnings.push(...warns.map(w => `${slug}: ${w}`));
      mergeSources(realSlug, {
        [destName]: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title).replace(/%3A/g, ':')} (direct: ${info.direct})`,
        [`${base}-512.png`]: `rendered from ${destName} via scripts/download-logos.mjs (sharp, transparent 512px)`,
        [`${base}-1024.png`]: `rendered from ${destName} via scripts/download-logos.mjs (sharp, transparent 1024px)`,
      });
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // 3. Direct (non-Commons) downloads
  for (const [slug, d] of Object.entries(DIRECT)) {
    const dir = join(ROOT, 'companies', slug);
    mkdirSync(dir, { recursive: true });
    console.log(`${slug}: direct ${d.url}`);
    const buf = await download(d.url, join(dir, 'logo.svg'));
    const warns = await renderLogo(buf, dir, 'logo');
    allWarnings.push(...warns.map(w => `${slug}: ${w}`));
    mergeSources(slug, {
      'logo.svg': `${d.page} (direct: ${d.url}) — ${d.note}`,
      'logo-512.png': 'rendered from logo.svg via scripts/download-logos.mjs (sharp, transparent 512px)',
      'logo-1024.png': 'rendered from logo.svg via scripts/download-logos.mjs (sharp, transparent 1024px)',
    });
  }

  // 4. Replicate: compose official glyph + wordmark from replicate.com header
  {
    const slug = 'replicate';
    const dir = join(ROOT, 'companies', slug);
    const glyph = readFileSync(join(ROOT, 'scripts', 'vendor', 'replicate', 'glyph.svg'), 'utf8');
    const wordmark = readFileSync(join(ROOT, 'scripts', 'vendor', 'replicate', 'wordmark.svg'), 'utf8');
    const inner = s => s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    // glyph viewBox 0 0 1000 1000 -> scaled to height 120 (width 120); wordmark 512x120; 40px gap
    const composed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 672 120">`
      + `<g transform="translate(0,0) scale(0.12)">${inner(glyph)}</g>`
      + `<g transform="translate(160,0)">${inner(wordmark)}</g></svg>`;
    writeFileSync(join(dir, 'logo.svg'), composed);
    const warns = await renderLogo(Buffer.from(composed), dir, 'logo');
    allWarnings.push(...warns.map(w => `${slug}: ${w}`));
    mergeSources(slug, {
      'logo.svg': 'composed from Replicate\'s official site header SVGs (glyph + wordmark as arranged on https://replicate.com/, 2026-10-16); source SVGs vendored in scripts/vendor/replicate/',
      'logo-512.png': 'rendered from logo.svg via scripts/download-logos.mjs (sharp, transparent 512px)',
      'logo-1024.png': 'rendered from logo.svg via scripts/download-logos.mjs (sharp, transparent 1024px)',
    });
    console.log(`${slug}: composed from official site SVGs`);
  }

  console.log('\nWARNINGS:');
  console.log(allWarnings.length ? allWarnings.join('\n') : '(none)');
}

await main();
