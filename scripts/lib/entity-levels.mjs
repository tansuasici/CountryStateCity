const ADMINISTRATIVE_PLACE_TYPES = [
  ['shahrestān', 'shahrestan'],
  ['administrative area', 'administrative-area'],
  ['municipality', 'municipality'],
  ['prefecture', 'prefecture'],
  ['province', 'province'],
  ['district', 'district'],
  ['county', 'county'],
  ['region', 'region'],
  ['department', 'department'],
  ['governorate', 'governorate'],
  ['canton', 'canton'],
  ['territory', 'territory'],
];

export function applyEntityLevelPolicy(canonical, policy, currentDisplay) {
  validatePolicy(policy);
  const countryById = new Map(canonical.countries.map((country) => [country.id, country]));
  const stateById = new Map();
  const changes = { states: 0, cities: 0 };

  for (const state of canonical.states) {
    const country = countryById.get(state.countryId);
    assert(country, `Entity policy: unknown state country ${state.id}`);
    const classification = classifyState(state, policy, currentDisplay?.subdivisions ?? {});
    changes.states += assignClassification(state, classification);
    stateById.set(state.id, state);
  }

  for (const city of canonical.cities) {
    const state = stateById.get(city.stateId);
    assert(state, `Entity policy: unknown city state ${city.id}`);
    const classification = classifyCity(city, state, policy);
    changes.cities += assignClassification(city, classification);
  }

  return changes;
}

export function validateEntityLevelPolicy(canonical, policy, currentDisplay) {
  validatePolicy(policy);
  const copy = {
    countries: canonical.countries,
    states: canonical.states.map((row) => ({ ...row })),
    cities: canonical.cities.map((row) => ({ ...row })),
  };
  applyEntityLevelPolicy(copy, policy, currentDisplay);

  for (let index = 0; index < canonical.states.length; index += 1) {
    assertClassificationEqual('state', canonical.states[index], copy.states[index]);
  }
  for (let index = 0; index < canonical.cities.length; index += 1) {
    assertClassificationEqual('city', canonical.cities[index], copy.cities[index]);
  }

  const summary = summarizeEntityLevels(canonical);
  assert(summary.states.total === canonical.states.length, 'Entity state count mismatch');
  assert(summary.cities.total === canonical.cities.length, 'Entity city count mismatch');
  assert(
    summary.states.byEntityType['administrative-area'] === canonical.states.length,
    'Every state must be an administrative area'
  );
  assert(summary.cities.byEntityType.settlement > 0, 'Settlement layer is empty');
  assert(summary.states.byLifecycleStatus.historical > 0, 'Historical subdivision layer is empty');
  return summary;
}

export function summarizeEntityLevels(canonical) {
  return {
    schemaVersion: 1,
    policyVersion: 'entity-level-policy:v1',
    generatedAt: '2026-08-08',
    states: summarize(canonical.states),
    cities: summarize(canonical.cities),
    countries: Object.fromEntries(
      canonical.countries.map((country) => {
        const states = canonical.states.filter((row) => row.countryId === country.id);
        return [
          country.iso2,
          {
            stateLevels: countBy(states, (row) => String(row.administrativeLevel)),
            lifecycleStatuses: countBy(states, (row) => row.lifecycleStatus),
            placeTypes: countBy(states, (row) => row.placeType),
          },
        ];
      })
    ),
  };
}

function classifyState(state, policy, subdivisions) {
  const countryRule = policy.countryMappings[state.countryCode] ?? {};
  const sourceType =
    normalizeType(state.type) || inferSuffixType(state.name) || 'administrative-area';
  const level =
    lookupNormalized(countryRule.stateTypeLevels, sourceType) ??
    lookupSuffix(countryRule.stateNameSuffixLevels, state.name) ??
    countryRule.sourceStateLevel ??
    policy.countryMappings.default.sourceStateLevel;
  const currentKey = `${state.countryCode}-${state.stateCode}`;
  const historicalRule = policy.historicalRules.find(
    (rule) =>
      rule.countryCode === state.countryCode &&
      (!rule.nameSuffix || state.name.endsWith(rule.nameSuffix))
  );
  const lifecycleStatus = historicalRule
    ? 'historical'
    : subdivisions[currentKey]
      ? 'current'
      : 'review-required';
  return {
    entityType: 'administrative-area',
    administrativeLevel: level,
    placeType: sourceType,
    parentId: state.countryId,
    lifecycleStatus,
    validFrom: null,
    validTo: historicalRule?.validTo ?? null,
    classificationConfidence:
      state.type || countryRule.stateTypeLevels?.[sourceType]
        ? 'source-or-explicit-rule'
        : inferSuffixType(state.name)
          ? 'name-inferred'
          : 'country-default',
    entityLevelSource: policy.policyVersion,
  };
}

