import type { City, GeographicEntityClassification, State } from './types';

const ADMINISTRATIVE_PLACE_TYPES: Array<[string, string]> = [
  ['shahrestān', 'shahrestan'],
  ['administrative area', 'administrative-area'],
  ['municipality', 'municipality'],
  ['prefecture', 'prefecture'],
  ['province', 'province'],
  ['district', 'district'],
  ['county', 'county'],
  ['region', 'region'],
  ['department', 'department'],
  ['governorate', 'governorate'],
  ['canton', 'canton'],
  ['territory', 'territory'],
];

export function deriveCityEntityClassification(
  city: Pick<City, 'name' | 'stateId'>,
  state: State | undefined
): GeographicEntityClassification {
  const inferredType = inferSuffixType(city.name);
  const isAdministrativeArea = inferredType !== null;
  return {
    entityType: isAdministrativeArea ? 'administrative-area' : 'settlement',
    administrativeLevel: isAdministrativeArea ? (state?.administrativeLevel ?? 1) + 1 : null,
    placeType: inferredType ?? 'settlement',
    parentId: city.stateId,
    lifecycleStatus: state?.lifecycleStatus ?? 'review-required',
    validFrom: null,
    validTo: state?.lifecycleStatus === 'historical' ? state.validTo : null,
    classificationConfidence: isAdministrativeArea ? 'name-inferred' : 'source-collection-default',
    entityLevelSource: 'entity-level-policy:v1',
  };
}

function inferSuffixType(name: string): string | null {
  const normalized = name.normalize('NFC').trim().toLocaleLowerCase('en');
  for (const [suffix, type] of ADMINISTRATIVE_PLACE_TYPES) {
    if (normalized.endsWith(suffix)) return type;
  }
  return null;
}
