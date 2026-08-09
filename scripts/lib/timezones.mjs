export function applyTimezonePolicy(countries, policy) {
  validatePolicy(policy);
  let records = 0;
  let changes = 0;
  for (const country of countries) {
    for (const timezone of country.timezones ?? []) {
      assertIanaZone(timezone.zoneName);
      const observed = getTimezoneOffset(timezone.zoneName, policy.offsetSnapshot.observedAt);
      if (
        timezone.gmtOffset !== observed.gmtOffset ||
        timezone.gmtOffsetName !== observed.gmtOffsetName
      )
        changes += 1;
      Object.assign(timezone, observed, {
        offsetSource: policy.offsetSnapshot.source,
        zoneNameAuthority: policy.zoneNameAuthority,
        labelStatus: policy.legacyLabels.status,
      });
      records += 1;
    }
  }
  return { records, changes };
}

export function validateTimezonePolicy(countries, policy) {
  validatePolicy(policy);
  let records = 0;
  const zones = new Set();
  for (const country of countries) {
    for (const timezone of country.timezones ?? []) {
      assertIanaZone(timezone.zoneName);
      zones.add(timezone.zoneName);
      const expected = getTimezoneOffset(timezone.zoneName, policy.offsetSnapshot.observedAt);
      assert(
        timezone.gmtOffset === expected.gmtOffset,
        `Timezone offset drift: ${timezone.zoneName}`
      );
      assert(
        timezone.gmtOffsetName === expected.gmtOffsetName,
        `Timezone label drift: ${timezone.zoneName}`
      );
      assert(
        timezone.observedAt === policy.offsetSnapshot.observedAt,
        `Timezone observedAt drift: ${timezone.zoneName}`
      );
      assert(
        /^UTC[+-]\d{2}:\d{2}$/u.test(timezone.gmtOffsetName),
        `Invalid UTC format: ${timezone.zoneName}`
      );
      assert(
        timezone.offsetSource === policy.offsetSnapshot.source,
        `Timezone source drift: ${timezone.zoneName}`
      );
      assert(
        timezone.zoneNameAuthority === policy.zoneNameAuthority,
        `Timezone authority drift: ${timezone.zoneName}`
      );
      records += 1;
    }
  }
  assert(records === 428, `Unexpected timezone record count: ${records}`);
  return { records, uniqueZones: zones.size };
}

export function getTimezoneOffset(zoneName, at = new Date()) {
  assertIanaZone(zoneName);
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timezone observation instant: ${at}`);
  const instant = new Date(Math.floor(date.getTime() / 1000) * 1000);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US-u-nu-latn', {
      timeZone: zoneName,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const gmtOffset = Math.round((localAsUtc - instant.getTime()) / 1000);
  return {
    gmtOffset,
    gmtOffsetName: formatUtcOffset(gmtOffset),
    observedAt: instant.toISOString(),
  };
}

export function formatUtcOffset(offsetSeconds) {
  const sign = offsetSeconds < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(Math.round(offsetSeconds / 60));
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
}

function assertIanaZone(zoneName) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zoneName }).format(0);
  } catch {
    throw new Error(`Invalid IANA time zone: ${zoneName}`);
  }
}

function validatePolicy(policy) {
  assert(policy.schemaVersion === 1, 'Unsupported timezone policy');
  assert(policy.policyVersion === 'timezone-policy:v1', 'Unexpected timezone policy');
  assert(policy.authoritativeField === 'zoneName', 'zoneName must be authoritative');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
