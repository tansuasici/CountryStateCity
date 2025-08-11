# @tansuasici/country-state-city

A comprehensive JavaScript/TypeScript library for accessing country, state, and city data worldwide. Features 250+ countries, 5,000+ states, and 150,000+ cities with full TypeScript support.


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

## Installation

```bash
npm install @tansuasici/country-state-city
```

## Quick Start

```javascript
// ES6 Modules (Recommended)
import { CountryStateCity } from '@tansuasici/country-state-city';

// CommonJS
const { CountryStateCity } = require('@tansuasici/country-state-city');

// Get all countries
const countries = CountryStateCity.getAllCountries();
console.log(countries.length); // 250+ countries

// Get country by ISO code
const turkey = CountryStateCity.getCountryByIso2('TR');
console.log(turkey.name); // Turkey

// Get states of a country
const states = CountryStateCity.getStatesByCountryId(turkey.id);
console.log(states.length); // 81 states

// Get cities of a state
const istanbulState = states.find(s => s.name === 'Istanbul');
const cities = CountryStateCity.getCitiesByStateId(istanbulState.id);
console.log(cities.length); // Cities in Istanbul
```

## Import Methods

```javascript
// Method 1: Named Import (Recommended)
import { CountryStateCity } from '@tansuasici/country-state-city';

// Method 2: Default Import
import CountryStateCity from '@tansuasici/country-state-city';

// Method 3: CommonJS
const { CountryStateCity } = require('@tansuasici/country-state-city');

// Method 4: Dynamic Import (for Next.js/async contexts)
const { CountryStateCity } = await import('@tansuasici/country-state-city');
```

## Usage Examples

### Basic Usage

```javascript
import { CountryStateCity } from '@tansuasici/country-state-city';

// Get all countries
const countries = CountryStateCity.getAllCountries();
// Returns: Array of 250+ country objects

// Get specific country by ISO2 code
const usa = CountryStateCity.getCountryByIso2('US');
// Returns: { id: 233, name: 'United States', iso2: 'US', ... }

// Get states of a country
const states = CountryStateCity.getStatesByCountryId(usa.id);
// Returns: Array of states in USA

// Get cities of a state
const californiaState = states.find(s => s.name === 'California');
const cities = CountryStateCity.getCitiesByStateId(californiaState.id);
// Returns: Array of cities in California

// Search cities globally
const results = CountryStateCity.searchCities('New York');
// Returns: All cities matching 'New York'

// Search with filters
const turkishCities = CountryStateCity.searchCities('Istanbul', null, 225);
// Returns: Cities matching 'Istanbul' in Turkey (countryId: 225)
```

### Next.js API Route Example

