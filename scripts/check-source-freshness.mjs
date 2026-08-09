import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(
  await readFile(path.join(root, 'data/sources/dr5hn-v3.2-export.7.json'), 'utf8')
);
const repository = new URL(config.source.repository).pathname.replace(/^\//, '');
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'CountryStateCity-data-sync',
};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
  headers,
});
if (!response.ok) {
  throw new Error(`GitHub release lookup failed: ${response.status} ${response.statusText}`);
}

const latest = await response.json();
if (latest.tag_name !== config.source.release) {
  throw new Error(
    `Pinned source ${config.source.release} is stale; latest release is ${latest.tag_name}: ${latest.html_url}`
  );
}
if (latest.published_at !== config.source.publishedAt) {
  throw new Error(
    `Pinned publication timestamp differs: ${config.source.publishedAt} != ${latest.published_at}`
  );
}

console.log(
  `Pinned source is current: ${latest.tag_name}, published ${latest.published_at}, ${latest.html_url}`
);
