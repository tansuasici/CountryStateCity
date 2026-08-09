export type CountryTranslationLocale =
  | 'de'
  | 'en'
  | 'es'
  | 'fa'
  | 'fr'
  | 'hr'
  | 'it'
  | 'ja'
  | 'ko'
  | 'nl'
  | 'pt'
  | 'pt-BR'
  | 'tr'
  | 'zh-CN';
export type CountryTranslationAlias = 'br' | 'cn' | 'kr';

export interface Country {
  id: number;
  name: string;
  iso3: string;
  iso2: string;
  numericCode: string;
  phoneCode: string;
  capital: string;
  currency: string;
  currencyName: string;
  currencySymbol: string;
  tld: string;
  native: string;
  region: string;
  regionId?: number;
  subregion: string;
  subregionId?: number;
  nationality?: string;
  timezones: Timezone[];
  translations: Record<CountryTranslationLocale, string | null>;
  translationMissingLocales: CountryTranslationLocale[];
  translationSource: string;
  latitude: string | null;
  longitude: string | null;
  emoji: string;
  emojiU: string;
  codeAuthority: string;
  codeStatus: 'officially-assigned' | 'user-assigned';
  metadataSource: string;
  metadataVerifiedAt: string;
}

export type EntityType = 'administrative-area' | 'settlement';
export type LifecycleStatus = 'current' | 'historical' | 'review-required';
export type ClassificationConfidence =
  'source-or-explicit-rule' | 'name-inferred' | 'country-default' | 'source-collection-default';

export interface GeographicEntityClassification {
  entityType: EntityType;
  administrativeLevel: number | null;
  placeType: string;
  parentId: number;
  lifecycleStatus: LifecycleStatus;
  validFrom: string | null;
  validTo: string | null;
  classificationConfidence: ClassificationConfidence;
  entityLevelSource: string;
}

export type StateType =
  | 'autonomous province'
  | 'autonomous region'
  | 'canton'
  | 'capital district'
  | 'capital territory'
  | 'city'
  | 'county'
  | 'decentralized regional entity'
  | 'department'
  | 'dependency'
  | 'district'
  | 'european collectivity'
  | 'federal dependency'
  | 'free municipal consortium'
  | 'governorate'
  | 'metropolitan city'
  | 'metropolitan collectivity with special status'
  | 'metropolitan department'
  | 'metropolitan region'
  | 'municipality'
  | 'overseas collectivity'
  | 'overseas region'
  | 'overseas territory'
  | 'province'
  | 'region'
  | 'special administrative region'
  | 'special municipality'
  | 'state'
  | 'territory';

export interface State extends GeographicEntityClassification {
  id: number;
  name: string;
  countryId: number;
  countryCode: string;
  countryName: string;
  stateCode: string;
  type: StateType | null;
  typeStatus: 'available' | 'unknown';
  typeReasonCode: 'source-type-missing' | null;
  typeSource: string;
  latitude: string | null;
  longitude: string | null;
  coordinateType:
    'point-on-surface' | 'source-point-unspecified' | 'child-place-median' | 'unavailable';
  coordinateSource: string;
  coordinateVerifiedAt: string | null;
  coordinateValidation: string;
  coordinateStatus: 'verified' | 'derived' | 'exception' | 'review-required';
}

export interface City extends GeographicEntityClassification {
  id: number;
  name: string;
  stateId: number;
  stateCode: string;
  stateName: string;
  countryId: number;
  countryCode: string;
  countryName: string;
  latitude: string;
  longitude: string;
  wikiDataId: string;
}

export interface AdministrativeAreaQuery {
  countryCode?: string;
  level?: number;
  lifecycleStatus?: LifecycleStatus | 'all';
  sourceLayer?: 'state' | 'city' | 'all';
}

export interface SettlementQuery {
  countryCode?: string;
  stateId?: number;
  lifecycleStatus?: LifecycleStatus | 'all';
}

export type NearestEntityType = 'country' | 'state' | 'city' | 'district';
export type SpatialConfidence = 'high' | 'medium' | 'low';

export interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

export interface NearestCenterOptions {
  entityTypes?: NearestEntityType[];
  countryCode?: string;
  limitPerType?: number;
  maxDistanceKm?: number;
}

export interface NearestCenterMatch<T = Country | State | City | District> {
  entityType: NearestEntityType;
  entity: T;
  distanceKm: number;
  confidence: SpatialConfidence;
  confidenceBasis: 'center-distance';
}

