import { Country, State, City } from '@/types';
import { DataFormatter } from '../countrystatecity-npm/src/formatters';

// Single source of truth for formatting: delegate to the package's
// DataFormatter so the playground shows exactly what npm consumers get,
// instead of a duplicate hand-rolled implementation.

export const toCSV = <T extends Record<string, any>>(data: T[]): string =>
  DataFormatter.toCSV(data);

export const toXML = <T extends Record<string, any>>(
  data: T[],
  rootElement = 'data',
  itemElement = 'item'
): string => DataFormatter.toXML(data, rootElement, itemElement);

export const toYAML = <T extends Record<string, any>>(data: T[]): string =>
  DataFormatter.toYAML(data);

export const formatCountries = {
  csv: (countries: Country[]) => DataFormatter.toCSV(countries),
  xml: (countries: Country[]) => DataFormatter.toXML(countries, 'countries', 'country'),
  yaml: (countries: Country[]) => DataFormatter.toYAML(countries),
  json: (countries: Country[]) => JSON.stringify(countries, null, 2),
};

export const formatStates = {
  csv: (states: State[]) => DataFormatter.toCSV(states),
  xml: (states: State[]) => DataFormatter.toXML(states, 'states', 'state'),
  yaml: (states: State[]) => DataFormatter.toYAML(states),
  json: (states: State[]) => JSON.stringify(states, null, 2),
};

export const formatCities = {
  csv: (cities: City[]) => DataFormatter.toCSV(cities),
  xml: (cities: City[]) => DataFormatter.toXML(cities, 'cities', 'city'),
  yaml: (cities: City[]) => DataFormatter.toYAML(cities),
  json: (cities: City[]) => JSON.stringify(cities, null, 2),
};
