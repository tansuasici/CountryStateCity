# Country State City

A modern web application and API platform built with Next.js 15 and TypeScript, providing comprehensive location data for 250+ countries, 5,000+ states, and 150,000+ cities worldwide.

![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![HeroUI](https://img.shields.io/badge/HeroUI-Latest-purple?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

## 🌟 Features

- **🌍 Complete Global Coverage**: 250+ countries, 5,000+ states, 150,000+ cities
- **📊 Multiple Data Formats**: JSON, CSV, XML, and YAML support
- **🎨 Modern UI**: Built with HeroUI components and Tailwind CSS
- **⚡ Fast Performance**: Optimized API responses under 100ms
- **🔍 Advanced Search**: Powerful filtering and search capabilities
- **📱 Responsive Design**: Mobile-first approach with dark mode support
- **🔧 RESTful API**: Comprehensive API endpoints
- **📦 NPM Package**: Easy integration with your projects
- **🛡️ ISO Standards**: ISO 3166-1 compliant country codes

## 📋 Prerequisites

- Node.js 18.0 or later
- npm or yarn package manager


## 📚 API Documentation


### Sample API Endpoints

```bash
# Get all countries
GET /api/countries

# Get states by country ID
GET /api/countries/231/states

# Get cities by state ID  
GET /api/states/1416/cities

# Search with filters
GET /api/countries?search=united&limit=10
```

### Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": 231,
      "name": "United States",
      "iso2": "US",
      "iso3": "USA",
      "capital": "Washington",
      "currency": "USD",
      "emoji": "🇺🇸"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

## 📦 NPM Package

Install our NPM package for easy integration:

```bash
npm install @tansuasici/country-state-city
```

### Basic Usage

```javascript
import { CountryStateCity } from '@tansuasici/country-state-city';

// Get all countries
const countries = CountryStateCity.getAllCountries();

// Get country by ID
const country = CountryStateCity.getCountryById(231);

// Get country by ISO code
const usa = CountryStateCity.getCountryByIso2('US');
const turkey = CountryStateCity.getCountryByIso3('TUR');

// Get states by country
const states = CountryStateCity.getStatesByCountryId(231);

// Get cities by state
const cities = CountryStateCity.getCitiesByStateId(1416);

// Search functionality
const searchResults = CountryStateCity.searchCountries('United');
const stateResults = CountryStateCity.searchStates('California', 231);
const cityResults = CountryStateCity.searchCities('New York', null, 231);
```

### Export Data in Different Formats

```javascript
import { CountryStateCity } from '@tansuasici/country-state-city';

// Export as JSON (default)
const countriesJson = CountryStateCity.getAllCountries();

// Export as CSV
const countriesCsv = CountryStateCity.getAllCountries('csv');

// Export as XML
const statesXml = CountryStateCity.getStatesByCountryId(231, 'xml');

// Export as YAML
const citiesYaml = CountryStateCity.getCitiesByStateId(1416, 'yaml');
```

### All Available Methods

#### Country Methods

```javascript
// Get all countries
CountryStateCity.getAllCountries(format?: 'json' | 'csv' | 'xml' | 'yaml');

// Get country by ID
CountryStateCity.getCountryById(id: number);

// Get country by ISO2 code (e.g., 'US')
CountryStateCity.getCountryByIso2(iso2: string);

// Get country by ISO3 code (e.g., 'USA')
CountryStateCity.getCountryByIso3(iso3: string);

// Search countries by name
CountryStateCity.searchCountries(query: string);

// Get countries by region (e.g., 'Asia', 'Europe')
CountryStateCity.getCountriesByRegion(region: string);

// Get countries by subregion (e.g., 'Western Europe')
CountryStateCity.getCountriesBySubregion(subregion: string);
```

#### State Methods

```javascript
// Get all states
CountryStateCity.getAllStates(format?: 'json' | 'csv' | 'xml' | 'yaml');

// Get state by ID
CountryStateCity.getStateById(id: number);

// Get states by country ID
CountryStateCity.getStatesByCountryId(countryId: number, format?: string);

// Get states by country code
CountryStateCity.getStatesByCountryCode(countryCode: string, format?: string);

// Search states
CountryStateCity.searchStates(query: string, countryId?: number);
```

#### City Methods

```javascript
// Get all cities (use with caution - large dataset)
CountryStateCity.getAllCities(format?: 'json' | 'csv' | 'xml' | 'yaml');

// Get city by ID
CountryStateCity.getCityById(id: number);

// Get cities by state ID
CountryStateCity.getCitiesByStateId(stateId: number, format?: string);

// Get cities by country ID
CountryStateCity.getCitiesByCountryId(countryId: number, format?: string);

// Search cities
CountryStateCity.searchCities(query: string, stateId?: number, countryId?: number);
```

#### Utility Methods

```javascript
// Get statistics
CountryStateCity.getStats();
// Returns: { countries: 250, states: 5000, cities: 150000 }

// Get all regions
CountryStateCity.getAllRegions();
// Returns: ['Africa', 'Americas', 'Antarctica', 'Asia', 'Europe', 'Oceania']

// Get all subregions
CountryStateCity.getAllSubregions();
// Returns: ['Caribbean', 'Central America', 'Central Asia', ...]

// Get all timezones
CountryStateCity.getAllTimezones();
// Returns: ['Africa/Abidjan', 'Africa/Accra', ...]

// Get all currencies
CountryStateCity.getAllCurrencies();
// Returns: [{ code: 'USD', name: 'US Dollar', symbol: '$' }, ...]

// Export data in specific format
CountryStateCity.exportData(
  dataType: 'countries' | 'states' | 'cities',
  format: 'json' | 'csv' | 'xml' | 'yaml',
  options?: FormatOptions
);
```

### TypeScript Support

The package includes full TypeScript support with type definitions:

```typescript
import { 
  CountryStateCity,
  Country,
  State,
  City,
  DataFormat,
  FormatOptions
} from '@tansuasici/country-state-city';

// Type-safe operations
const country: Country | undefined = CountryStateCity.getCountryById(231);
const states: State[] = CountryStateCity.getStatesByCountryId(231) as State[];
const cities: City[] = CountryStateCity.getCitiesByStateId(1416) as City[];
```


## 🧪 Testing

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```


## ⚖️ License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Data sources and contributors
- Open source community
- HeroUI team for the excellent component library

---

<div align="center">
  <strong>Made with ❤️ for developers worldwide</strong>
</div>