export interface NearestCenterResult {
  query: CoordinatePoint;
  dataVersion: string;
  results: NearestCenterMatch[];
}

export interface GeoJsonGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface GeoJsonFeature<
  Properties extends Record<string, unknown> = Record<string, unknown>,
> {
  type: 'Feature';
  properties: Properties;
  geometry: GeoJsonGeometry | null;
}

export interface GeoJsonFeatureCollection<
  Properties extends Record<string, unknown> = Record<string, unknown>,
> {
  type: 'FeatureCollection';
  features: Array<GeoJsonFeature<Properties>>;
}

export interface PolygonLookupMatch<
  Properties extends Record<string, unknown> = Record<string, unknown>,
> {
  properties: Properties;
  boundary: boolean;
}

export interface PolygonLookupResult<
  Properties extends Record<string, unknown> = Record<string, unknown>,
> {
  query: CoordinatePoint;
  matches: Array<PolygonLookupMatch<Properties>>;
  confidence: 'exact' | 'boundary-or-overlap' | 'none';
  method: 'point-in-polygon';
}

export type DistrictCoordinateStatus = 'source' | 'corroborated' | 'corrected' | 'review-required';

export interface District {
  id: number;
  publicId: string;
  name: string;
  aliases: string[];
  entityType: 'district';
  countryId: number;
  countryCode: string;
  countryName: string;
  stateId: number;
  stateCode: string;
  stateName: string;
  latitude: string;
  longitude: string;
  coordinateStatus: DistrictCoordinateStatus;
  coordinateSource: string;
  coordinateValidation: string;
  geoNameId: number;
  wikiDataId: string | null;
  officialDistrictCode: null;
  officialDistrictCodeStatus: 'not-published-by-validation-source';
  sourceSnapshotDate: string;
}

export interface Timezone {
  zoneName: string;
  gmtOffset: number;
  gmtOffsetName: string;
  abbreviation: string;
  tzName: string;
  observedAt: string;
  offsetSource: string;
  zoneNameAuthority: 'IANA Time Zone Database';
  labelStatus: 'legacy-descriptive-not-authoritative';
}

export type CoverageStatus = 'available' | 'missing' | 'notApplicable' | 'unknown';

export interface CoverageClassification {
  status: CoverageStatus;
  reasonCode?: string;
}

export interface CoverageCount extends CoverageClassification {
  count: number;
}

export interface CountryMetadataCoverageGap extends CoverageClassification {
  field: 'capital' | 'native' | 'region' | 'subregion';
  reasonCode: string;
}

export interface CountryCoverage {
  countryId: number;
  countryCode: string;
  countryName: string;
  states: CoverageCount;
  cities: CoverageCount;
  metadataGaps: CountryMetadataCoverageGap[];
  coordinate: CoverageClassification;
}

export interface CoverageGap extends CoverageClassification {
  countryId: number;
  countryCode: string;
  countryName: string;
  scope: string;
  reasonCode: string;
  stateId?: number;
  stateCode?: string;
  stateName?: string;
}

export interface CoverageContractSummary {
  expectedCountryRecords: number;
  actualCountryRecords: number;
  countryRecordCoverageRate: number;
  classifiedGapCount: number;
  totalGapCount: number;
  gapClassificationRate: number;
  requiredGapClassificationRate: number;
  sentinelCoordinatePairs: number;
  maximumSentinelCoordinatePairs: number;
  passed: boolean;
}

export interface CoverageReport {
  schemaVersion: number;
  policyVersion: string;
  reviewedAt: string;
  sourceRelease: string;
  counts: {
    countries: number;
    states: number;
    cities: number;
  };
  summary: {
    countriesWithoutStates: number;
    countriesWithoutCities: number;
    statesWithoutCities: number;
    countryMetadataGaps: number;
    countryCoordinateGaps: number;
    gapStatusCounts: Record<'missing' | 'notApplicable' | 'unknown', number>;
    contract: CoverageContractSummary;
  };
  countryCoverage: CountryCoverage[];
  countryGaps: CoverageGap[];
  stateGaps: CoverageGap[];
}

export type DataFormat = 'json' | 'csv' | 'xml' | 'yaml';

export interface FormatOptions {
  pretty?: boolean;
  delimiter?: string;
  headers?: boolean;
}
