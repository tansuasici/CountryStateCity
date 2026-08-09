import { describe, expect, it } from 'vitest';

// @ts-expect-error Shared Node generator module has no separate declaration file.
import {
  buildQualityDashboard,
  findBlockingDashboardRegressions,
  qualityDashboardCsv,
} from '../scripts/lib/quality-dashboard.mjs';

const fixture = {
  countries: [
    {
      id: 1,
      iso2: 'AA',
      name: 'Alpha',
      capital: 'A',
      currency: 'AAA',
      region: 'Test',
      subregion: 'Test',
      latitude: '1',
      longitude: '2',
      native: 'Alpha',
      nationality: '',
    },
  ],
  states: [
    {
      id: 10,
      name: 'North',
      countryCode: 'AA',
      stateCode: 'N',
      type: null,
      typeStatus: 'unknown',
      entityType: 'administrative-area',
      lifecycleStatus: 'current',
      coordinateStatus: 'verified',
      coordinateType: 'point-on-surface',
      coordinateSource: 'fixture',
      latitude: '1',
      longitude: '2',
    },
  ],
  cities: [
    {
      id: 100,
      stateId: 10,
      countryCode: 'AA',
      latitude: '1',
      longitude: '2',
      wikiDataId: 'Q1',
    },
  ],
  coverageReport: {
    summary: {
      contract: {
        actualCountryRecords: 1,
        expectedCountryRecords: 1,
        countryRecordCoverageRate: 1,
        classifiedGapCount: 0,
        totalGapCount: 0,
        gapClassificationRate: 1,
      },
    },
    countryCoverage: [
      {
        countryCode: 'AA',
        states: { count: 1, status: 'available' },
        cities: { count: 1, status: 'available' },
        coordinate: { status: 'available' },
        metadataGaps: [],
      },
    ],
  },
  qualityReport: {
    generatedAt: '2026-08-08T00:00:00.000Z',
    policyVersion: 'fixture',
    gate: {
      passed: true,
      blockingSeverities: ['critical', 'high'],
      unresolvedBlockingFindings: 0,
      checksPassed: 1,
      checksTotal: 1,
    },
    entities: {
      country: { records: 1 },
      state: { records: 1 },
      city: { records: 1 },
      district: { records: 0 },
    },
    checks: [
      {
        id: 'fixture',
        title: 'Fixture check',
        severity: 'critical',
        entity: 'all',
        status: 'passed',
        observed: 0,
        excepted: 0,
        unresolved: 0,
        sample: [],
      },
    ],
    countryDrilldown: [
      {
        countryCode: 'AA',
        coverageGaps: 0,
        stateCoordinateExceptions: 0,
        lowConfidenceQids: 0,
      },
    ],
  },
  qualityPolicy: { baselines: { countries: 1, states: 1, cities: 1, districts: 0 } },
  qualityExceptions: { entries: [] },
  productionManifest: {
    dataVersion: 'sha256:fixture',
    packageVersion: '1.0.0',
    counts: { countries: 1, states: 1, cities: 1, districts: 0 },
  },
  sourceManifest: {
    source: {
      release: 'fixture',
      revision: 'abc',
      publishedAt: '2026-08-07T00:00:00.000Z',
      license: { id: 'ODbL-1.0', url: 'https://example.com/license' },
    },
  },
  versionIndex: { releases: [] },
};

describe('quality dashboard artifacts', () => {
  it('reconciles public metrics, country rows, state rows, and exports', () => {
    const dashboard = buildQualityDashboard(fixture);
    expect(dashboard.gate.deploymentBlocked).toBe(false);
    expect(
      dashboard.metrics.find((item: { id: string }) => item.id === 'city-qid-coverage')
    ).toMatchObject({ numerator: 1, denominator: 1, value: 1 });
    expect(dashboard.countries[0]).toMatchObject({ code: 'AA', states: 1, cities: 1 });
    expect(dashboard.states[0]).toMatchObject({ publicId: 'csc:state:10', cities: 1 });
    expect(qualityDashboardCsv(dashboard)).toContain('AA,Alpha,1,1');
  });

  it('turns a critical/high gate failure into a deployment blocker', () => {
    const qualityReport = structuredClone(fixture.qualityReport);
    qualityReport.gate.passed = false;
    qualityReport.gate.unresolvedBlockingFindings = 1;
    expect(
      findBlockingDashboardRegressions({
        qualityReport,
        qualityPolicy: fixture.qualityPolicy,
      })
    ).toEqual(expect.arrayContaining([expect.objectContaining({ severity: 'critical' })]));
  });

  it('blocks unreviewed record-count drift against the release baseline', () => {
    const qualityReport = structuredClone(fixture.qualityReport);
    qualityReport.entities.city.records = 2;
    expect(
      findBlockingDashboardRegressions({
        qualityReport,
        qualityPolicy: fixture.qualityPolicy,
      })
    ).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'record-count-cities' })]));
  });
});
