const VALID_STATUSES = new Set(['available', 'missing', 'notApplicable', 'unknown']);

export function buildCoverageReport({ countries, states, cities, policy }) {
  assert(policy.schemaVersion === 1, 'Unsupported coverage policy schema');
  assert(
    countries.length === policy.contract.expectedCountryRecords,
    `Expected ${policy.contract.expectedCountryRecords} countries, received ${countries.length}`
  );

  const countryById = new Map(countries.map((country) => [country.id, country]));
  const stateById = new Map(states.map((state) => [state.id, state]));
  const stateCounts = countBy(states, (state) => state.countryId);
  const cityCountryCounts = countBy(cities, (city) => city.countryId);
  const cityStateCounts = countBy(cities, (city) => city.stateId);
  const reasonCodes = new Set(Object.keys(policy.reasonCodes));
  const countryCoverage = [];
  const countryGaps = [];
  const stateGaps = [];
  let sentinelCoordinatePairs = 0;

  for (const country of countries) {
    const rules = policy.countryRules[country.iso2] ?? {};
    const stateCount = stateCounts.get(country.id) ?? 0;
    const cityCount = cityCountryCounts.get(country.id) ?? 0;
    const stateCoverage = classifyCount(
      stateCount,
      rules.states ?? policy.defaultRules.states,
      reasonCodes
    );
    const cityCoverage = classifyCount(
      cityCount,
      rules.cities ?? policy.defaultRules.cities,
      reasonCodes
    );
    const metadataGaps = [];

    for (const field of policy.contract.requiredCountryMetadata) {
      if (!isBlank(country[field])) continue;
      const classification = normalizeClassification(
        rules.metadata?.[field] ?? policy.defaultRules.metadata,
        reasonCodes
      );
      metadataGaps.push({ field, ...classification });
      countryGaps.push({
        countryId: country.id,
        countryCode: country.iso2,
        countryName: country.name,
        scope: `metadata.${field}`,
        ...classification,
      });
    }

    const latitudeBlank = isBlank(country.latitude);
    const longitudeBlank = isBlank(country.longitude);
    const isSentinel = Number(country.latitude) === 0 && Number(country.longitude) === 0;
    if (isSentinel && !latitudeBlank && !longitudeBlank) sentinelCoordinatePairs += 1;
    let coordinate = { status: 'available' };
    if (latitudeBlank || longitudeBlank || isSentinel) {
      coordinate = normalizeClassification(
        latitudeBlank !== longitudeBlank
          ? { status: 'missing', reasonCode: 'partial-coordinate' }
          : (rules.coordinate ?? policy.defaultRules.coordinate),
        reasonCodes
      );
      countryGaps.push({
        countryId: country.id,
        countryCode: country.iso2,
        countryName: country.name,
        scope: 'coordinate',
        ...coordinate,
      });
    }

    if (stateCoverage.status !== 'available') {
      countryGaps.push({
        countryId: country.id,
        countryCode: country.iso2,
        countryName: country.name,
        scope: 'states',
        ...withoutCount(stateCoverage),
      });
    }
    if (cityCoverage.status !== 'available') {
      countryGaps.push({
        countryId: country.id,
        countryCode: country.iso2,
        countryName: country.name,
        scope: 'cities',
        ...withoutCount(cityCoverage),
      });
    }

    countryCoverage.push({
      countryId: country.id,
      countryCode: country.iso2,
      countryName: country.name,
      states: stateCoverage,
      cities: cityCoverage,
      metadataGaps,
      coordinate,
    });
  }

  for (const state of states) {
    if ((cityStateCounts.get(state.id) ?? 0) > 0) continue;
    const country = countryById.get(state.countryId);
    assert(country, `Coverage report found orphan state country: ${state.id}`);
    const classification = normalizeClassification(
      policy.stateRules?.[String(state.id)] ?? policy.defaultRules.stateChildren,
      reasonCodes
    );
    stateGaps.push({
      stateId: state.id,
      stateCode: state.stateCode,
      stateName: state.name,
      countryId: country.id,
      countryCode: country.iso2,
      countryName: country.name,
      scope: 'cities',
      ...classification,
    });
  }

  for (const city of cities) {
    assert(
      countryById.has(city.countryId),
      `Coverage report found orphan city country: ${city.id}`
    );
    assert(stateById.has(city.stateId), `Coverage report found orphan city state: ${city.id}`);
  }

  const allGaps = [...countryGaps, ...stateGaps];
  const classifiedGapCount = allGaps.filter(
    (gap) => VALID_STATUSES.has(gap.status) && reasonCodes.has(gap.reasonCode)
  ).length;
  const gapClassificationRate = allGaps.length === 0 ? 1 : classifiedGapCount / allGaps.length;
  const contract = {
    expectedCountryRecords: policy.contract.expectedCountryRecords,
    actualCountryRecords: countries.length,
    countryRecordCoverageRate: countries.length / policy.contract.expectedCountryRecords,
    classifiedGapCount,
    totalGapCount: allGaps.length,
    gapClassificationRate,
    requiredGapClassificationRate: policy.contract.requiredGapClassificationRate,
    sentinelCoordinatePairs,
    maximumSentinelCoordinatePairs: policy.contract.maximumSentinelCoordinatePairs,
  };
  contract.passed =
    contract.countryRecordCoverageRate === 1 &&
    contract.gapClassificationRate >= contract.requiredGapClassificationRate &&
    contract.sentinelCoordinatePairs <= contract.maximumSentinelCoordinatePairs;

  return {
    schemaVersion: 1,
    policyVersion: policy.policyVersion,
    reviewedAt: policy.reviewedAt,
    sourceRelease: policy.sourceRelease,
    counts: {
      countries: countries.length,
      states: states.length,
      cities: cities.length,
    },
    summary: {
      countriesWithoutStates: countryCoverage.filter((entry) => entry.states.count === 0).length,
      countriesWithoutCities: countryCoverage.filter((entry) => entry.cities.count === 0).length,
      statesWithoutCities: stateGaps.length,
      countryMetadataGaps: countryCoverage.reduce(
        (sum, entry) => sum + entry.metadataGaps.length,
        0
      ),
      countryCoordinateGaps: countryCoverage.filter(
        (entry) => entry.coordinate.status !== 'available'
      ).length,
      gapStatusCounts: countStatuses(allGaps),
      contract,
    },
    countryCoverage,
    countryGaps,
    stateGaps,
  };
}

function classifyCount(count, emptyRule, reasonCodes) {
  if (count > 0) return { count, status: 'available' };
  return { count, ...normalizeClassification(emptyRule, reasonCodes) };
}

function normalizeClassification(classification, reasonCodes) {
  assert(classification, 'Coverage classification is missing');
  assert(
    VALID_STATUSES.has(classification.status),
    `Invalid coverage status: ${classification.status}`
  );
  assert(
    classification.status !== 'available',
    'Gap classifications cannot use the available status'
  );
  assert(
    reasonCodes.has(classification.reasonCode),
    `Unknown coverage reason code: ${classification.reasonCode}`
  );
  return { status: classification.status, reasonCode: classification.reasonCode };
}

function countBy(rows, keyForRow) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyForRow(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function countStatuses(gaps) {
  const counts = { missing: 0, notApplicable: 0, unknown: 0 };
  for (const gap of gaps) counts[gap.status] = (counts[gap.status] ?? 0) + 1;
  return counts;
}

function withoutCount(value) {
  return { status: value.status, reasonCode: value.reasonCode };
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
