# Country State City - Project Guide

## Project Overview

This is a **dual-purpose project**: a Next.js web application (showcase site) AND an NPM package (`@tansuasici/country-state-city`) providing world location data (250+ countries, 5000+ states, 150,000+ cities).

- **Website**: https://countrystatecity.xyz
- **NPM Package**: `@tansuasici/country-state-city` (v2.0.11)
- **License**: MIT
- **Author**: Tansu Asici

## Tech Stack

- **Framework**: Next.js 16 (App Router, static export via `output: "export"`)
- **Language**: TypeScript 5
- **UI Library**: HeroUI (formerly NextUI) + Tailwind CSS 3
- **Icons**: lucide-react
- **Theme**: next-themes (dark/light mode)
- **Map**: Leaflet + react-leaflet
- **Build (NPM lib)**: Rollup (3 builds: browser ESM, Node CJS, Node ESM)
- **Hosting**: Firebase Hosting (static `out/` directory)
- **Font**: Inter (Google Fonts)

## Project Structure

```
country-state-city/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (metadata, SEO, JSON-LD)
│   ├── page.tsx                  # Homepage (hero, features, stats)
│   ├── providers.tsx             # HeroUI + theme providers
│   ├── docs/page.tsx             # Documentation page + playground
│   ├── map/page.tsx              # Interactive world map page
│   ├── sitemap.ts                # Dynamic sitemap
│   ├── robots.ts                 # Robots.txt config
│   ├── globals.css               # Global styles
│   └── theme-config.ts           # Theme configuration
├── components/
│   ├── CountryStateCity.tsx       # Country > State > City cascading selector
│   ├── WorldMap.tsx               # Leaflet map component
│   ├── DataPlayground.tsx         # Interactive API playground
│   ├── Navigation.tsx             # Top navbar with dark mode toggle
│   └── Footer.tsx                 # Site footer
├── lib/
│   ├── countries.ts               # Data access helpers (wraps NPM package)
│   ├── data.ts                    # DataService class (alternative data access)
│   ├── formatters.ts              # CSV/XML/YAML formatters for web app
│   └── firebase.ts                # Firebase config
├── types/
│   └── index.ts                   # TypeScript interfaces (Country, State, City, Timezone)
├── data/                          # Raw JSON data files
│   ├── country.json               # All countries
│   ├── state.json                 # All states
│   ├── city.json                  # All cities (optimized format)
│   ├── city-optimized.json        # Cities in compressed format
│   ├── city-array.json            # Cities in array format
│   └── cities/                    # Per-country city files (e.g., tr.json, us.json)
├── countrystatecity-npm/          # NPM package source
│   ├── src/
│   │   ├── index.ts               # Node entry (reads JSON from filesystem)
│   │   ├── index.browser.ts       # Browser entry (imports JSON directly)
│   │   ├── index.node.ts          # Node-specific entry
│   │   ├── types.ts               # Package type definitions
│   │   └── formatters.ts          # Package formatters (CSV, XML, YAML)
│   ├── dist/                      # Built package output
│   └── test.js                    # Package tests
├── public/                        # Static assets (logo, favicon, etc.)
├── rollup.config.js               # Rollup config for NPM package build
├── tsconfig.json                  # Next.js TypeScript config
├── tsconfig.lib.json              # Library-specific TypeScript config
├── next.config.ts                 # Next.js config (static export)
├── tailwind.config.ts             # Tailwind CSS config
├── firebase.json                  # Firebase Hosting config
└── package.json                   # Dependencies and scripts
```

## Key Commands

```bash
npm run dev              # Start dev server (Turbopack)
npm run build:prod       # Build for production (auto version bump)
npm run build:lib        # Build NPM package with Rollup
npm run build:lib:tsc    # TypeScript compile for library
npm run lint             # Run ESLint
npm run start            # Start production server
```

## Architecture Notes

### Dual Build System

1. **Next.js build** (`next build`): Generates static site in `out/` for Firebase Hosting
2. **Rollup build** (`rollup -c`): Generates NPM package in `countrystatecity-npm/dist/` with:
   - `index.browser.js` (ESM, tree-shakeable, imports JSON directly)
   - `index.node.cjs` (CommonJS, reads files from disk via `fs`)
   - `index.node.mjs` (ESM for Node, reads files from disk via `fs`)

### Data Format

- City data uses an **optimized/compressed format** in `city.json`:
  - `i` = id, `n` = name, `s` = stateId, `c` = countryId, `la` = latitude, `lo` = longitude, `w` = wikiDataId
  - Both browser and node builds handle decompression at runtime
- Country and state data use standard full-field JSON format

### Component Patterns

- All page components use `"use client"` directive (client-side rendering)
- Data loading uses dynamic `import()` for code-splitting
- HeroUI components for all UI elements (Autocomplete, Card, Button, etc.)
- Cascading selection pattern: Country -> State -> City

### NPM Package API

The `CountryStateCity` class uses static methods with lazy loading:

- `getAllCountries(format?)`, `getCountryById(id)`, `getCountryByIso2(code)`
- `getAllStates(format?)`, `getStatesByCountryId(id, format?)`
- `getAllCities(format?)`, `getCitiesByStateId(id, format?)`
- `searchCountries(query)`, `searchStates(query, countryId?)`
- `exportData(type, format, options)` for bulk export
- Supports `json`, `csv`, `xml`, `yaml` output formats

### Path Aliases

- `@/` maps to the project root (configured in tsconfig.json)

## Environment Files

- `.env.development` - Development environment variables
- `.env.local` - Local override variables
- `.env.production` - Production environment variables
- Uses `env-cmd` to load the correct env file per script

## Deployment

- **Website**: Firebase Hosting (static export from `out/` directory)
- **NPM Package**: Published to npm as `@tansuasici/country-state-city`
- `prepublishOnly` hook runs `build:lib` before npm publish

## Important Considerations

- City data is very large (~150K records). Always use lazy loading and pagination
- The NPM package has separate browser/node entry points to handle fs/path differences
- The site is fully static (no API routes) - all data is bundled at build time
- HeroUI requires `transpilePackages` config in next.config.ts
- All components are client-side (`"use client"`) due to interactive features