```javascript
// app/api/location/route.js
import { NextResponse } from 'next/server';
import { CountryStateCity } from '@tansuasici/country-state-city';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  
  switch(type) {
    case 'countries':
      return NextResponse.json(CountryStateCity.getAllCountries());
      
    case 'states':
      if (!id) return NextResponse.json({ error: 'Country ID required' }, { status: 400 });
      return NextResponse.json(CountryStateCity.getStatesByCountryId(parseInt(id)));
      
    case 'cities':
      if (!id) return NextResponse.json({ error: 'State ID required' }, { status: 400 });
      return NextResponse.json(CountryStateCity.getCitiesByStateId(parseInt(id)));
      
    default:
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  }
}
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import { CountryStateCity } from '@tansuasici/country-state-city';

function LocationSelector() {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  
  useEffect(() => {
    // Load countries on mount
    const allCountries = CountryStateCity.getAllCountries();
    setCountries(allCountries);
  }, []);
  
  const handleCountryChange = (countryId) => {
    const country = countries.find(c => c.id === parseInt(countryId));
    setSelectedCountry(country);
    
    // Load states for selected country
    const countryStates = CountryStateCity.getStatesByCountryId(country.id);
    setStates(countryStates);
    setCities([]); // Reset cities
  };
  
  const handleStateChange = (stateId) => {
    const state = states.find(s => s.id === parseInt(stateId));
    setSelectedState(state);
    
    // Load cities for selected state
    const stateCities = CountryStateCity.getCitiesByStateId(state.id);
    setCities(stateCities);
  };
  
  return (
    <div>
      <select onChange={(e) => handleCountryChange(e.target.value)}>
        <option value="">Select Country</option>
        {countries.map(country => (
          <option key={country.id} value={country.id}>
            {country.emoji} {country.name}
          </option>
        ))}
      </select>
      
      {states.length > 0 && (
        <select onChange={(e) => handleStateChange(e.target.value)}>
          <option value="">Select State</option>
          {states.map(state => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </select>
      )}
      
      {cities.length > 0 && (
        <select>
          <option value="">Select City</option>
          {cities.map(city => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

## Common Issues & Solutions

### Issue: Getting empty data (countries.length = 0)

**Cause:** Incorrect import or calling methods incorrectly.

**Solution:**
```javascript
// ✅ CORRECT - Using static methods
import { CountryStateCity } from '@tansuasici/country-state-city';
const countries = CountryStateCity.getAllCountries();

// ❌ WRONG - Don't instantiate with 'new'
const csc = new CountryStateCity(); // Don't do this!
const countries = csc.getAllCountries(); // Won't work
```

### Issue: Module not found errors

**Solution:** Ensure proper installation and import:
```bash
# Install the package
npm install @tansuasici/country-state-city

# Clear npm cache if needed
npm cache clean --force
npm install
```

### Issue: TypeScript type errors

**Solution:** Import types explicitly:
```typescript
import { CountryStateCity, Country, State, City } from '@tansuasici/country-state-city';

const country: Country = CountryStateCity.getCountryByIso2('US');
const states: State[] = CountryStateCity.getStatesByCountryId(country.id);
const cities: City[] = CountryStateCity.getCitiesByStateId(states[0].id);
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

## Method Reference

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

### Type Definitions

```typescript
// Types available in the package
interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  numeric_code: string;
  phone_code: string;
  capital: string;
  currency: string;
  currency_name: string;
  currency_symbol: string;
  tld: string;
  native: string;
  region: string;
  region_id: string;
  subregion: string;
  subregion_id: string;
  nationality: string;
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
  country_id: number;
  country_code: string;
  country_name: string;
  state_code: string;
  type: string | null;
  latitude: string;
  longitude: string;
}

interface City {
  id: number;
  name: string;
  state_id: number;
  state_code: string;
  state_name: string;
  country_id: number;
  country_code: string;
  country_name: string;
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

### TypeScript Usage Examples

```typescript
import CountryStateCity from '@tansuasici/country-state-city';
import type { Country, State, City } from '@tansuasici/country-state-city';

// Create typed instance
const csc = new CountryStateCity();

// Load data with proper typing
async function loadLocationData(): Promise<void> {
  await csc.loadData();
}

// Get typed countries
function getAllCountries(): Country[] {
  return csc.getAllCountries();
}

// Get country with type safety
function getCountryByCode(iso2: string): Country | undefined {
  return csc.getCountryByIso2(iso2);
}

// Get states with proper typing
function getStatesByCountry(countryId: number): State[] {
  return csc.getStatesByCountryId(countryId);
}

// Get cities with type safety
function getCitiesByState(stateId: number): City[] {
  return csc.getCitiesByStateId(stateId);
}