function classifyCity(city, state, policy) {
  const inferredType = inferSuffixType(city.name);
  const isAdministrativeArea = inferredType !== null;
  return {
    entityType: isAdministrativeArea ? 'administrative-area' : 'settlement',
    administrativeLevel: isAdministrativeArea ? state.administrativeLevel + 1 : null,
    placeType: inferredType ?? policy.countryMappings.default.sourceCityType,
    parentId: city.stateId,
    lifecycleStatus: state.lifecycleStatus,
    validFrom: null,
    validTo: state.lifecycleStatus === 'historical' ? state.validTo : null,
    classificationConfidence: isAdministrativeArea ? 'name-inferred' : 'source-collection-default',
    entityLevelSource: policy.policyVersion,
  };
}

function assignClassification(target, classification) {
  let changed = 0;
  for (const [field, value] of Object.entries(classification)) {
    if (target[field] !== value) changed += 1;
    target[field] = value;
  }
  return changed;
}

function assertClassificationEqual(kind, actual, expected) {
  for (const field of [
    'entityType',
    'administrativeLevel',
    'placeType',
    'parentId',
    'lifecycleStatus',
    'validFrom',
    'validTo',
    'classificationConfidence',
    'entityLevelSource',
  ]) {
    assert(
      actual[field] === expected[field],
      `Stale ${kind} entity classification ${actual.id}.${field}`
    );
  }
  assert(
    ['administrative-area', 'settlement'].includes(actual.entityType),
    `Invalid entity type ${kind} ${actual.id}`
  );
  assert(
    ['current', 'historical', 'review-required'].includes(actual.lifecycleStatus),
    `Invalid lifecycle ${kind} ${actual.id}`
  );
  assert(
    actual.entityType === 'settlement'
      ? actual.administrativeLevel === null
      : Number.isInteger(actual.administrativeLevel) && actual.administrativeLevel > 0,
    `Invalid administrative level ${kind} ${actual.id}`
  );
}

function summarize(rows) {
  return {
    total: rows.length,
    byEntityType: countBy(rows, (row) => row.entityType),
    byAdministrativeLevel: countBy(rows, (row) => String(row.administrativeLevel)),
    byLifecycleStatus: countBy(rows, (row) => row.lifecycleStatus),
    byPlaceType: countBy(rows, (row) => row.placeType),
    byClassificationConfidence: countBy(rows, (row) => row.classificationConfidence),
  };
}

function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const value = selector(row);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function lookupNormalized(mapping, value) {
  if (!mapping) return null;
  const match = Object.entries(mapping).find(([key]) => normalizeType(key) === value);
  return match?.[1] ?? null;
}

function lookupSuffix(mapping, name) {
  if (!mapping) return null;
  return Object.entries(mapping).find(([suffix]) => name.endsWith(suffix))?.[1] ?? null;
}

function inferSuffixType(name) {
  const normalized = name.normalize('NFC').trim().toLocaleLowerCase('en');
  for (const [suffix, type] of ADMINISTRATIVE_PLACE_TYPES) {
    if (normalized.endsWith(suffix)) return type;
  }
  return null;
}

function normalizeType(value) {
  return typeof value === 'string' && value.trim()
    ? value.normalize('NFC').trim().toLocaleLowerCase('en')
    : null;
}

function validatePolicy(policy) {
  assert(policy.schemaVersion === 1, 'Unsupported entity level policy');
  assert(
    policy.policyVersion === 'entity-level-policy:v1',
    'Unexpected entity level policy version'
  );
  assert(policy.countryMappings?.default?.sourceStateLevel === 1, 'Missing default state level');
  assert(Array.isArray(policy.historicalRules), 'Missing historical rules');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
