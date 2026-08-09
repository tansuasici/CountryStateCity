export function applyCountryMetadataPolicy(countries, policy) {
  const changes = [];
  for (const country of countries) {
    const code = policy.codeExceptions[country.iso2] ?? policy.defaultCode;
    assign(country, 'codeAuthority', code.codeAuthority, changes);
    assign(country, 'codeStatus', code.codeStatus, changes);
    assign(country, 'metadataSource', policy.metadataSource, changes);
    assign(country, 'metadataVerifiedAt', policy.verifiedAt, changes);

    const patch = policy.changes[country.iso2];
    if (!patch) continue;
    for (const [field, value] of Object.entries(patch)) {
      if (['aliases', 'effectiveFrom', 'sourceId'].includes(field)) continue;
      assign(country, field, value, changes);
    }
  }
  return changes;
}

export function validateCountryMetadataPolicy(countries, policy) {
  const clone = countries.map((country) => ({ ...country }));
  const changes = applyCountryMetadataPolicy(clone, policy);
  if (changes.length > 0) {
    throw new Error(`Country metadata policy drift: ${JSON.stringify(changes.slice(0, 10))}`);
  }
  const statuses = countBy(countries, (country) => country.codeStatus);
  if (statuses.get('officially-assigned') !== 249 || statuses.get('user-assigned') !== 1) {
    throw new Error(
      `Unexpected country code status counts: ${JSON.stringify(Object.fromEntries(statuses))}`
    );
  }
}

function assign(row, field, value, changes) {
  if (row[field] === value) return;
  changes.push({ id: row.id, field, before: row[field] ?? null, after: value });
  row[field] = value;
}

function countBy(rows, keyForRow) {
  const counts = new Map();
  for (const row of rows) counts.set(keyForRow(row), (counts.get(keyForRow(row)) ?? 0) + 1);
  return counts;
}
