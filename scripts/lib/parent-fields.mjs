export function normalizeParentFields(canonical) {
  const countryById = new Map(canonical.countries.map((country) => [country.id, country]));
  const stateById = new Map(canonical.states.map((state) => [state.id, state]));
  const changes = createCounts();

  for (const state of canonical.states) {
    const country = countryById.get(state.countryId);
    assert(country, `Orphan state country reference: ${state.id}/${state.countryId}`);
    assign(state, 'countryCode', country.iso2, changes.state);
    assign(state, 'countryName', country.name, changes.state);
  }

  for (const city of canonical.cities) {
    const country = countryById.get(city.countryId);
    const state = stateById.get(city.stateId);
    assert(country, `Orphan city country reference: ${city.id}/${city.countryId}`);
    assert(state, `Orphan city state reference: ${city.id}/${city.stateId}`);
    assert(
      state.countryId === city.countryId,
      `City/state country mismatch: ${city.id}/${city.stateId}`
    );
    assign(city, 'countryCode', country.iso2, changes.city);
    assign(city, 'countryName', country.name, changes.city);
    assign(city, 'stateCode', state.stateCode, changes.city);
    assign(city, 'stateName', state.name, changes.city);
  }

  return changes;
}

export function auditParentFields(canonical) {
  const clone = {
    countries: canonical.countries,
    states: canonical.states.map((state) => ({ ...state })),
    cities: canonical.cities.map((city) => ({ ...city })),
  };
  return normalizeParentFields(clone);
}

export function totalParentFieldMismatches(counts) {
  return Object.values(counts.state).reduce(sum, 0) + Object.values(counts.city).reduce(sum, 0);
}

function createCounts() {
  return {
    state: { countryCode: 0, countryName: 0 },
    city: { countryCode: 0, countryName: 0, stateCode: 0, stateName: 0 },
  };
}

function assign(row, field, value, counts) {
  if (row[field] === value) return;
  row[field] = value;
  counts[field] += 1;
}

function sum(total, value) {
  return total + value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