// Search with typed results
function searchCities(query: string): City[] {
  return csc.searchCities(query);
}
```

### Next.js with TypeScript

```typescript
// app/api/countries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { Country, State, City } from '@tansuasici/country-state-city';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Country[] | State[] | City[]>>> {
  try {
    // Dynamic import with TypeScript
    const { default: CountryStateCity } = await import('@tansuasici/country-state-city');
    
    // Create typed instance
    const csc = new CountryStateCity();
    
    // Load data
    await csc.loadData();
    
    // Get search params
    const searchParams = request.nextUrl.searchParams;
    const countryCode = searchParams.get('country');
    const stateId = searchParams.get('state');
    const search = searchParams.get('search');
    
    // Handle different query types
    if (search) {
      const cities: City[] = csc.searchCities(search);
      return NextResponse.json({
        success: true,
        data: cities,
        total: cities.length
      });
    }
    
    if (countryCode) {
      const country: Country | undefined = csc.getCountryByIso2(countryCode);
      if (!country) {
        return NextResponse.json({
          success: false,
          error: 'Country not found'
        }, { status: 404 });
      }
      
      const states: State[] = csc.getStatesByCountryId(country.id);
      return NextResponse.json({
        success: true,
        data: states,
        total: states.length
      });
    }
    
    if (stateId) {
      const cities: City[] = csc.getCitiesByStateId(parseInt(stateId));
      return NextResponse.json({
        success: true,
        data: cities,
        total: cities.length
      });
    }
    
    // Return all countries by default
    const countries: Country[] = csc.getAllCountries();
    return NextResponse.json({
      success: true,
      data: countries,
      total: countries.length
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### React Component with TypeScript

```typescript
// components/LocationSelector.tsx
import React, { useState, useEffect } from 'react';
import type { Country, State, City } from '@tansuasici/country-state-city';

interface LocationSelectorProps {
  onSelect: (country: Country, state: State | null, city: City | null) => void;
}

export default function LocationSelector({ onSelect }: LocationSelectorProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  
  useEffect(() => {
    loadCountries();
  }, []);
  
  async function loadCountries(): Promise<void> {
    try {
      const response = await fetch('/api/countries');
      const data: ApiResponse<Country[]> = await response.json();
      if (data.success && data.data) {
        setCountries(data.data);
      }
    } catch (error) {
      console.error('Failed to load countries:', error);
    }
  }
  
  async function handleCountryChange(countryId: string): Promise<void> {
    const country = countries.find(c => c.id === parseInt(countryId));
    if (!country) return;
    
    setSelectedCountry(country);
    setSelectedState(null);
    setSelectedCity(null);
    
    // Load states for selected country
    try {
      const response = await fetch(`/api/countries?country=${country.iso2}`);
      const data: ApiResponse<State[]> = await response.json();
      if (data.success && data.data) {
        setStates(data.data);
      }
    } catch (error) {
      console.error('Failed to load states:', error);
    }
  }
  
  async function handleStateChange(stateId: string): Promise<void> {
    const state = states.find(s => s.id === parseInt(stateId));
    if (!state) return;
    
    setSelectedState(state);
    setSelectedCity(null);
    
    // Load cities for selected state
    try {
      const response = await fetch(`/api/countries?state=${state.id}`);
      const data: ApiResponse<City[]> = await response.json();
      if (data.success && data.data) {
        setCities(data.data);
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
  }
  
  function handleCityChange(cityId: string): void {
    const city = cities.find(c => c.id === parseInt(cityId));
    if (!city) return;
    
    setSelectedCity(city);
    if (selectedCountry) {
      onSelect(selectedCountry, selectedState, city);
    }
  }
  
  return (
    <div className="space-y-4">
      <select 
        onChange={(e) => handleCountryChange(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option value="">Select Country</option>
        {countries.map((country) => (
          <option key={country.id} value={country.id}>
            {country.emoji} {country.name}
          </option>
        ))}
      </select>
      
      {states.length > 0 && (
        <select 
          onChange={(e) => handleStateChange(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select State</option>
          {states.map((state) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </select>
      )}
      
      {cities.length > 0 && (
        <select 
          onChange={(e) => handleCityChange(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select City</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

## License

MIT

## Author

Tansu Asici

