import { describe, expect, it } from 'vitest';
import pkg from '../../../package.json';
import productionManifest from '../../../data/production-manifest.json';
import { snapshotMetadata } from '../metadata';

describe('MCP snapshot metadata', () => {
  it('uses the package and content-addressed production versions', () => {
    expect(snapshotMetadata.packageVersion).toBe(pkg.version);
    expect(snapshotMetadata.dataVersion).toBe(`sha256:${productionManifest.digest}`);
    expect(snapshotMetadata.digest).toBe(productionManifest.digest);
    expect(snapshotMetadata.generatedAt).toBe(productionManifest.generatedAt);
    expect(snapshotMetadata.coverageUrl).toContain('/docs/data-coverage');
  });
});
