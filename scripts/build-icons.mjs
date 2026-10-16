// Builds icon.svg (brand-colored), icon-512.png and icon-1024.png (transparent)
// for companies sourced from the simple-icons packages.
//   - 32 icons from simple-icons@16 (installed in this repo's node_modules)
//   - 7 icons from simple-icons@9, vendored under scripts/vendor/simple-icons-v9/
//     (those brands were removed from newer simple-icons releases; v9 is the
//     newest release that still ships them. Hexes below are from v9's data file.)
// Usage: node scripts/build-icons.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const V16_ICONS = join(ROOT, 'node_modules', 'simple-icons', 'icons');
const V16_DATA = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'simple-icons', 'data', 'simple-icons.json'), 'utf8'));
const V9_VENDOR = join(ROOT, 'scripts', 'vendor', 'simple-icons-v9');

// repo slug -> { name, siSlug, hex, src ('v16' | 'v9'), sourceUrl }
const V16_SLUGS = {
  'google': 'Google', 'apple': 'Apple', 'meta': 'Meta', 'sap': 'SAP',
  'intuit': 'Intuit', 'atlassian': 'Atlassian', 'shopify': 'Shopify',
  'snowflake': 'Snowflake', 'datadog': 'Datadog', 'palantir': 'Palantir',
  'cisco': 'Cisco', 'nvidia': 'NVIDIA', 'intel': 'Intel', 'amd': 'AMD',
  'qualcomm': 'Qualcomm', 'samsung': 'Samsung', 'dell': 'Dell',
  'github': 'GitHub', 'gitlab': 'GitLab', 'docker': 'Docker',
  'kubernetes': 'Kubernetes', 'uipath': 'UiPath', 'anthropic': 'Anthropic',
  'perplexity': 'Perplexity', 'huggingface': 'Hugging Face',
  'elevenlabs': 'ElevenLabs', 'langchain': 'LangChain',
  'databricks': 'Databricks', 'replicate': 'Replicate',
};
const V16_EXTRA = { 'mistral-ai': 'mistralai', 'google-deepmind': 'deepmind', 'weights-and-biases': 'weightsandbiases' }; // repo slug -> simple-icons slug

// Vendored from simple-icons@9 (newest release shipping these icons)
const V9 = {
  'microsoft': { name: 'Microsoft', hex: '5E5E5E', sourceUrl: 'https://github.com/simple-icons/simple-icons/blob/9.11.0/icons/microsoft.svg' },
  'amazon':    { name: 'Amazon', hex: 'FF9900', sourceUrl: 'https://github.com/simple-icons/simple-icons/blob/9.11.0/icons/amazon.svg' },
  'oracle':    { name: 'Oracle', hex: 'F80000', sourceUrl: 'https://github.com/simple-icons/simple-icons/blob/9.11.0/icons/oracle.svg' },
  'salesforce':{ name: 'Salesforce', hex: '00A1E0', sourceUrl: 'https://github.com/simple-icons/simple-icons/blob/9.11.0/icons/salesforce.svg' },
  'adobe':     { name: 'Adobe', hex: 'FF0000', sourceUrl: 'https://github.com/simple-icons/simple-icons/blob/9.11.0/icons/adobe.svg' },
  'ibm':       { name: 'IBM', hex: '052FAD', sourceUrl: 'https://github.com/simple-icons/simple-icons/blob/9.11.0/icons/ibm.svg' },
  'openai':    { name: 'OpenAI', hex: '412991', sourceUrl: 'https://github.com/simple-icons/simple-icons/blob/9.11.0/icons/openai.svg' },
};

const hexBySlugV16 = Object.fromEntries(V16_DATA.map(i => [i.slug, i.hex]));
const sourceBySlugV16 = Object.fromEntries(V16_DATA.map(i => [i.slug, i.source]));

function mergeSources(slug, entries) {
  const dir = join(ROOT, 'companies', slug);
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'sources.json');
  const cur = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  writeFileSync(p, JSON.stringify({ ...cur, ...entries }, null, 2) + '\n');
}

