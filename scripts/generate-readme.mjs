// Generates README.md (company table with icon previews + asset status).
// Usage: node scripts/generate-readme.mjs
import { readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const NAMES = {
  'adobe': 'Adobe', 'amazon': 'Amazon', 'amd': 'AMD', 'anthropic': 'Anthropic',
  'apple': 'Apple', 'atlassian': 'Atlassian', 'cerebras': 'Cerebras',
  'character-ai': 'Character.ai', 'cisco': 'Cisco', 'cohere': 'Cohere',
  'databricks': 'Databricks', 'datadog': 'Datadog', 'dell': 'Dell',
  'docker': 'Docker', 'elevenlabs': 'ElevenLabs', 'github': 'GitHub',
  'gitlab': 'GitLab', 'google-deepmind': 'Google DeepMind', 'google': 'Google',
  'groq': 'Groq', 'huggingface': 'Hugging Face', 'ibm': 'IBM', 'intel': 'Intel',
  'intuit': 'Intuit', 'kubernetes': 'Kubernetes', 'langchain': 'LangChain',
  'meta': 'Meta', 'microsoft': 'Microsoft', 'midjourney': 'Midjourney',
  'mistral-ai': 'Mistral AI', 'nvidia': 'NVIDIA', 'openai': 'OpenAI',
  'oracle': 'Oracle', 'palantir': 'Palantir', 'perplexity': 'Perplexity',
  'qualcomm': 'Qualcomm', 'replicate': 'Replicate', 'runway': 'Runway',
  'salesforce': 'Salesforce', 'samsung': 'Samsung', 'sap': 'SAP',
  'scale-ai': 'Scale AI', 'servicenow': 'ServiceNow', 'shopify': 'Shopify',
  'snowflake': 'Snowflake', 'stability-ai': 'Stability AI', 'uipath': 'UiPath',
  'weights-and-biases': 'Weights & Biases', 'workday': 'Workday', 'xai': 'xAI',
};

const slugs = readdirSync(join(ROOT, 'companies')).filter(s => !s.startsWith('.')).sort();
const has = (slug, f) => existsSync(join(ROOT, 'companies', slug, f));

let rows = '';
for (const slug of slugs) {
  const name = NAMES[slug] || slug;
  const iconOk = has(slug, 'icon.svg') || has(slug, 'icon-512.png');
  const logoOk = has(slug, 'logo.svg') || has(slug, 'logo.png');
  const mascotOk = has(slug, 'mascot.png');
  const missing = has(slug, 'MISSING.txt') ? ' *(see MISSING.txt)*' : '';
  const preview = has(slug, 'icon-512.png')
    ? `<img src="companies/${slug}/icon-512.png" width="32" height="32" alt="${name} icon">`
    : '—';
  rows += `| ${preview} | ${name} | ${iconOk ? '✅' : '❌'} | ${logoOk ? '✅' : '❌'} | ${mascotOk ? '✅' : '—'}${missing} |\n`;
}

const md = `# tech-company-logos

Transparent PNGs and SVGs of the logos, icons, and mascots of the top 50 software and AI companies — organized one folder per company, free to browse and reuse under the terms below.

## Trademark disclaimer

All logos, icons, and mascots in this repository are trademarks of their respective owners. They are included here **for reference only**. This project is **not affiliated with, sponsored by, or endorsed by** any of the companies listed. If you are a trademark owner and want an asset updated or removed, please open an issue.

Note: some brand owners (e.g. GitHub) ask that their marks only be used with prior written permission — check each owner's brand guidelines before using their assets, and see \`sources.json\` in each company folder for where every file came from.

## Companies

| Icon | Company | Icon | Logo | Mascot |
|------|---------|------|------|--------|
${rows}
## Folder structure

\`\`\`
companies/<company-slug>/
├── icon.svg          # brand icon in the official brand color (SVG)
├── icon-512.png      # transparent PNG render of the icon (512×512)
├── icon-1024.png     # transparent PNG render of the icon (1024×1024)
├── logo.svg          # full company logo / wordmark (SVG; logo.png when only a PNG is published)
├── logo-512.png      # transparent PNG render of the logo (512×512)
├── logo-1024.png     # transparent PNG render of the logo (1024×1024)
├── mascot.png        # official mascot artwork, only where one genuinely exists
├── sources.json      # exact source URL for every file in the folder
└── MISSING.txt       # present only when an asset is intentionally absent, with the reason
\`\`\`

All PNGs are rendered on transparent backgrounds, centered on a square canvas.

## How to contribute a new company

1. Create \`companies/<your-slug>/\` (lowercase, words separated by hyphens).
2. Add **genuine** brand assets only: the real icon SVG, the real full-logo file, and a real mascot image if one officially exists. **Never invent, redraw, trace, or approximate a logo** — a missing asset is better than a wrong one. If an asset can't be sourced, add a \`MISSING.txt\` explaining what you searched.
3. Render transparent PNGs at 512 and 1024 px: \`node scripts/build-icons.mjs\` and \`node scripts/download-logos.mjs\` show the pipeline (sharp, \`fit: inside\` on a transparent square canvas).
4. Record the exact source URL of every file in \`sources.json\`.
5. Regenerate this README: \`node scripts/generate-readme.mjs\`.
6. Open a pull request.

## License

The collection structure, build scripts, and this README are released under [CC0 1.0 Universal](LICENSE). **Third-party trademarks are not covered** — all logos, icons, and mascots remain the property of their respective owners.
`;

writeFileSync(join(ROOT, 'README.md'), md);
console.log(`README.md written (${slugs.length} companies)`);
