import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';

import { validateCorrectionSubmission } from './lib/contributions.mjs';

const eventPath = argument('--event') || process.env.GITHUB_EVENT_PATH;
const bodyFile = argument('--body-file');
let input;
if (eventPath) {
  const event = JSON.parse(await readFile(path.resolve(eventPath), 'utf8'));
  input = {
    body: event.issue?.body,
    author: event.issue?.user?.login,
    createdAt: event.issue?.created_at,
  };
} else if (bodyFile) {
  input = {
    body: await readFile(path.resolve(bodyFile), 'utf8'),
    author: argument('--author') || 'local-validator',
    createdAt: argument('--created-at') || new Date().toISOString(),
  };
} else {
  throw new Error('Pass --event or --body-file.');
}

const result = validateCorrectionSubmission(input);
const output = argument('--output') || process.env.GITHUB_OUTPUT;
if (output) {
  await appendFile(
    output,
    [
      `valid=${result.valid}`,
      `fingerprint=${result.fingerprint}`,
      `errors_base64=${Buffer.from(JSON.stringify(result.errors)).toString('base64')}`,
      `proposal_base64=${Buffer.from(JSON.stringify(result.proposal)).toString('base64')}`,
      '',
    ].join('\n')
  );
}
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 2;

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
