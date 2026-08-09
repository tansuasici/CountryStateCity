# @tansuasici/country-state-city

[![npm version](https://img.shields.io/npm/v/@tansuasici/country-state-city)](https://www.npmjs.com/package/@tansuasici/country-state-city)
[![npm downloads](https://img.shields.io/npm/dm/@tansuasici/country-state-city)](https://www.npmjs.com/package/@tansuasici/country-state-city)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](https://github.com/tansuasici/CountryStateCity/blob/main/LICENSE)
[![Data: ODbL 1.0](https://img.shields.io/badge/Data-ODbL--1.0-blue.svg)](https://github.com/tansuasici/CountryStateCity/blob/main/DATA_LICENSE.md)

Versioned world location data for Node.js and browsers, with TypeScript types, multiple export formats, ranked search, nearest-centre lookup, timezone helpers, Türkiye districts, optional boundaries, and an MCP server.

## Dataset

| Layer                     | Records | Notes                                                              |
| ------------------------- | ------: | ------------------------------------------------------------------ |
| Countries and territories |     250 | ISO metadata, translations, timezones, currencies                  |
| Administrative areas      |   4,963 | Explicit level, type, lifecycle, parent, and coordinate provenance |
| Populated places          | 147,739 | Compact distribution with lazy full-object reconstruction          |
| Türkiye districts         |     922 | Province parents, aliases, stable IDs, coordinate review status    |

The package publishes machine-readable provenance, coverage, quality, normalization, identity, and migration contracts alongside the data.

## Installation

```bash
npm install @tansuasici/country-state-city
```

```bash
pnpm add @tansuasici/country-state-city
```

```bash
yarn add @tansuasici/country-state-city
```

```bash
bun add @tansuasici/country-state-city
```

## Quick start

```typescript
import { CountryStateCity, toPublicId } from '@tansuasici/country-state-city';

const turkey = CountryStateCity.getCountryByIso2('TR');
const provinces = CountryStateCity.getStatesByCountryId(225);
const istanbulPlaces = CountryStateCity.getCitiesByStateId(2170);
const districts = CountryStateCity.getDistrictsByStateId(2170);

const stableCountryId = turkey ? toPublicId('country', turkey.id) : null;
```

All collection methods return objects by default and can serialize directly to JSON, CSV, XML, or YAML:

```typescript
const csv = CountryStateCity.getAllCountries('csv');
const xml = CountryStateCity.getStatesByCountryCode('TR', 'xml');
const yaml = CountryStateCity.getDistrictsByStateId(2170, 'yaml');
```

## Entry points

The default export resolves to the appropriate Node.js or browser build. Explicit entry points are also available:

```typescript
// Browser/client code
import { CountryStateCity } from '@tansuasici/country-state-city/browser';

// Node.js/server code
import { CountryStateCity } from '@tansuasici/country-state-city/node';

// CommonJS
const { CountryStateCity } = require('@tansuasici/country-state-city');
```

The browser entry is approximately 35.5 kB before its separately cached data assets. The complete v3 package is approximately 3.81 MB packed and 23.29 MB unpacked. City data is reconstructed lazily from one compact asset rather than duplicated inside every runtime bundle.

## Core API

### Countries

```typescript
CountryStateCity.getAllCountries(format?, options?);
CountryStateCity.getCountryById(id);
CountryStateCity.getCountryByIso2(iso2);
CountryStateCity.getCountryByIso3(iso3);
CountryStateCity.searchCountries(query);
CountryStateCity.getCountriesByRegion(region);
CountryStateCity.getCountriesBySubregion(subregion);
CountryStateCity.getCountryTranslation(countryCode, locale);
```

### States and cities

```typescript
CountryStateCity.getAllStates(format?, options?);
CountryStateCity.getStateById(id);
CountryStateCity.getStatesByCountryId(countryId, format?, options?);
CountryStateCity.getStatesByCountryCode(countryCode, format?, options?);
CountryStateCity.searchStates(query, countryId?);

CountryStateCity.getAllCities(format?, options?);
CountryStateCity.getCityById(id);
CountryStateCity.getCitiesByStateId(stateId, format?, options?);
CountryStateCity.getCitiesByCountryId(countryId, format?, options?);
CountryStateCity.searchCities(query, stateId?, countryId?);
```

The legacy state/city collections retain imported rows for compatibility. Use the canonical methods when comparable administrative and settlement layers are required:

```typescript
const admin1 = CountryStateCity.getAdministrativeAreas({
  countryCode: 'TR',
  level: 1,
  lifecycleStatus: 'current',
});

const settlements = CountryStateCity.getSettlements({
  countryCode: 'TR',
  lifecycleStatus: 'current',
});
```

### Türkiye districts

The explicit district layer currently covers Türkiye:

```typescript
CountryStateCity.getAllDistricts(format?, options?);
CountryStateCity.getDistrictById(id);
CountryStateCity.getDistrictByPublicId(publicId);
CountryStateCity.getDistrictsByStateId(stateId, format?, options?);
CountryStateCity.getDistrictsByCountryCode(countryCode);
CountryStateCity.searchDistricts(query, stateId?);
```

CountryStateCity does not invent official codes that its validation source does not publish. `officialDistrictCode` is therefore `null`, with an explicit status field explaining why.

## Ranked location search

`searchLocations()` searches countries, states, cities, and districts together. Results include a stable canonical ID, score, match reason, and matched alias metadata.

```typescript
const matches = CountryStateCity.searchLocations('İstanbull', {
  countryCode: 'TR',
  entityTypes: ['state', 'city', 'district'],
  typoTolerance: true,
  limit: 10,
});
```

## Spatial lookup

Nearest-centre lookup uses lazy 3D spatial indexes, handles the antimeridian, and returns distance, confidence, and the immutable data version:

```typescript
const nearest = CountryStateCity.nearestCenters(
  { latitude: 40.9811, longitude: 29.0651 },
  {
    countryCode: 'TR',
    entityTypes: ['state', 'city', 'district'],
    limitPerType: 2,
    maxDistanceKm: 100,
  }
);

const batch = CountryStateCity.nearestCentersBatch([
  { latitude: 40.9811, longitude: 29.0651 },
  { latitude: 39.9334, longitude: 32.8597 },
]);
```

A centre match is not proof of administrative containment. For that, import compatible GeoJSON and use `PolygonLookupIndex` or `locatePointInPolygons()`. Versioned polygon coverage currently includes Türkiye admin-1/admin-2 only.

```typescript
import { PolygonLookupIndex } from '@tansuasici/country-state-city';

const index = new PolygonLookupIndex(featureCollection);
const result = index.locate({ latitude: 40.9811, longitude: 29.0651 });
```

## Timezones

Stored offsets age as daylight-saving rules change. Observe an IANA timezone at the instant you need instead:

```typescript
const zones = CountryStateCity.getAllTimezones();
const observation = CountryStateCity.getTimezoneOffset('Europe/Istanbul', '2026-08-09T12:00:00Z');
```

## Direct data imports

Use public package exports instead of repository-relative paths:

```typescript
import countries from '@tansuasici/country-state-city/data/countries.json' with { type: 'json' };
import states from '@tansuasici/country-state-city/data/states.json' with { type: 'json' };
import compactCities from '@tansuasici/country-state-city/data/cities.optimized.json' with { type: 'json' };
import turkeyDistricts from '@tansuasici/country-state-city/data/districts/tr.json' with { type: 'json' };
import qualityReport from '@tansuasici/country-state-city/data/quality-report.json' with { type: 'json' };
```

Compact city keys are `i` (ID), `n` (name), `s` (state ID), `c` (country ID), `la`/`lo` (coordinates), and optional `w` (Wikidata QID). Use the class API for complete `City` objects.

Boundary geometry is opt-in. The package contains a boundary manifest and a lightweight Türkiye overview topology; larger regional and detailed profiles remain separate downloads.

```typescript
const { default: manifest } = await import(
  '@tansuasici/country-state-city/data/boundaries/manifest.json',
  { with: { type: 'json' } }
);

const { default: turkeyOverview } = await import(
  '@tansuasici/country-state-city/data/boundaries/tr/overview.json',
  { with: { type: 'json' } }
);
```

## Stable IDs and migrations

Persist namespaced public IDs instead of assuming that upstream numeric IDs never change:

```typescript
import { parsePublicId, toPublicId } from '@tansuasici/country-state-city';

const publicId = toPublicId('city', 107863); // csc:city:107863
const parsed = parsePublicId(publicId);
```

Version-pair redirects and successors are published under `data/migrations/`.

## MCP server

The package includes a stdio MCP server for compatible AI clients:

```json
{
  "mcpServers": {
    "country-state-city": {
      "command": "npx",
      "args": ["-y", "@tansuasici/country-state-city"]
    }
  }
}
```

## Migrating to v3

- `data/cities.json` was removed. Use the class API or `data/cities.optimized.json`.
- Country and state coordinates can be `null` when a trustworthy value is unavailable.
- Country translations use typed locale keys and can contain `null` values.
- State and city records include explicit entity, administrative level, parent, lifecycle, validity, confidence, and source fields.
- Nearest-centre lookup and polygon containment are separate APIs by design.

Review nullable fields when upgrading TypeScript consumers. Prefer the immutable `csc:*` IDs for persisted references.

## Hosted API and documentation

- [Website and map](https://countrystatecity.tansuasici.com)
- [Hosted REST and GraphQL API](https://countrystatecity.tansuasici.com/docs/hosted-api)
- [Interactive API playground](https://countrystatecity.tansuasici.com/docs/api-playground)
- [GitHub repository](https://github.com/tansuasici/CountryStateCity)
- [npm package](https://www.npmjs.com/package/@tansuasici/country-state-city)

## License and attribution

- Package source: [MIT](https://github.com/tansuasici/CountryStateCity/blob/main/LICENSE)
- Country, state, and city database: [ODbL 1.0](https://github.com/tansuasici/CountryStateCity/blob/main/DATA_LICENSE.md)

The core data is derived from the [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database). Attribution is required. Machine-readable source, verification, and transformation details are published in `data/provenance.json`.
