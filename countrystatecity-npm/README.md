# @tansuasici/country-state-city

A lightweight, memory-efficient JavaScript library for accessing country, state, and city data worldwide with support for multiple data formats.

## Features

- 🌍 **250+ Countries** with ISO codes, phone codes, currencies, and more
- 🏛️ **5,000+ States** with country associations and coordinates  
- 🏙️ **150,000+ Cities** with state and country relationships
- 📊 **Multiple Formats**: JSON, CSV, XML, and YAML support
- 🎯 **TypeScript Support** with full type definitions
- ⚡ **Memory Efficient**: Lazy loading prevents build-time memory issues
- 🔍 **Advanced Search** capabilities
- 🌐 **ISO Standards** compliant (ISO 3166-1)

## Installation

```bash
npm install @tansuasici/country-state-city
```

## Quick Start

```javascript
const { CountryStateCity } = require('@tansuasici/country-state-city');
// or ES6
import { CountryStateCity } from '@tansuasici/country-state-city';

// Get all countries
const countries = CountryStateCity.getAllCountries();

// Get country by ISO code
const usa = CountryStateCity.getCountryByIso2('US');

// Get states by country
const states = CountryStateCity.getStatesByCountryId(usa.id);

// Get cities by state
const cities = CountryStateCity.getCitiesByStateId(states[0].id);

// Search functionality
const searchResults = CountryStateCity.searchCities('New York');
```

## Data Formats

Export data in multiple formats:

```javascript
// Get countries in different formats
const countriesJSON = CountryStateCity.getAllCountries('json', { pretty: true });
const countriesCSV = CountryStateCity.getAllCountries('csv');
const countriesXML = CountryStateCity.getAllCountries('xml');
const countriesYAML = CountryStateCity.getAllCountries('yaml');
```

## API Reference

### Country Methods

- `getAllCountries(format?, options?)` - Get all countries
- `getCountryById(id)` - Get country by ID
- `getCountryByIso2(iso2)` - Get country by ISO2 code
- `getCountryByIso3(iso3)` - Get country by ISO3 code
- `searchCountries(query)` - Search countries by name
- `getCountriesByRegion(region)` - Get countries by region
- `getCountriesBySubregion(subregion)` - Get countries by subregion

### State Methods

- `getAllStates(format?, options?)` - Get all states
- `getStateById(id)` - Get state by ID
- `getStatesByCountryId(countryId, format?, options?)` - Get states by country ID
- `getStatesByCountryCode(countryCode, format?, options?)` - Get states by country code
- `searchStates(query, countryId?)` - Search states

### City Methods

- `getAllCities(format?, options?)` - Get all cities
- `getCityById(id)` - Get city by ID
- `getCitiesByStateId(stateId, format?, options?)` - Get cities by state ID
- `getCitiesByCountryId(countryId, format?, options?)` - Get cities by country ID
- `searchCities(query, stateId?, countryId?)` - Search cities

### Utility Methods

- `getStats()` - Get statistics (count of countries, states, cities)
- `getAllRegions()` - Get all regions
- `getAllSubregions()` - Get all subregions
- `getAllTimezones()` - Get all timezones
- `getAllCurrencies()` - Get all currencies
- `exportData(dataType, format, options?)` - Export data in specific format

## TypeScript Support

```typescript
import { CountryStateCity, Country, State, City } from '@tansuasici/country-state-city';

const country: Country = CountryStateCity.getCountryByIso2('US');
const states: State[] = CountryStateCity.getStatesByCountryId(country.id);
const cities: City[] = CountryStateCity.getCitiesByStateId(states[0].id);
```

## License

MIT

## Author

Tansu Asici

## Links

- [GitHub Repository](https://github.com/tansuasici/country-state-city)
- [NPM Package](https://www.npmjs.com/package/@tansuasici/country-state-city)