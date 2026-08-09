const COUNTRY_METADATA_FIELDS = [
  'capital',
  'currency',
  'region',
  'subregion',
  'latitude',
  'longitude',
  'native',
  'nationality',
];

const isPresent = (value) => value !== null && value !== undefined && value !== '';

const ratio = (numerator, denominator) =>
  denominator === 0 ? null : Number((numerator / denominator).toFixed(6));

export function findBlockingDashboardRegressions({ qualityReport, qualityPolicy }) {
  const findings = [];
  if (!qualityReport.gate.passed || qualityReport.gate.unresolvedBlockingFindings > 0) {
    findings.push({
      id: 'quality-gate',
      severity: 'critical',
      expected: 0,
      actual: qualityReport.gate.unresolvedBlockingFindings,
      message: 'The release quality gate has unresolved critical or high findings.',
    });
  }

  const entityBaselines = {
    countries: qualityReport.entities.country.records,
    states: qualityReport.entities.state.records,
    cities: qualityReport.entities.city.records,
    districts: qualityReport.entities.district.records,
  };
  for (const [key, actual] of Object.entries(entityBaselines)) {
    const expected = qualityPolicy.baselines[key];
    if (actual !== expected) {
      findings.push({
        id: `record-count-${key}`,
        severity: 'high',
        expected,
        actual,
        message: `${key} record count changed without a reviewed baseline update.`,
      });
    }
  }
  return findings;
}

