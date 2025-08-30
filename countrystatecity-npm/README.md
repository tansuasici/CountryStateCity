# @tansuasici/country-state-city

[![npm version](https://badge.fury.io/js/@tansuasici%2Fcountry-state-city.svg)](https://www.npmjs.com/package/@tansuasici/country-state-city)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Complete world countries, states, and cities data in JSON, CSV, XML, and YAML formats. Optimized for both **Node.js** and **Browser** environments with automatic environment detection.

## 🚀 Features

- ✅ **250+ Countries** with complete ISO codes, currencies, timezones
- ✅ **5,000+ States/Provinces** with state codes and geo coordinates  
- ✅ **150,000+ Cities** with latitude/longitude data
- ✅ **Multiple Formats**: JSON, CSV, XML, YAML export support
- ✅ **TypeScript Support** with full type definitions
- ✅ **Optimized Builds**: Separate bundles for browser (30MB) and Node.js (16KB)
- ✅ **Tree-Shakeable**: Modern ES modules support
- ✅ **Zero Config**: Automatic environment detection (browser/Node.js)

## 📦 Installation

```bash
npm install @tansuasici/country-state-city
```

```bash
yarn add @tansuasici/country-state-city
```

```bash
pnpm add @tansuasici/country-state-city
```

## 🎯 Usage

### Basic Setup

```javascript
import { CountryStateCity } from '@tansuasici/country-state-city';

// Get all countries
const countries = CountryStateCity.getAllCountries();
console.log(countries.length); // 250+ countries

// Get specific country
const turkey = CountryStateCity.getCountryByIso2('TR');
console.log(turkey);
// {
//   id: 225,
//   name: 'Turkey',
//   iso2: 'TR',
//   iso3: 'TUR',
//   capital: 'Ankara',
//   currency: 'TRY',
//   ...
// }

// Get states of a country
const states = CountryStateCity.getStatesByCountryId(225);
console.log(states.length); // 81 provinces

// Get cities of a state
const istanbulCities = CountryStateCity.getCitiesByStateId(3981);
console.log(istanbulCities); // Cities in Istanbul province
```

### Environment-Specific Imports

The library automatically detects your environment (browser/Node.js). However, you can explicitly import the version you need:

```javascript
// Browser/Client-side (no fs dependencies)
import { CountryStateCity } from '@tansuasici/country-state-city/browser';

// Node.js/Server-side (uses fs for better performance)
import { CountryStateCity } from '@tansuasici/country-state-city/node';

// CommonJS
const { CountryStateCity } = require('@tansuasici/country-state-city');
```

## 📖 API Reference

### Country Methods

```typescript
// Get all countries
getAllCountries(format?: 'json' | 'csv' | 'xml' | 'yaml'): Country[] | string

// Get country by ID
getCountryById(id: number): Country | undefined

// Get country by ISO codes
getCountryByIso2(iso2: string): Country | undefined
getCountryByIso3(iso3: string): Country | undefined

// Search countries
searchCountries(query: string): Country[]

// Filter by region
getCountriesByRegion(region: string): Country[]
getCountriesBySubregion(subregion: string): Country[]
```

### State/Province Methods

```typescript
// Get all states
getAllStates(format?: DataFormat): State[] | string

// Get state by ID
getStateById(id: number): State | undefined

// Get states by country
getStatesByCountryId(countryId: number): State[]
getStatesByCountryCode(countryCode: string): State[]

// Search states
searchStates(query: string, countryId?: number): State[]
```

### City Methods

```typescript
// Get all cities (use with caution - large dataset)
getAllCities(format?: DataFormat): City[] | string

// Get city by ID  
getCityById(id: number): City | undefined

// Get cities by filters
getCitiesByStateId(stateId: number): City[]
getCitiesByCountryId(countryId: number): City[]

// Search cities
searchCities(query: string, stateId?: number, countryId?: number): City[]
```

### Utility Methods

```typescript
// Get statistics
getStats(): {
  countries: number;
  states: number;
  cities: number;
}

// Get unique values
getAllRegions(): string[]
getAllSubregions(): string[]
getAllTimezones(): string[]
getAllCurrencies(): Currency[]

// Export data
exportData(
  dataType: 'countries' | 'states' | 'cities',
  format: 'json' | 'csv' | 'xml' | 'yaml'
): string
```

## 🎨 Export Formats

Export data in multiple formats:

```javascript
// JSON (default)
const countriesJson = CountryStateCity.getAllCountries();

// CSV
const countriesCsv = CountryStateCity.getAllCountries('csv');
// name,iso2,iso3,capital,currency...
// "Turkey","TR","TUR","Ankara","TRY"...

// XML
const countriesXml = CountryStateCity.getAllCountries('xml');
// <?xml version="1.0" encoding="UTF-8"?>
// <countries>
//   <country>
//     <name>Turkey</name>
//     <iso2>TR</iso2>
//   </country>
// </countries>

// YAML
const countriesYaml = CountryStateCity.getAllCountries('yaml');
// - name: Turkey
//   iso2: TR
//   iso3: TUR
```

## 🔧 Framework Integration

### Next.js App Router

```typescript
// app/components/CountrySelector.tsx
'use client';
import { CountryStateCity } from '@tansuasici/country-state-city';

export function CountrySelector() {
  const countries = CountryStateCity.getAllCountries();
  
  return (
    <select>
      {countries.map(country => (
        <option key={country.id} value={country.id}>
          {country.emoji} {country.name}
        </option>
      ))}
    </select>
  );
}
```

### API Route Example

```typescript
// app/api/locations/countries/route.ts
import { CountryStateCity } from '@tansuasici/country-state-city';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  
  const countries = region 
    ? CountryStateCity.getCountriesByRegion(region)
    : CountryStateCity.getAllCountries();
    
  return Response.json(countries);
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { CountryStateCity } from '@tansuasici/country-state-city';

export function useCountryData(countryId?: number) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  
  useEffect(() => {
    if (countryId) {
      setStates(CountryStateCity.getStatesByCountryId(countryId));
      setCities(CountryStateCity.getCitiesByCountryId(countryId));
    }
  }, [countryId]);
  
  return { states, cities };
}
```

## ⚡ Performance Optimization

### Bundle Sizes

- **Browser Bundle**: ~30MB (includes all data)
- **Node.js Bundle**: ~16KB (loads data from files)

### Recommendations for Production

1. **Use API Endpoints**: Instead of loading all data client-side:

```typescript
// ❌ Avoid in client components
const allCities = CountryStateCity.getAllCities(); // 150,000+ records

// ✅ Better approach
const response = await fetch('/api/cities?country=TR&search=Istanbul');
const cities = await response.json();
```

2. **Implement Pagination**:

```typescript
// API route with pagination
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const cities = CountryStateCity.getCitiesByCountryId(225);
  const paginated = cities.slice((page - 1) * limit, page * limit);
  
  return Response.json({
    data: paginated,
    total: cities.length,
    page,
    limit
  });
}
```

3. **Use Code Splitting**:

```typescript
// Dynamic import
const loadCountryData = async () => {
  const { CountryStateCity } = await import('@tansuasici/country-state-city');
  return CountryStateCity.getAllCountries();
};
```

## 🎯 Common Issues & Solutions

### Issue: Module not found errors in Next.js

**Solution:** The library automatically detects the environment. If you face issues:

```javascript
// For Client Components
'use client';
import { CountryStateCity } from '@tansuasici/country-state-city/browser';

// For Server Components/API Routes
import { CountryStateCity } from '@tansuasici/country-state-city/node';
```

## 📊 Data Types

```typescript
interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  numericCode: string;
  phoneCode: string;
  capital: string;
  currency: string;
  currencyName: string;
  currencySymbol: string;
  tld: string;
  native: string;
  region: string;
  subregion: string;
  timezones: Timezone[];
  translations: Record<string, string>;
  latitude: string;
  longitude: string;
  emoji: string;
  emojiU: string;
}

interface State {
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

interface City {
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

interface Timezone {
  zoneName: string;
  gmtOffset: number;
  gmtOffsetName: string;
  abbreviation: string;
  tzName: string;
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/@tansuasici/country-state-city)
- [GitHub Repository](https://github.com/tansuasici/CountryStateCity)
- [Live Demo](https://countrystatecity.xyz)

## 💡 Support

If you find this package helpful, please consider:
- ⭐ Starring the GitHub repository
- 🐛 Reporting issues or bugs
- 💬 Providing feedback and suggestions
- 🤝 Contributing to the codebase