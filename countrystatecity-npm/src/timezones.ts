export interface TimezoneOffsetObservation {
  gmtOffset: number;
  gmtOffsetName: string;
  observedAt: string;
}

export function getTimezoneOffset(
  zoneName: string,
  at: Date | string | number = new Date()
): TimezoneOffsetObservation {
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

export function formatUtcOffset(offsetSeconds: number): string {
  const sign = offsetSeconds < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(Math.round(offsetSeconds / 60));
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
}

function assertIanaZone(zoneName: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zoneName }).format(0);
  } catch {
    throw new Error(`Invalid IANA time zone: ${zoneName}`);
  }
}
