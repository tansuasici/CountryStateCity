import metadata from '@/data/location-display.json';
import type { City, Country, State } from '@/types';
import {
  getAdministrativeAreaDisplay,
  normalizeLocationName,
  type AdministrativeAreaDisplay,
  type AdministrativeAreaDisplayMetadata,
} from '@/countrystatecity-npm/src/location-names';

interface LocationDisplayMetadata {
  countries: Record<string, { name: string }>;
  subdivisions: Record<string, AdministrativeAreaDisplayMetadata>;
}

const locationMetadata = metadata as LocationDisplayMetadata;
const subdivisionMetadata = locationMetadata.subdivisions;

let englishRegionNames: Intl.DisplayNames | null | undefined;

export function getCountryDisplayName(country: Country): string {
  const verifiedName = locationMetadata.countries[country.iso2]?.name;
  if (verifiedName) return normalizeLocationName(verifiedName);

  if (englishRegionNames === undefined) {
    try {
      englishRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      englishRegionNames = null;
    }
  }

  return normalizeLocationName(englishRegionNames?.of(country.iso2) ?? country.name);
}

export function getStateDisplay(state: State): AdministrativeAreaDisplay {
  const key = `${state.countryCode.toLocaleUpperCase('en-US')}-${state.stateCode}`;
  return getAdministrativeAreaDisplay(state, subdivisionMetadata[key]);
}

export function getCityDisplayName(city: City): string {
  return getPlaceDisplay(city).name;
}

export function getPlaceDisplay(city: City): AdministrativeAreaDisplay {
  return getAdministrativeAreaDisplay(city);
}
