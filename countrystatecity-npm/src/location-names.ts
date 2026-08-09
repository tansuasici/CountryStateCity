export interface AdministrativeAreaLike {
  name: string;
  type?: string | null;
}

export interface AdministrativeAreaDisplayMetadata {
  name: string;
  type: string | null;
}

export interface AdministrativeAreaDisplay {
  /** Stable source name. Keep this value for exports and round-trips. */
  canonicalName: string;
  /** Concise name intended for menus and other user interfaces. */
  name: string;
  /** Human-readable administrative category, when one is known. */
  type: string | null;
  source: 'verified' | 'source' | 'inferred' | 'unknown';
}

const LOWERCASE_TYPE_WORDS = new Set(['and', 'of', 'under', 'with']);

// Ordered longest-first so a specific category wins over its shorter suffix.
const ADMINISTRATIVE_SUFFIXES = [
  'metropolitan collectivity with special status',
  'districts under republic administration',
  'special self-governing province',
  'special administrative region',
  'autonomous territorial unit',
  'overseas collectivity with special status',
  'decentralized regional entity',
  'free municipal consortium',
  'federal capital territory',
  'metropolitan administration',
  'special self-governing city',
  'special island authority',
  'metropolitan department',
  'administrative territory',
  'district municipality',
  'metropolitan district',
  'administrative region',
  'autonomous municipality',
  'autonomous community',
  'autonomous republic',
  'autonomous province',
  'autonomous district',
  'autonomous region',
  'metropolitan region',
  'metropolitan city',
  'special municipality',
  'rural municipality',
  'urban municipality',
  'city municipality',
  'unitary authority',
  'capital territory',
  'capital district',
  'federal territory',
  'federal district',
  'municipal district',
  'council area',
  'london borough',
  'local council',
  'two-tier county',
  'city with county rights',
  'union territory',
  'administrative atoll',
  'island council',
  'outlying area',
  'geographical unit',
  'regional unit',
  'administered area',
  'federal dependency',
  'municipality',
  'governorate',
  'prefecture',
  'department',
  'province',
  'district',
  'county',
  'region',
  'canton',
  'parish',
  'territory',
  'oblast',
  'krai',
  'republic',
  'state',
  'voivodship',
  'division',
  'popularate',
  'borough',
  'ward',
  'administration',
  'commune',
  'emirate',
] as const;

export function normalizeLocationName(value: string): string {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

export function formatAdministrativeType(value?: string | null): string | null {
  const normalized = value ? normalizeLocationName(value).toLocaleLowerCase('en-US') : '';
  if (!normalized) return null;

  return normalized
    .split(' ')
    .map((word, index) =>
      index > 0 && LOWERCASE_TYPE_WORDS.has(word)
        ? word
        : `${word.charAt(0).toLocaleUpperCase('en-US')}${word.slice(1)}`
    )
    .join(' ');
}

function inferAdministrativeSuffix(name: string): string | null {
  const lowerName = name.toLocaleLowerCase('en-US');
  return (
    ADMINISTRATIVE_SUFFIXES.find((suffix) => lowerName.endsWith(` ${suffix}`)) ?? null
  );
}

function removeMatchingTypeSuffix(name: string, type: string): string {
  const lowerName = name.toLocaleLowerCase('en-US');
  const lowerType = type.toLocaleLowerCase('en-US');
  const suffix = ` ${lowerType}`;
  if (!lowerName.endsWith(suffix)) return name;

  const shortened = name.slice(0, -suffix.length).trim();
  return shortened || name;
}

/**
 * Creates a UI label without mutating the canonical dataset.
 *
 * Verified metadata should be keyed by the record's stable subdivision code.
 * When it is unavailable, a category is inferred only from an explicit suffix;
 * generic labels such as "Administrative area" are never invented.
 */
export function getAdministrativeAreaDisplay(
  area: AdministrativeAreaLike,
  verified?: AdministrativeAreaDisplayMetadata
): AdministrativeAreaDisplay {
  const canonicalName = normalizeLocationName(area.name);
  const metadataName = verified?.name ? normalizeLocationName(verified.name) : null;
  const sourceType = verified?.type ?? area.type;
  let type = formatAdministrativeType(sourceType);
  let name = metadataName ?? canonicalName;
  let source: AdministrativeAreaDisplay['source'] = verified
    ? 'verified'
    : type
      ? 'source'
      : 'unknown';

  if (!type) {
    const inferred = inferAdministrativeSuffix(name);
    if (inferred) {
      type = formatAdministrativeType(inferred);
      source = 'inferred';
    }
  }

  if (type) name = removeMatchingTypeSuffix(name, type);

  return { canonicalName, name, type, source };
}
