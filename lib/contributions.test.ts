import { describe, expect, it } from 'vitest';

// The contribution workflow is intentionally shared with Node-based GitHub Actions scripts.
// @ts-expect-error JavaScript workflow module has no separate declaration file.
import {
  calculateContributionMetrics,
  correctionPatch,
  parseCorrectionIssue,
  validateCorrectionSubmission,
} from '../scripts/lib/contributions.mjs';

const validBody = `### Entity type
City

### Public ID
csc:city:107863

### Field
Coordinates

### Current value
\
\`\`\`json
{"latitude":"40.98","longitude":"29.09"}
\`\`\`

### Proposed value
\
\`\`\`json
{"latitude":"40.981096","longitude":"29.065145"}
\`\`\`

### Source URL
https://www.openstreetmap.org/relation/1276548

### Source license
ODbL-1.0

### Explanation and evidence
The relation point-on-surface is inside the published district boundary.

### Contributor attestation
- [x] I confirm that the source is public and compatible.`;

describe('community correction workflow', () => {
  it('parses and validates a complete source-backed issue form', () => {
    const parsed = parseCorrectionIssue(validBody);
    const result = validateCorrectionSubmission({
      body: validBody,
      author: 'contributor',
      createdAt: '2026-08-08T00:00:00.000Z',
    });

    expect(parsed).toMatchObject({ entityType: 'City', publicId: 'csc:city:107863' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.fingerprint).toMatch(/^[a-f\d]{64}$/u);
  });

  it('blocks unsourced, unchanged, mismatched, unlicensed, and unattested input', () => {
    const body = validBody
      .replace('csc:city:107863', 'csc:state:107863')
      .replace('https://www.openstreetmap.org/relation/1276548', 'http://localhost/source')
      .replace('ODbL-1.0', 'Unknown')
      .replace(
        '{"latitude":"40.981096","longitude":"29.065145"}',
        '{"latitude":"40.98","longitude":"29.09"}'
      )
      .replace('- [x]', '- [ ]');
    const result = validateCorrectionSubmission({
      body,
      author: 'abuse',
      createdAt: '2026-08-08T00:00:00.000Z',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/entity does not match/i);
    expect(result.errors.join(' ')).toMatch(/must differ/i);
    expect(result.errors.join(' ')).toMatch(/HTTPS/i);
    expect(result.errors.join(' ')).toMatch(/license/i);
    expect(result.errors.join(' ')).toMatch(/attestation/i);
  });

  it('creates an accepted patch with contributor/source/reviewer audit trail', () => {
    const patch = correctionPatch({
      contributionId: 'CSC-CORR-2026-0001',
      entity: 'city',
      id: 107863,
      changes: { latitude: '40.98109600' },
      reason: 'Use source point-on-surface.',
      sourceUrl: 'https://www.openstreetmap.org/relation/1276548',
      license: 'ODbL-1.0',
      contributor: 'alice',
      submittedAt: '2026-08-08T00:00:00.000Z',
      reviewer: 'maintainer',
      reviewedAt: '2026-08-08T12:00:00.000Z',
      issueUrl: 'https://github.com/tansuasici/CountryStateCity/issues/123',
    });

    expect(patch).toMatchObject({
      contributionId: 'CSC-CORR-2026-0001',
      operation: 'merge',
      auditTrail: { contributor: 'alice', reviewer: 'maintainer', decision: 'accepted' },
    });
  });

  it('calculates acceptance/rejection and SLA compliance from the audit ledger', () => {
    const metrics = calculateContributionMetrics([
      {
        decision: 'accepted',
        submittedAt: '2026-08-01T00:00:00.000Z',
        firstRespondedAt: '2026-08-02T00:00:00.000Z',
        reviewedAt: '2026-08-05T00:00:00.000Z',
      },
      {
        decision: 'rejected',
        submittedAt: '2026-08-01T00:00:00.000Z',
        firstRespondedAt: '2026-08-05T00:00:00.000Z',
        reviewedAt: '2026-08-10T00:00:00.000Z',
      },
    ]);

    expect(metrics.totals).toMatchObject({ submitted: 2, accepted: 1, rejected: 1 });
    expect(metrics.rates).toEqual({ acceptance: 0.5, rejection: 0.5 });
    expect(metrics.sla).toMatchObject({
      firstResponseMeasured: 2,
      firstResponseMet: 1,
      firstResponseCompliance: 0.5,
      decisionMeasured: 2,
      decisionMet: 1,
      decisionCompliance: 0.5,
    });
  });
});
