import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'data', 'versions');
const destination = path.join(root, 'public', 'data', 'versions');
const feedDestination = path.join(root, 'public', 'changes', 'feed.xml');
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const sourceIndex = await readFile(path.join(source, 'index.json'));
  const publicIndex = await readFile(path.join(destination, 'index.json'));
  const sourceFeed = await readFile(path.join(source, 'feed.xml'));
  const publicFeed = await readFile(feedDestination);
  if (!sourceIndex.equals(publicIndex) || !sourceFeed.equals(publicFeed)) {
    throw new Error('Published version diff artifacts are stale; run npm run data:web-version-diffs.');
  }
  console.log('Published version diff index and RSS feed are current.');
} else {
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
  await mkdir(path.dirname(feedDestination), { recursive: true });
  await cp(path.join(source, 'feed.xml'), feedDestination);
  console.log('Published version diff JSON/CSV shards and RSS feed.');
}
