# Country State City

<p align="center">
  <img src="public/logo.png" alt="Country State City Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Complete World Location Data — NPM Package, MCP Server & Web App</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tansuasici/country-state-city"><img src="https://img.shields.io/npm/v/@tansuasici/country-state-city?color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@tansuasici/country-state-city"><img src="https://img.shields.io/npm/dm/@tansuasici/country-state-city" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/Code-MIT-green.svg" alt="Code license: MIT">
  <img src="https://img.shields.io/badge/Data-ODbL--1.0-blue.svg" alt="Data license: ODbL 1.0">
</p>

---

## About

Country State City provides a versioned dataset of 250 countries and territories, 4,963 administrative areas, and 147,739 populated-place records as an NPM package, an MCP server for AI assistants, and an interactive web app.

## Features

- **Versioned location data** — 250 countries and territories, 4,963 administrative areas, and 147,739 places
- **Immutable public identity** — Namespaced `csc:country|state|city:{id}` values, source-ID collision gates, and version-pair migration downloads
- **Normalized display labels** — CLDR-style country names and separated administrative categories across subdivision and place records without changing canonical source names
- **Reproducible artifacts** — one canonical country/state/city source generates optimized data, browser shards, and package copies with byte-level CI drift checks
- **Multiple Formats** — JSON, CSV, XML, YAML output
- **MCP Server** — Connect to Claude Desktop and AI assistants
- **TypeScript** — Full type definitions included
- **Dual Entry Points** — Separate browser (ESM) and Node.js (CJS/ESM) builds
- **Search** — Filter countries, states, and cities by name
- **Explicit Türkiye districts** — 922 current districts with province parents, legacy aliases, open source IDs, and centre-coordinate review status
- **Optional boundary layers** — Versioned Türkiye admin-1/admin-2 GeoJSON downloads and a lazy overview TopoJSON export
- **Interactive Playground** — Test the API at the live demo

## Quick Start

```bash
npm install @tansuasici/country-state-city
```

```typescript
import { CountryStateCity, toPublicId } from '@tansuasici/country-state-city';

const countries = CountryStateCity.getAllCountries();
const turkey = CountryStateCity.getCountryByIso2('TR');
const states = CountryStateCity.getStatesByCountryId(225);
const cities = CountryStateCity.getCitiesByStateId(2170);
const districts = CountryStateCity.getDistrictsByCountryCode('TR');
const currentAdmin1 = CountryStateCity.getAdministrativeAreas({ level: 1 });
const settlements = CountryStateCity.getSettlements({ countryCode: 'TR' });
const stableCityId = toPublicId('city', cities[0].id);
const stableDistrictId = toPublicId('district', districts[0].id);

// Search
const results = CountryStateCity.searchLocations('İstanbull', {
  countryCode: 'TR',
  entityTypes: ['state'],
});

// Optional Türkiye boundary asset — not loaded with the core API
const { default: turkeyOverview } = await import(
  '@tansuasici/country-state-city/data/boundaries/tr/overview.json',
  { with: { type: 'json' } }
);

// Different formats
const csv = CountryStateCity.getAllCountries('csv');
const xml = CountryStateCity.getStatesByCountryId(231, 'xml');
const yaml = CountryStateCity.getCitiesByStateId(1416, 'yaml');
```

## Hosted REST and GraphQL API

The optional hosted API exposes the same canonical data snapshot under `/api/v1` and includes the immutable data version and source attribution in every response.

```bash
curl 'https://countrystatecity.tansuasici.com/api/v1/countries?limit=3&fields=id,name,iso2' \
  -H 'x-api-key: YOUR_API_KEY'
```

REST supports search, pagination, field selection, ETag caching, and per-key rate limits. Read-only GraphQL is available at `/api/graphql`; the OpenAPI contract and operating policy live at `/api/openapi.json` and `/api/policy.json`. See the [hosted API documentation](https://countrystatecity.tansuasici.com/docs/hosted-api) and [interactive playground](https://countrystatecity.tansuasici.com/docs/api-playground).

Offline nearest-centre lookup uses a lazy 3D KD-tree, handles the antimeridian, and returns distance, confidence, and the immutable data version:

```typescript
const nearest = CountryStateCity.nearestCenters(
  { latitude: 40.9811, longitude: 29.0651 },
  { entityTypes: ['country', 'state', 'city'], countryCode: 'TR' }
);

// Ranked multilingual/alias search with canonical identity and match reason
const matches = CountryStateCity.searchLocations('München', {
  countryCode: 'DE',
  entityTypes: ['city'],
});
```

For polygon containment, import a compatible GeoJSON boundary and use `PolygonLookupIndex`; current versioned coverage is Türkiye admin-1/admin-2. Nearest centres are not treated as proof of administrative containment.

## MCP Integration

Use location data directly in Claude Desktop and other MCP-compatible AI assistants.

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "country-state-city": {
      "command": "npx",
      "args": ["@tansuasici/country-state-city", "mcp"]
    }
  }
}
```

**11 Tools** — `search_countries`, `get_country`, `get_countries_by_region`, `get_states`, `search_states`, `get_cities`, `search_cities`, `get_stats`, `get_regions`, `get_timezones`, `get_currencies`

**6 Resources** — `://countries`, `://countries/{iso2}`, `://countries/{iso2}/states`, `://states/{id}/cities`, `://stats`, `://snapshot`

