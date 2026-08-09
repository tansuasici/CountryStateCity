const COORDINATE_FIELDS = [
  'latitude',
  'longitude',
  'coordinateType',
  'coordinateSource',
  'coordinateVerifiedAt',
  'coordinateValidation',
  'coordinateStatus',
];

export function applyStateCoordinatePolicy(states, policy, options = {}) {
  validatePolicy(policy);
  let applied = 0;
  let unreviewed = 0;
  for (const state of states) {
    const key = `${state.countryCode}-${state.stateCode}`;
    const record = policy.records[key];
    if (!record) {
      if (!options.allowUnreviewed) throw new Error(`Missing state coordinate policy: ${key}`);
      Object.assign(state, {
        coordinateType: 'source-point-unspecified',
        coordinateSource: 'pending-source-review',
        coordinateVerifiedAt: null,
        coordinateValidation: 'not-in-reviewed-policy',
        coordinateStatus: 'review-required',
      });
      unreviewed += 1;
      continue;
    }
    for (const field of COORDINATE_FIELDS) state[field] = record[field];
    applied += 1;
  }
  return { applied, unreviewed };
}

export function validateStateCoordinatePolicy(states, policy) {
  validatePolicy(policy);
  assert(
    Object.keys(policy.records).length === states.length,
    'State coordinate policy count differs'
  );
  assert(policy.reviewedMajorOutliers.length === 317, 'Reviewed state outlier count regressed');
  assert(policy.exceptions.length === 51, 'State coordinate exception count regressed');
  assert(
    policy.reviewedMajorOutliers.every((item) =>
      ['verified', 'derived', 'exception'].includes(item.resolution)
    ),
    'Unresolved reviewed state outlier'
  );
  for (const state of states) {
    const key = `${state.countryCode}-${state.stateCode}`;
    const record = policy.records[key];
    assert(record, `Missing state coordinate record: ${key}`);
    assert(record.stateId === state.id, `State coordinate ID drift: ${key}`);
    assert(record.name === state.name, `State coordinate name drift: ${key}`);
    for (const field of COORDINATE_FIELDS) {
      assert(state[field] === record[field], `Stale state coordinate field ${key}.${field}`);
    }
    const hasPoint = state.latitude !== null && state.longitude !== null;
    assert(
      hasPoint ||
        (state.coordinateType === 'unavailable' && state.coordinateStatus === 'exception'),
      `Undocumented null state coordinate: ${key}`
    );
    assert(state.coordinateVerifiedAt === '2026-08-08', `Unverified state coordinate: ${key}`);
  }
}

function validatePolicy(policy) {
  assert(policy.schemaVersion === 1, 'Unsupported state coordinate policy');
  assert(
    policy.policyVersion === 'state-coordinate-policy:v1',
    'Unexpected state coordinate policy'
  );
  assert(policy.majorOutlierThresholdKm === 25, 'Unexpected state coordinate threshold');
  assert(policy.records && typeof policy.records === 'object', 'Missing state coordinate records');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
