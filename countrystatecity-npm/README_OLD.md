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

## 🎯 Quick Start

### Browser / Client-Side

The library automatically uses the browser-optimized bundle in client environments:

```javascript
import { CountryStateCity } from '@tansuasici/country-state-city';

// Get all countries
const countries = CountryStateCity.getAllCountries();

// Get country by ISO code
const turkey = CountryStateCity.getCountryByIso2('TR');

// Get states by country
const states = CountryStateCity.getStatesByCountryId(225); // Turkey's ID

// Search cities
const istanbulCities = CountryStateCity.searchCities('Istanbul');
```

### Node.js / Server-Side

The library automatically uses the Node.js version with file system support:

```javascript
const { CountryStateCity } = require('@tansuasici/country-state-city');
// or
import { CountryStateCity } from '@tansuasici/country-state-city';

// Same API as browser version
const countries = CountryStateCity.getAllCountries();
```

### Explicit Environment Import

If you need to force a specific build:

```javascript
// Force browser version
import { CountryStateCity } from '@tansuasici/country-state-city/browser';

// Force Node.js version
import { CountryStateCity } from '@tansuasici/country-state-city/node';
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