The exact production identity policy and version-pair migration index are published as package exports:

```javascript
import identityPolicy from '@tansuasici/country-state-city/data/identity-policy.json';
import migrationIndex from '@tansuasici/country-state-city/data/migrations/index.json';
import coveragePolicy from '@tansuasici/country-state-city/data/coverage-policy.json';
import coverageReport from '@tansuasici/country-state-city/data/coverage-report.json';
import stateCoordinatePolicy from '@tansuasici/country-state-city/data/geography/state-coordinate-policy.json';
import schemaNormalizationPolicy from '@tansuasici/country-state-city/data/schema-normalization-policy.json';
```

## API Reference

### Country Methods

```typescript
CountryStateCity.getAllCountries(format?: 'json' | 'csv' | 'xml' | 'yaml');
CountryStateCity.getCountryById(id: number);
CountryStateCity.getCountryByIso2(iso2: string);
CountryStateCity.getCountryByIso3(iso3: string);
CountryStateCity.searchCountries(query: string);
CountryStateCity.getCountriesByRegion(region: string);
CountryStateCity.getCountriesBySubregion(subregion: string);
CountryStateCity.getCountryTranslation(countryCode, locale);
CountryStateCity.getCoverageReport();
CountryStateCity.getCountryCoverage(countryCode: string);
```

### State Methods

```typescript
CountryStateCity.getAllStates(format?: 'json' | 'csv' | 'xml' | 'yaml');
CountryStateCity.getStateById(id: number);
CountryStateCity.getStatesByCountryId(countryId: number, format?: string);
CountryStateCity.getStatesByCountryCode(countryCode: string, format?: string);
CountryStateCity.searchStates(query: string, countryId?: number);
```

### City Methods

```typescript
CountryStateCity.getAllCities(format?: 'json' | 'csv' | 'xml' | 'yaml');
CountryStateCity.getCityById(id: number);
CountryStateCity.getCitiesByStateId(stateId: number, format?: string);
CountryStateCity.getCitiesByCountryId(countryId: number, format?: string);
CountryStateCity.searchCities(query: string, stateId?: number, countryId?: number);
```

### Canonical Entity Methods

The legacy state/city methods retain the imported collections. For comparable administrative levels and a clean settlement layer, use:

```typescript
CountryStateCity.getAdministrativeAreas({
  countryCode?: string,
  level?: number, // defaults to 1
  lifecycleStatus?: 'current' | 'historical' | 'review-required' | 'all',
  sourceLayer?: 'state' | 'city' | 'all', // defaults to state
});
CountryStateCity.getSettlements({
  countryCode?: string,
  stateId?: number,
  lifecycleStatus?: 'current' | 'historical' | 'review-required' | 'all',
});
```

Every state/city row has explicit entity, level, parent, place type, lifecycle, validity, confidence, and policy-source fields. The migration contract and country mappings are exported as `data/entity-level-policy.json`.

### District Methods

The district layer currently covers Türkiye. Legacy city records remain available for backward compatibility; use these methods when the administrative district grain is required.

```typescript
CountryStateCity.getAllDistricts(format?: 'json' | 'csv' | 'xml' | 'yaml');
CountryStateCity.getDistrictById(id: number);
CountryStateCity.getDistrictByPublicId(publicId: string);
CountryStateCity.getDistrictsByStateId(stateId: number, format?: string);
CountryStateCity.getDistrictsByCountryCode(countryCode: string);
CountryStateCity.searchDistricts(query: string, stateId?: number);
```

`csc:district:*` IDs belong to CountryStateCity. Türkiye's public validation source does not publish an authoritative district code, so the dataset keeps `officialDistrictCode: null` instead of inventing one.

### Utility Methods

```typescript
CountryStateCity.getStats();
CountryStateCity.getCoverageReport();
CountryStateCity.getCountryCoverage(countryCode: string);
CountryStateCity.getAllRegions();
CountryStateCity.getAllSubregions();
CountryStateCity.getAllTimezones();
CountryStateCity.getTimezoneOffset(zoneName, at?);
CountryStateCity.getAllCurrencies();
CountryStateCity.searchLocations(query, options?);
CountryStateCity.exportData(dataType, format, options?);
```

### TypeScript

```typescript
import {
  CountryStateCity,
  Country,
  State,
  City,
  DataFormat,
  FormatOptions,
} from '@tansuasici/country-state-city';
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build NPM package
npm run build:lib

# Build MCP server
npm run build:mcp

# Run tests
npm test

# Validate the pinned data source and patch manifests
npm run test:data-sync

# Validate immutable public IDs and versioned migration contracts
npm run test:identity

# Check whether a newer upstream release exists
npm run data:check-freshness

# Build and validate a reproducible candidate dataset (does not modify production data)
npm run data:sync -- --check --verify-reproducible

# Regenerate non-destructive subdivision display names and types
npm run data:display-metadata
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

- Source code is licensed under the [MIT License](LICENSE).
- The country, state, and city database is a derivative database made available under the [Open Database License (ODbL) v1.0](DATA_LICENSE.md).

The data is derived from [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database). Attribution is required. Machine-readable source and version details are in [data/provenance.json](data/provenance.json).

---

<p align="center">
  Made with ❤️ by <a href="https://tansuasici.com/">tansuasici</a>
</p>
