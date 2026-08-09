export function applySchemaNormalization(countries, states, policy) {
  validatePolicy(policy);
  let countryChanges = 0;
  let stateChanges = 0;
  const aliases = policy.countryTranslations.deprecatedAliases;
  const locales = policy.countryTranslations.canonicalLocales;

  for (const country of countries) {
    const source = country.translations ?? {};
    const canonical = {};
    for (const locale of locales) {
      const legacyKey = Object.entries(aliases).find(([, target]) => target === locale)?.[0];
      canonical[locale] = source[locale] ?? (legacyKey ? source[legacyKey] : undefined) ?? null;
    }
    countryChanges += countDifferences(country.translations, canonical);
    country.translations = canonical;
    country.translationMissingLocales = locales.filter((locale) => canonical[locale] === null);
    country.translationSource = policy.policyVersion;
  }

  const allowed = new Set(policy.stateType.canonicalValues);
  for (const state of states) {
    const canonicalType =
      typeof state.type === 'string' && state.type.trim()
        ? state.type.normalize('NFC').trim().toLocaleLowerCase('en')
        : null;
    if (canonicalType !== null && !allowed.has(canonicalType)) {
      throw new Error(`Unknown state type ${state.id}: ${JSON.stringify(state.type)}`);
    }
    if (state.type !== canonicalType) stateChanges += 1;
    state.type = canonicalType;
    state.typeStatus = canonicalType === null ? 'unknown' : 'available';
    state.typeReasonCode = canonicalType === null ? policy.stateType.unknownReasonCode : null;
    state.typeSource = policy.policyVersion;
  }
  return { countryChanges, stateChanges };
}

export function validateSchemaNormalization(countries, states, policy) {
  validatePolicy(policy);
  const expectedLocales = policy.countryTranslations.canonicalLocales;
  const expectedKey = JSON.stringify(expectedLocales);
  for (const country of countries) {
    const keys = Object.keys(country.translations ?? {});
    assert(JSON.stringify(keys) === expectedKey, `Country translation key drift: ${country.iso2}`);
    assert(
      country.translationMissingLocales.every((locale) => country.translations[locale] === null),
      `Country missing translation metadata drift: ${country.iso2}`
    );
    assert(
      country.translationSource === policy.policyVersion,
      `Country translation source drift: ${country.iso2}`
    );
  }
  const allowed = new Set(policy.stateType.canonicalValues);
  for (const state of states) {
    assert(
      state.type === null || allowed.has(state.type),
      `Invalid canonical state type: ${state.id}`
    );
    assert(
      state.type === null || state.type === state.type.trim().toLocaleLowerCase('en'),
      `Unnormalized state type: ${state.id}`
    );
    assert(
      state.typeStatus === (state.type === null ? 'unknown' : 'available'),
      `State type status drift: ${state.id}`
    );
    assert(
      state.typeReasonCode === (state.type === null ? policy.stateType.unknownReasonCode : null),
      `State type reason drift: ${state.id}`
    );
    assert(state.typeSource === policy.policyVersion, `State type source drift: ${state.id}`);
  }
}

function countDifferences(before, after) {
  return JSON.stringify(before) === JSON.stringify(after) ? 0 : 1;
}

function validatePolicy(policy) {
  assert(policy.schemaVersion === 1, 'Unsupported schema normalization policy');
  assert(
    policy.policyVersion === 'schema-normalization-policy:v1',
    'Unexpected schema normalization policy'
  );
  assert(
    new Set(policy.countryTranslations.canonicalLocales).size ===
      policy.countryTranslations.canonicalLocales.length,
    'Duplicate canonical locale'
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
