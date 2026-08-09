import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();
const releaseId = '2.0.15...3.0.0';
const releaseRoot = path.join(root, 'data', 'versions', releaseId);

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

type Summary = {
  releaseId: string;
  toDataVersion: string;
  totals: { total: number; breakingIdentity: number; changeTypes: Record<string, number> };
  entities: Record<string, { total: number }>;
  countries: Array<{ countryCode: string; total: number }>;
  identity: { breakingChanges: number; migratedChanges: number };
};

type Change = {
  publicId: string;
  entityType: string;
  countryCode: string | null;
  breakingIdentity: boolean;
  migration: null | { previousPublicId?: string; successorPublicIds?: string[] };
};

describe('version diff artifacts', () => {
  it('reconciles release, entity, country, CSV, and production totals', async () => {
    const [summary, manifest, index, csv] = await Promise.all([
      json<Summary>(path.join(releaseRoot, 'summary.json')),
      json<{ dataVersion: string }>(path.join(root, 'data', 'production-manifest.json')),
      json<{ releases: Array<{ releaseId: string; totals: { total: number } }> }>(
        path.join(root, 'data', 'versions', 'index.json')
      ),
      readFile(path.join(releaseRoot, 'changes.csv'), 'utf8'),
    ]);

    expect(summary.releaseId).toBe(releaseId);
    expect(summary.toDataVersion).toBe(manifest.dataVersion);
    expect(Object.values(summary.entities).reduce((sum, entity) => sum + entity.total, 0)).toBe(
      summary.totals.total
    );
    expect(summary.countries.reduce((sum, country) => sum + country.total, 0)).toBe(
      summary.totals.total
    );
    expect(index.releases.find((release) => release.releaseId === releaseId)?.totals.total).toBe(
      summary.totals.total
    );
    expect(csv.trimEnd().split('\n')).toHaveLength(summary.totals.total + 1);
  });

  it('keeps every removed identity either breaking or mapped by a migration', async () => {
    const summary = await json<Summary>(path.join(releaseRoot, 'summary.json'));
    const cities = await json<{ changes: Change[] }>(
      path.join(releaseRoot, 'changes', 'city.json')
    );
    const removed = cities.changes.filter((change) => change.publicId && change.migration);

    expect(summary.identity.breakingChanges).toBe(summary.totals.breakingIdentity);
    expect(removed).toHaveLength(summary.identity.migratedChanges);
    expect(removed.every((change) => !change.breakingIdentity)).toBe(true);
    expect(removed.every((change) => change.migration?.successorPublicIds?.length)).toBe(true);
  });

  it('publishes complete country shards without cross-country leakage', async () => {
    const summary = await json<Summary>(path.join(releaseRoot, 'summary.json'));

    for (const country of summary.countries) {
      const shard = await json<{ countryCode: string; changes: Change[] }>(
        path.join(releaseRoot, 'countries', `${country.countryCode.toLowerCase()}.json`)
      );
      expect(shard.countryCode).toBe(country.countryCode);
      expect(shard.changes).toHaveLength(country.total);
      expect(shard.changes.every((change) => change.countryCode === country.countryCode)).toBe(
        true
      );
    }
  });
});
