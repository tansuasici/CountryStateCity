# @tansuasici/country-state-city

Complete world countries, states, and cities data in JSON, CSV, XML, and YAML formats.

## Installation

```bash
npm install @tansuasici/country-state-city
```

## Usage

### Browser / Client-Side (Next.js, React, Vue, etc.)

The library automatically uses the browser-optimized bundle when imported in client-side environments:

```javascript
import { CountryStateCity } from '@tansuasici/country-state-city';

// Get all countries
const countries = CountryStateCity.getAllCountries();

// Get states by country ID
const states = CountryStateCity.getStatesByCountryId(225);

// Get cities by state ID
const cities = CountryStateCity.getCitiesByStateId(4121);

// Search functionality
const turkeyCountries = CountryStateCity.searchCountries('Turkey');
const istanbulCities = CountryStateCity.searchCities('Istanbul');
```

### Node.js / Server-Side

The library automatically uses the Node.js version with file system support on the server:

```javascript
const { CountryStateCity } = require('@tansuasici/country-state-city');
// or
import { CountryStateCity } from '@tansuasici/country-state-city';

// Same API as browser version
const countries = CountryStateCity.getAllCountries();
```

### Explicit Import (Optional)

If you need to explicitly specify which version to use:

```javascript
// Force browser version
import { CountryStateCity } from '@tansuasici/country-state-city/browser';

// Force Node.js version
import { CountryStateCity } from '@tansuasici/country-state-city/node';
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

- `getStats()` - Get statistics (total countries, states, cities)
- `getAllRegions()` - Get all unique regions
- `getAllSubregions()` - Get all unique subregions
- `getAllTimezones()` - Get all unique timezones
- `getAllCurrencies()` - Get all unique currencies
- `exportData(dataType, format, options?)` - Export data in different formats

## Data Formats

The library supports multiple export formats:

```javascript
// JSON (default)
const countriesJson = CountryStateCity.getAllCountries();

// CSV
const countriesCsv = CountryStateCity.getAllCountries('csv');

// XML
const countriesXml = CountryStateCity.getAllCountries('xml');

// YAML
const countriesYaml = CountryStateCity.getAllCountries('yaml');
```

## Bundle Sizes

- **Browser Bundle**: ~30MB (includes all data)
- **Node.js Bundle**: ~16KB (loads data from files)

For production use in browsers, consider:
1. Loading data on-demand via API endpoints
2. Using code splitting to load the library only when needed
3. Implementing pagination for large datasets

## TypeScript Support

The library includes TypeScript definitions:

```typescript
import { Country, State, City } from '@tansuasici/country-state-city';

const country: Country = CountryStateCity.getCountryById(225);
const states: State[] = CountryStateCity.getStatesByCountryId(225);
const cities: City[] = CountryStateCity.getCitiesByStateId(4121);
```

## Framework Integration

### Next.js App Router

```javascript
// Client Component
'use client';
import { CountryStateCity } from '@tansuasici/country-state-city';

export function CountrySelector() {
  const countries = CountryStateCity.getAllCountries();
  // ...
}
```

### Next.js API Routes

```javascript
// app/api/countries/route.js
import { CountryStateCity } from '@tansuasici/country-state-city';

export async function GET() {
  const countries = CountryStateCity.getAllCountries();
  return Response.json(countries);
}
```

## License

MIT

## Author

Tansu Asici

## Repository

[GitHub](https://github.com/tansuasici/CountryStateCity)