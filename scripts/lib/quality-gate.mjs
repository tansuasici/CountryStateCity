export function evaluateQualityGate(checks, policy) {
  const blockingSeverities = new Set(policy.releaseGate.blockingSeverities);
  const unresolvedBlockingFindings = checks
    .filter((check) => blockingSeverities.has(check.severity))
    .reduce((sum, check) => sum + check.unresolved, 0);
  return {
    passed: unresolvedBlockingFindings <= policy.releaseGate.maximumUnresolvedBlockingFindings,
    blockingSeverities: policy.releaseGate.blockingSeverities,
    unresolvedBlockingFindings,
    checksPassed: checks.filter((check) => check.status === 'passed').length,
    checksTotal: checks.length,
  };
}
