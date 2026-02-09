# Country State City

Complete world location data — 250+ countries, 5,000+ states, 150,000+ cities — as an NPM package, MCP server, and interactive web app.

[![npm version](https://img.shields.io/npm/v/@tansuasici/country-state-city?color=blue)](https://www.npmjs.com/package/@tansuasici/country-state-city)
[![npm downloads](https://img.shields.io/npm/dm/@tansuasici/country-state-city)](https://www.npmjs.com/package/@tansuasici/country-state-city)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)

**[Live Demo](https://countrystatecity.xyz)** &bull; **[NPM Package](https://www.npmjs.com/package/@tansuasici/country-state-city)** &bull; **[Documentation](https://countrystatecity.xyz/docs)**

## Features

- **250+ Countries, 5K+ States, 150K+ Cities** — ISO 3166-1 compliant
- **Multiple Formats** — JSON, CSV, XML, YAML output
- **MCP Server** — Connect to Claude Desktop and AI assistants
- **TypeScript** — Full type definitions included
- **Dual Entry Points** — Separate browser (ESM) and Node.js (CJS/ESM) builds
- **Search** — Filter countries, states, and cities by name
- **Interactive Playground** — Test the API at [countrystatecity.xyz/docs](https://countrystatecity.xyz/docs)

## Quick Start

```bash
npm install @tansuasici/country-state-city
```

```typescript
import { CountryStateCity } from '@tansuasici/country-state-city';

const countries = CountryStateCity.getAllCountries();
const turkey = CountryStateCity.getCountryByIso2('TR');
const states = CountryStateCity.getStatesByCountryId(225);
const cities = CountryStateCity.getCitiesByStateId(2175);

// Search
const results = CountryStateCity.searchCountries('United');

// Different formats
const csv = CountryStateCity.getAllCountries('csv');
const xml = CountryStateCity.getStatesByCountryId(231, 'xml');
const yaml = CountryStateCity.getCitiesByStateId(1416, 'yaml');
```

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

**5 Resources** — `://countries`, `://countries/{iso2}`, `://countries/{iso2}/states`, `://states/{id}/cities`, `://stats`

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

### Utility Methods

```typescript
CountryStateCity.getStats();
CountryStateCity.getAllRegions();
CountryStateCity.getAllSubregions();
CountryStateCity.getAllTimezones();
CountryStateCity.getAllCurrencies();
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

# Lint
npm run lint
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, static export)
- **UI**: HeroUI + Tailwind CSS
- **Language**: TypeScript 5
- **Build**: Rollup (NPM package), esbuild (MCP server)
- **Testing**: Vitest
- **Hosting**: Firebase Hosting

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>Made with ❤️ for developers worldwide</strong>
</div>
