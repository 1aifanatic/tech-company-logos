// Queries Wikimedia Commons for full-logo candidates per company.
// Saves candidates to /tmp/wikimedia-candidates.json for human review.
// Usage: node scripts/fetch-logo-candidates.mjs
import { writeFileSync } from 'node:fs';

const UA = { 'User-Agent': 'tech-company-logos/1.0 (https://github.com/1aifanatic/tech-company-logos)' };

const COMPANIES = {
  'microsoft': 'Microsoft', 'google': 'Google', 'apple': 'Apple Inc.',
  'amazon': 'Amazon', 'meta': 'Meta', 'oracle': 'Oracle Corporation',
  'salesforce': 'Salesforce', 'adobe': 'Adobe Inc.', 'ibm': 'IBM',
  'sap': 'SAP', 'servicenow': 'ServiceNow', 'intuit': 'Intuit',
  'workday': 'Workday', 'atlassian': 'Atlassian', 'shopify': 'Shopify',
  'snowflake': 'Snowflake Inc.', 'datadog': 'Datadog', 'palantir': 'Palantir',
  'cisco': 'Cisco', 'nvidia': 'Nvidia', 'intel': 'Intel', 'amd': 'AMD',
  'qualcomm': 'Qualcomm', 'samsung': 'Samsung', 'dell': 'Dell',
  'github': 'GitHub', 'gitlab': 'GitLab', 'docker': 'Docker',
  'kubernetes': 'Kubernetes', 'uipath': 'UiPath', 'openai': 'OpenAI',
  'anthropic': 'Anthropic', 'xai': 'xAI', 'google-deepmind': 'Google DeepMind',
  'mistral-ai': 'Mistral AI', 'cohere': 'Cohere', 'perplexity': 'Perplexity AI',
  'huggingface': 'Hugging Face', 'stability-ai': 'Stability AI',
  'midjourney': 'Midjourney', 'runway': 'Runway', 'elevenlabs': 'ElevenLabs',
  'langchain': 'LangChain', 'scale-ai': 'Scale AI', 'databricks': 'Databricks',
  'cerebras': 'Cerebras', 'groq': 'Groq', 'character-ai': 'Character.ai',
  'replicate': 'Replicate', 'weights-and-biases': 'Weights and Biases',
};

async function search(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search'
    + `&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=20`;
  const res = await fetch(url, { headers: UA });
  const data = await res.json();
  return (data.query?.search || []).map(r => r.title);
}

const out = {};
for (const [slug, name] of Object.entries(COMPANIES)) {
  try {
    const candidates = await search(`${name} logo filetype:bitmap|drawing`);
    out[slug] = { name, query: `${name} logo`, candidates };
    console.log(`${slug}: ${candidates.length} candidates`);
  } catch (e) {
    out[slug] = { name, query: `${name} logo`, candidates: [], error: String(e) };
    console.log(`${slug}: ERROR ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 400)); // be polite to the API
}

writeFileSync('/tmp/wikimedia-candidates.json', JSON.stringify(out, null, 2));
console.log('saved /tmp/wikimedia-candidates.json');