async function renderPng(svgBuffer, outPath, size) {
  // Fit inside size×size, then center on an exact transparent canvas.
  const img = sharp(svgBuffer).resize(size, size, {
    fit: 'inside',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const meta = await img.metadata();
  const canvas = sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  await canvas
    .composite([{ input: await img.toBuffer(), gravity: 'center' }])
    .png()
    .toFile(outPath);
  // Verification: must have alpha and non-trivial opaque coverage.
  const out = sharp(outPath);
  const m = await out.metadata();
  if (!m.hasAlpha) throw new Error(`${outPath}: no alpha channel`);
  const stats = await out.stats();
  const alpha = stats.channels.find(c => c.max !== undefined && stats.channels.indexOf(c) === 3) || stats.channels[stats.channels.length - 1];
  const { data, info } = await out.raw().toBuffer({ resolveWithObject: true });
  let opaque = 0;
  for (let i = 3; i < data.length; i += info.channels) if (data[i] > 16) opaque++;
  const coverage = opaque / (info.width * info.height);
  if (coverage < 0.005) throw new Error(`${outPath}: near-empty render (coverage ${(coverage * 100).toFixed(2)}%)`);
  if (m.width !== size || m.height !== size) throw new Error(`${outPath}: wrong dimensions ${m.width}x${m.height}`);
  return coverage;
}

function colorize(svg, hex) {
  // simple-icons SVGs have no fill; inject the brand color on the <svg> element.
  return svg.replace(/<svg([^>]*)>/, `<svg$1 fill="#${hex}">`);
}

const results = [];
async function buildOne(slug, { name, siSlug, hex, sourceUrl }) {
  const dir = join(ROOT, 'companies', slug);
  mkdirSync(dir, { recursive: true });
  const svgPath = siSlug.startsWith('v9:')
    ? join(V9_VENDOR, siSlug.slice(3) + '.svg')
    : join(V16_ICONS, siSlug + '.svg');
  const raw = readFileSync(svgPath, 'utf8');
  const colored = colorize(raw, hex);
  const svgBuf = Buffer.from(colored, 'utf8');
  writeFileSync(join(dir, 'icon.svg'), colored);
  const cov512 = await renderPng(svgBuf, join(dir, 'icon-512.png'), 512);
  const cov1024 = await renderPng(svgBuf, join(dir, 'icon-1024.png'), 1024);
  mergeSources(slug, {
    'icon.svg': sourceUrl,
    'icon-512.png': `rendered from icon.svg via scripts/build-icons.mjs (sharp, transparent ${512}px)`,
    'icon-1024.png': `rendered from icon.svg via scripts/build-icons.mjs (sharp, transparent ${1024}px)`,
  });
  results.push({ slug, name, hex, cov512: cov512.toFixed(3), cov1024: cov1024.toFixed(3) });
  console.log(`ok ${slug} (${name}) hex=#${hex} coverage 512=${(cov512 * 100).toFixed(1)}% 1024=${(cov1024 * 100).toFixed(1)}%`);
}

const jobs = [];
for (const [slug, name] of Object.entries(V16_SLUGS)) {
  const siSlug = slug;
  jobs.push(buildOne(slug, { name, siSlug, hex: hexBySlugV16[siSlug], sourceUrl: sourceBySlugV16[siSlug] }));
}
for (const [slug, siSlug] of Object.entries(V16_EXTRA)) {
  const data = V16_DATA.find(i => i.slug === siSlug);
  jobs.push(buildOne(slug, { name: data.title, siSlug, hex: data.hex, sourceUrl: data.source }));
}
for (const [slug, v] of Object.entries(V9)) {
  jobs.push(buildOne(slug, { name: v.name, siSlug: 'v9:' + slug, hex: v.hex, sourceUrl: v.sourceUrl }));
}

await Promise.all(jobs.map(j => j.catch(e => { console.error('FAIL', e.message); process.exitCode = 1; })));
console.log(`\ndone: ${results.length} icons built`);