export function buildQualityDashboard({
  countries,
  states,
  cities,
  coverageReport,
  qualityReport,
  qualityPolicy,
  qualityExceptions,
  productionManifest,
  sourceManifest,
  versionIndex,
}) {
  const stateStats = new Map(
    states.map((state) => [state.id, { cities: 0, cityCoordinates: 0, cityQids: 0 }])
  );
  const countryStats = new Map(
    countries.map((country) => [country.iso2, { cityCoordinates: 0, cityQids: 0, cityRecords: 0 }])
  );

  for (const city of cities) {
    const state = stateStats.get(city.stateId);
    const country = countryStats.get(city.countryCode);
    const hasCoordinates = isPresent(city.latitude) && isPresent(city.longitude);
    const hasQid = isPresent(city.wikiDataId);
    if (state) {
      state.cities += 1;
      if (hasCoordinates) state.cityCoordinates += 1;
      if (hasQid) state.cityQids += 1;
    }
    if (country) {
      country.cityRecords += 1;
      if (hasCoordinates) country.cityCoordinates += 1;
      if (hasQid) country.cityQids += 1;
    }
  }

  const coverageByCountry = new Map(
    coverageReport.countryCoverage.map((entry) => [entry.countryCode, entry])
  );
  const drilldownByCountry = new Map(
    qualityReport.countryDrilldown.map((entry) => [entry.countryCode, entry])
  );
  const countryMetadataFilled = countries.reduce(
    (sum, country) =>
      sum + COUNTRY_METADATA_FIELDS.filter((field) => isPresent(country[field])).length,
    0
  );
  const stateCoordinates = states.filter(
    (state) => isPresent(state.latitude) && isPresent(state.longitude)
  ).length;
  const cityCoordinates = cities.filter(
    (city) => isPresent(city.latitude) && isPresent(city.longitude)
  ).length;
  const cityQids = cities.filter((city) => isPresent(city.wikiDataId)).length;
  const sourceAgeDays = Math.max(
    0,
    Math.floor(
      (Date.parse(qualityReport.generatedAt) - Date.parse(sourceManifest.source.publishedAt)) /
        86_400_000
    )
  );
  const regressions = findBlockingDashboardRegressions({ qualityReport, qualityPolicy });

  const knownIssues = qualityExceptions.entries.map((entry) => ({
    id: entry.id,
    checkId: entry.checkId,
    severity: entry.severity,
    expectedCount: entry.expectedCount,
    owner: entry.owner,
    rationale: entry.rationale,
    expiresAt: entry.expiresAt,
    scope: entry.scope,
    sourceRefs: entry.sourceRefs,
  }));

  const issueIdsForState = (state) =>
    knownIssues
      .filter((issue) => {
        if (issue.scope.entity !== 'state') return false;
        if (issue.scope.countryCodes && !issue.scope.countryCodes.includes(state.countryCode))
          return false;
        if (issue.scope.recordIds && !issue.scope.recordIds.includes(state.id)) return false;
        if (
          issue.checkId === 'state-coordinate-outliers' &&
          !issue.scope.recordIds &&
          state.coordinateStatus !== 'exception'
        )
          return false;
        return true;
      })
      .map((issue) => issue.id);

  const stateRows = states.map((state) => {
    const stats = stateStats.get(state.id);
    return {
      id: state.id,
      publicId: `csc:state:${state.id}`,
      name: state.name,
      countryCode: state.countryCode,
      stateCode: state.stateCode,
      type: state.type,
      typeStatus: state.typeStatus,
      entityType: state.entityType,
      lifecycleStatus: state.lifecycleStatus,
      coordinateStatus: state.coordinateStatus,
      coordinateType: state.coordinateType,
      coordinateSource: state.coordinateSource,
      latitude: state.latitude,
      longitude: state.longitude,
      cities: stats.cities,
      cityCoordinateCoverage: ratio(stats.cityCoordinates, stats.cities),
      cityQidCoverage: ratio(stats.cityQids, stats.cities),
      knownIssueIds: issueIdsForState(state),
    };
  });

  const countryRows = countries.map((country) => {
    const coverage = coverageByCountry.get(country.iso2);
    const quality = drilldownByCountry.get(country.iso2);
    const stats = countryStats.get(country.iso2);
    const metadataFilled = COUNTRY_METADATA_FIELDS.filter((field) =>
      isPresent(country[field])
    ).length;
    return {
      id: country.id,
      publicId: `csc:country:${country.id}`,
      code: country.iso2,
      name: country.name,
      sourceStatus: {
        states: coverage.states.status,
        stateReasonCode: coverage.states.reasonCode ?? null,
        cities: coverage.cities.status,
        cityReasonCode: coverage.cities.reasonCode ?? null,
        coordinate: coverage.coordinate.status,
      },
      states: coverage.states.count,
      cities: coverage.cities.count,
      coverageGaps: quality.coverageGaps,
      metadata: {
        filled: metadataFilled,
        denominator: COUNTRY_METADATA_FIELDS.length,
        completeness: ratio(metadataFilled, COUNTRY_METADATA_FIELDS.length),
        gaps: coverage.metadataGaps,
      },
      cityCoordinateCoverage: ratio(stats.cityCoordinates, stats.cityRecords),
      cityQidCoverage: ratio(stats.cityQids, stats.cityRecords),
      stateCoordinateExceptions: quality.stateCoordinateExceptions,
      lowConfidenceQids: quality.lowConfidenceQids,
    };
  });

  const metrics = [
    {
      id: 'release-gate',
      label: 'Release checks passed',
      numerator: qualityReport.gate.checksPassed,
      denominator: qualityReport.gate.checksTotal,
      value: ratio(qualityReport.gate.checksPassed, qualityReport.gate.checksTotal),
      unit: 'ratio',
      definition: 'Critical and high release checks with no unresolved blocking finding.',
      source: 'data/quality-report.json',
    },
    {
      id: 'country-record-coverage',
      label: 'Country records published',
      numerator: coverageReport.summary.contract.actualCountryRecords,
      denominator: coverageReport.summary.contract.expectedCountryRecords,
      value: coverageReport.summary.contract.countryRecordCoverageRate,
      unit: 'ratio',
      definition: 'Published ISO country/territory rows divided by the coverage contract target.',
      source: 'data/coverage-report.json',
    },
    {
      id: 'gap-classification',
      label: 'Coverage gaps classified',
      numerator: coverageReport.summary.contract.classifiedGapCount,
      denominator: coverageReport.summary.contract.totalGapCount,
      value: coverageReport.summary.contract.gapClassificationRate,
      unit: 'ratio',
      definition:
        'Empty layers and required metadata gaps with an explicit status and reason code.',
      source: 'data/coverage-report.json',
    },
    {
      id: 'state-coordinate-coverage',
      label: 'State coordinates available',
      numerator: stateCoordinates,
      denominator: states.length,
      value: ratio(stateCoordinates, states.length),
      unit: 'ratio',
      definition: 'Administrative-area rows with a paired latitude and longitude.',
      source: 'data/state.json',
    },
    {
      id: 'city-coordinate-coverage',
      label: 'City coordinates available',
      numerator: cityCoordinates,
      denominator: cities.length,
      value: ratio(cityCoordinates, cities.length),
      unit: 'ratio',
      definition: 'Place rows with a paired latitude and longitude.',
      source: 'data/city.json',
    },
    {
      id: 'city-qid-coverage',
      label: 'Verified city QIDs retained',
      numerator: cityQids,
      denominator: cities.length,
      value: ratio(cityQids, cities.length),
      unit: 'ratio',
      definition: 'Place rows retaining a unique, verified Wikidata QID after the quality audit.',
      source: 'data/identity/wikidata-qid-verification.json',
    },
    {
      id: 'country-metadata-completeness',
      label: 'Country metadata cells filled',
      numerator: countryMetadataFilled,
      denominator: countries.length * COUNTRY_METADATA_FIELDS.length,
      value: ratio(countryMetadataFilled, countries.length * COUNTRY_METADATA_FIELDS.length),
      unit: 'ratio',
      definition: `Filled cells across ${COUNTRY_METADATA_FIELDS.join(', ')} for every country row.`,
      source: 'data/country.json',
    },
  ];

  const latestDiff = versionIndex.releases[0] ?? null;
  return {
    schemaVersion: 1,
    generatedAt: qualityReport.generatedAt,
    dataVersion: productionManifest.dataVersion,
    packageVersion: productionManifest.packageVersion,
    release: {
      sourceRelease: sourceManifest.source.release,
      sourceRevision: sourceManifest.source.revision,
      sourcePublishedAt: sourceManifest.source.publishedAt,
      sourceAgeDays,
      license: sourceManifest.source.license,
    },
    gate: {
      ...qualityReport.gate,
      policyVersion: qualityReport.policyVersion,
      deploymentBlocked: regressions.length > 0,
      regressions,
    },
    totals: productionManifest.counts,
    metrics,
    trend: [
      {
        packageVersion: productionManifest.packageVersion,
        dataVersion: productionManifest.dataVersion,
        generatedAt: qualityReport.generatedAt,
        gatePassed: qualityReport.gate.passed,
        unresolvedBlockingFindings: qualityReport.gate.unresolvedBlockingFindings,
        checksPassed: qualityReport.gate.checksPassed,
        checksTotal: qualityReport.gate.checksTotal,
        records: productionManifest.counts,
        releaseChanges: latestDiff?.totals.total ?? null,
        breakingIdentityChanges: latestDiff?.totals.breakingIdentity ?? null,
      },
    ],
    countries: countryRows,
    states: stateRows,
    checks: qualityReport.checks.map(({ sample: _sample, ...check }) => check),
    knownIssues,
    operations: {
      publicScope: 'Release evidence, metric definitions, reviewed exceptions, and source links.',
      maintainerPanelPublished: false,
      maintainerScope:
        'Private review queues, contributor-abuse signals, and deployment credentials remain in CI and maintainer systems.',
    },
    exports: {
      json: '/data/quality/dashboard.json',
      csv: '/data/quality/dashboard.csv',
    },
  };
}

export function qualityDashboardCsv(dashboard) {
  const headers = [
    'countryCode',
    'countryName',
    'states',
    'cities',
    'stateCoverageStatus',
    'cityCoverageStatus',
    'coverageGaps',
    'metadataFilled',
    'metadataDenominator',
    'metadataCompleteness',
    'cityCoordinateCoverage',
    'cityQidCoverage',
    'stateCoordinateExceptions',
    'lowConfidenceQids',
    'dataVersion',
  ];
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const rows = dashboard.countries.map((country) => [
    country.code,
    country.name,
    country.states,
    country.cities,
    country.sourceStatus.states,
    country.sourceStatus.cities,
    country.coverageGaps,
    country.metadata.filled,
    country.metadata.denominator,
    country.metadata.completeness,
    country.cityCoordinateCoverage,
    country.cityQidCoverage,
    country.stateCoordinateExceptions,
    country.lowConfidenceQids,
    dashboard.dataVersion,
  ]);
  return `${[headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')}\n`;
}
