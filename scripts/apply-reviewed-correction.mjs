import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { correctionPatch } from './lib/contributions.mjs';

const proposalFile = process.argv[2];
if (!proposalFile)
  throw new Error('Usage: npm run contribution:apply -- path/to/reviewed-proposal.json');
const root = path.resolve(import.meta.dirname, '..');
const proposal = JSON.parse(await readFile(path.resolve(proposalFile), 'utf8'));
const patch = correctionPatch(proposal);
const patchPath = path.join(root, 'data/patches/overrides.json');
const ledgerPath = path.join(root, 'data/contributions/ledger.json');
const changelogPath = path.join(root, 'data/contributions/CHANGELOG.md');
const canonicalFile = { country: 'country.json', state: 'state.json', city: 'city.json' }[
  proposal.entity
];
const [patches, ledger, canonical, changelog] = await Promise.all([
  json(patchPath),
  json(ledgerPath),
  json(path.join(root, 'data', canonicalFile)),
  readFile(changelogPath, 'utf8'),
]);

if (patches.patches.some((item) => item.contributionId === proposal.contributionId)) {
  throw new Error(`${proposal.contributionId} is already present in the patch layer.`);
}
if (ledger.entries.some((item) => item.contributionId === proposal.contributionId)) {
  throw new Error(`${proposal.contributionId} is already present in the contribution ledger.`);
}
const record = canonical.find((item) => item.id === proposal.id);
if (!record) throw new Error(`${proposal.entity} ${proposal.id} does not exist.`);
for (const [field, expected] of Object.entries(proposal.currentValues || {})) {
  if (JSON.stringify(record[field] ?? null) !== JSON.stringify(expected ?? null)) {
    throw new Error(`Current ${field} changed since review; expected ${JSON.stringify(expected)}.`);
  }
}

patches.patches.push(patch);
ledger.entries.push({ ...proposal, decision: 'accepted' });
const line = `- ${proposal.reviewedAt.slice(0, 10)} · ${proposal.contributionId} · ${proposal.entity}:${proposal.id} · ${proposal.reason} · [review](${proposal.issueUrl})\n`;
await Promise.all([
  writeFile(patchPath, `${JSON.stringify(patches, null, 2)}\n`),
  writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`),
  writeFile(changelogPath, `${changelog.trimEnd()}\n\n${line}`),
]);
console.log(`${proposal.contributionId} linked to patch layer, ledger, and changelog.`);

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}
