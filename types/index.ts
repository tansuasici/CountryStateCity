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

export interface GeographicEntityClassification {
  entityType: EntityType;
  administrativeLevel: number | null;
  placeType: string;
  parentId: number;
  lifecycleStatus: LifecycleStatus;
  validFrom: string | null;
  validTo: string | null;
  classificationConfidence:
    'source-or-explicit-rule' | 'name-inferred' | 'country-default' | 'source-collection-default';
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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
