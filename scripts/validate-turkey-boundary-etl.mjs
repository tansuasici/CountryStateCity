import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const report = JSON.parse(
  await readFile(new URL('../analysis/turkey_boundary_etl_report.json', import.meta.url), 'utf8')
);

assert.equal(report.schemaVersion, 1);
assert.equal(
  report.source.sha256,
  'da8efe4dcbe47e5e8a8a34068e1e729832420634b519fab62303b86254471284'
);
assert.equal(report.levels.province.expectedFeatures, 81);
assert.equal(report.levels.province.centerCount, 81);
assert.equal(report.levels.province.uniqueLabeledFaces, 81);
assert.equal(report.levels.province.checks.exactFeatureCount, true);
assert.equal(report.levels.district.expectedFeatures, 922);
assert.equal(report.levels.district.centerCount, 922);
assert.equal(report.levels.district.uniqueLabeledFaces, 920);
assert.deepEqual(
  report.levels.district.centerCollisions.map((item) =>
    item.centers.map((center) => center.sourceName).sort()
  ),
  [
    ['Birecik', 'Karkamış'],
    ['Tuşba', 'İpekyolu'],
  ]
);
assert.equal(report.levels.district.checks.exactFeatureCount, false);
assert.equal(report.levels.district.checks.noCenterCollisions, false);
assert.equal(report.publicationGate.checks.compatibleCommercialRedistributionRights, false);
assert.equal(report.publicationGate.checks.officialMetadataComplete, false);
assert.equal(report.publicationGate.passes, false);

console.log('Turkey boundary ETL candidate report is pinned and publication remains gated.');
