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
  translations: Record<string, string>;
  latitude: string;
  longitude: string;
  emoji: string;
  emojiU: string;
}

export interface State {
  id: number;
  name: string;
  countryId: number;
  countryCode: string;
  countryName: string;
  stateCode: string;
  type: string | null;
  latitude: string;
  longitude: string;
}

export interface City {
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

export interface Timezone {
  zoneName: string;
  gmtOffset: number;
  gmtOffsetName: string;
  abbreviation: string;
  tzName: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}