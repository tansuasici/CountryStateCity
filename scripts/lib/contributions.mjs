import { createHash } from 'node:crypto';

const REQUIRED_SECTIONS = {
  entityType: 'Entity type',
  publicId: 'Public ID',
  field: 'Field',
  currentValue: 'Current value',
  proposedValue: 'Proposed value',
  sourceUrl: 'Source URL',
  sourceLicense: 'Source license',
  explanation: 'Explanation and evidence',
  attestation: 'Contributor attestation',
};

const ENTITY_TYPES = new Set(['country', 'state', 'city', 'district']);
const ALLOWED_LICENSES = new Set([
  'ODbL-1.0',
  'CC0-1.0',
  'CC-BY-4.0',
  'Public domain',
  'UN-M49',
  'Other (explain below)',
]);
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', 'bit.ly', 'tinyurl.com']);

export function parseCorrectionIssue(body) {
  const sections = new Map();
  const text = String(body || '');
  const headings = [...text.matchAll(/^###\s+(.+)$/gmu)];
  for (const [index, match] of headings.entries()) {
    const start = (match.index || 0) + match[0].length;
    const end = headings[index + 1]?.index ?? text.length;
    sections.set(match[1].trim(), cleanSection(text.slice(start, end)));
  }
  return Object.fromEntries(
    Object.entries(REQUIRED_SECTIONS).map(([key, heading]) => [key, sections.get(heading) || ''])
  );
}

export function validateCorrectionSubmission({ body, author, createdAt }) {
  const proposal = parseCorrectionIssue(body);
  const errors = [];
  for (const [key, heading] of Object.entries(REQUIRED_SECTIONS)) {
    if (!proposal[key] || proposal[key] === '_No response_') errors.push(`${heading} is required.`);
  }

  const entityType = proposal.entityType.toLocaleLowerCase('en');
  if (proposal.entityType && !ENTITY_TYPES.has(entityType)) errors.push('Entity type is invalid.');
  const idMatch = proposal.publicId.match(/^csc:(country|state|city|district):(\d+)$/);
  if (proposal.publicId && !idMatch) errors.push('Public ID must match csc:{entity}:{numericId}.');
  if (idMatch && idMatch[1] !== entityType)
    errors.push('Public ID entity does not match Entity type.');
  if (proposal.currentValue && proposal.currentValue === proposal.proposedValue) {
    errors.push('Current and proposed values must differ.');
  }
  if (proposal.explanation && proposal.explanation.length < 20) {
    errors.push('Explanation and evidence must contain at least 20 characters.');
  }
  if (proposal.sourceLicense && !ALLOWED_LICENSES.has(proposal.sourceLicense)) {
    errors.push('Source license is not in the supported intake list.');
  }
  if (!/\[[xX]\]/u.test(proposal.attestation)) errors.push('Contributor attestation is required.');

  let source;
  try {
    source = new URL(proposal.sourceUrl);
    if (source.protocol !== 'https:') errors.push('Source URL must use HTTPS.');
    if (BLOCKED_HOSTS.has(source.hostname.toLocaleLowerCase('en'))) {
      errors.push('Source URL uses a blocked local or redirect host.');
    }
  } catch {
    if (proposal.sourceUrl) errors.push('Source URL must be a valid absolute URL.');
  }
  if (
    proposal.sourceLicense === 'Other (explain below)' &&
    !/https:\/\/\S+/u.test(proposal.explanation)
  ) {
    errors.push('Other licenses require a stable HTTPS terms URL in the explanation.');
  }

  const canonical = {
    entityType,
    publicId: proposal.publicId,
    field: proposal.field,
    currentValue: proposal.currentValue,
    proposedValue: proposal.proposedValue,
    sourceUrl: source?.href || proposal.sourceUrl,
    sourceLicense: proposal.sourceLicense,
    explanation: proposal.explanation,
    contributor: author,
    submittedAt: createdAt,
  };
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        publicId: canonical.publicId,
        field: canonical.field,
        proposedValue: canonical.proposedValue,
        sourceUrl: canonical.sourceUrl,
      })
    )
    .digest('hex');

  return { valid: errors.length === 0, errors, fingerprint, proposal: canonical };
}

export function validateReviewedProposal(proposal) {
  const errors = [];
  if (!/^CSC-CORR-\d{4}-\d{4}$/u.test(proposal.contributionId || '')) {
    errors.push('contributionId must match CSC-CORR-YYYY-NNNN.');
  }
  if (!['country', 'state', 'city'].includes(proposal.entity)) {
    errors.push('Reviewed patch entity must be country, state, or city.');
  }
  if (!Number.isInteger(proposal.id) || proposal.id < 1)
    errors.push('Numeric entity id is required.');
  if (
    !proposal.changes ||
    typeof proposal.changes !== 'object' ||
    !Object.keys(proposal.changes).length
  ) {
    errors.push('At least one reviewed field change is required.');
  }
  for (const field of [
    'reason',
    'sourceUrl',
    'license',
    'contributor',
    'submittedAt',
    'reviewer',
    'reviewedAt',
    'issueUrl',
  ]) {
    if (!proposal[field]) errors.push(`${field} is required.`);
  }
  for (const field of ['sourceUrl', 'issueUrl']) {
    try {
      if (new URL(proposal[field]).protocol !== 'https:') errors.push(`${field} must use HTTPS.`);
    } catch {
      errors.push(`${field} must be a valid URL.`);
    }
  }
  return errors;
}

export function calculateContributionMetrics(entries, generatedAt = '2026-08-08T00:00:00.000Z') {
  const totals = {
    submitted: entries.length,
    inReview: entries.filter((entry) => entry.decision === 'in-review').length,
    accepted: entries.filter((entry) => entry.decision === 'accepted').length,
    rejected: entries.filter((entry) => entry.decision === 'rejected').length,
  };
  const decided = totals.accepted + totals.rejected;
  const firstResponses = entries.filter((entry) => entry.firstRespondedAt);
  const decisions = entries.filter(
    (entry) => entry.reviewedAt && ['accepted', 'rejected'].includes(entry.decision)
  );
  const hours = (start, end) => (Date.parse(end) - Date.parse(start)) / 3_600_000;
  const firstResponseMet = firstResponses.filter(
    (entry) => hours(entry.submittedAt, entry.firstRespondedAt) <= 72
  ).length;
  const decisionMet = decisions.filter(
    (entry) => hours(entry.submittedAt, entry.reviewedAt) <= 168
  ).length;
  return {
    schemaVersion: 1,
    generatedAt,
    totals,
    rates: {
      acceptance: decided ? Number((totals.accepted / decided).toFixed(4)) : null,
      rejection: decided ? Number((totals.rejected / decided).toFixed(4)) : null,
    },
    sla: {
      firstResponseTargetHours: 72,
      decisionTargetHours: 168,
      firstResponseMeasured: firstResponses.length,
      firstResponseMet,
      firstResponseCompliance: firstResponses.length
        ? Number((firstResponseMet / firstResponses.length).toFixed(4))
        : null,
      decisionMeasured: decisions.length,
      decisionMet,
      decisionCompliance: decisions.length
        ? Number((decisionMet / decisions.length).toFixed(4))
        : null,
    },
  };
}

export function correctionPatch(proposal) {
  const errors = validateReviewedProposal(proposal);
  if (errors.length) throw new Error(errors.join('\n'));
  return {
    entity: proposal.entity,
    id: proposal.id,
    operation: 'merge',
    changes: proposal.changes,
    reason: proposal.reason,
    sourceUrl: proposal.sourceUrl,
    license: proposal.license,
    contributionId: proposal.contributionId,
    auditTrail: {
      contributor: proposal.contributor,
      submittedAt: proposal.submittedAt,
      reviewer: proposal.reviewer,
      reviewedAt: proposal.reviewedAt,
      issueUrl: proposal.issueUrl,
      decision: 'accepted',
    },
  };
}

function cleanSection(value) {
  return value
    .replace(/^```(?:json)?\s*\n?/u, '')
    .replace(/\n?```\s*$/u, '')
    .trim();
}
