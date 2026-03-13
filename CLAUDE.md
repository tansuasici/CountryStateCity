# Country State City - Project Guide

## Project Overview

This is a **dual-purpose project**: a Next.js web application (documentation site) AND an NPM package (`@tansuasici/country-state-city`) providing world location data (250+ countries, 5000+ states, 150,000+ cities).

- **Website**: https://countrystatecity.tansuasici.com
- **NPM Package**: `@tansuasici/country-state-city`
- **License**: MIT
- **Author**: Tansu Asici

## Tech Stack

- **Framework**: Next.js 16 (App Router, static export via `output: "export"`)
- **Language**: TypeScript 5
- **Docs Framework**: Fumadocs (fumadocs-core, fumadocs-ui, fumadocs-mdx)
- **CSS**: Tailwind CSS 4
- **Icons**: lucide-react
- **Map**: Leaflet + react-leaflet
- **Build (NPM lib)**: Rollup (3 builds: browser ESM, Node CJS, Node ESM)
- **Hosting**: Firebase Hosting (static `out/` directory)
- **Font**: DM Sans + JetBrains Mono (Google Fonts)

## Project Structure

```
country-state-city/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (RootProvider, metadata, SEO, JSON-LD)
│   ├── globals.css               # Tailwind v4 + Fumadocs CSS imports
│   ├── (home)/                   # Route group: homepage + map
│   │   ├── layout.tsx            # HomeLayout (Fumadocs)
│   │   ├── page.tsx              # Homepage (hero, features, stats)
│   │   └── map/page.tsx          # Interactive world map
│   ├── docs/                     # Documentation section
│   │   ├── layout.tsx            # DocsLayout with sidebar
│   │   └── [[...slug]]/page.tsx  # Catch-all docs page renderer
│   ├── sitemap.ts                # Dynamic sitemap
│   └── robots.ts                 # Robots.txt config
├── content/docs/                 # MDX documentation files
│   ├── meta.json                 # Sidebar navigation order
│   ├── index.mdx                 # Getting Started
│   ├── installation.mdx          # Installation guide
│   ├── api-reference.mdx         # API Reference
│   ├── data-structures.mdx       # TypeScript interfaces
│   ├── formats.mdx               # Output formats (JSON/CSV/XML/YAML)
│   ├── mcp.mdx                   # MCP Integration guide
│   ├── playground.mdx            # Interactive playground
│   └── contributing.mdx          # Contributing guide
├── components/
│   ├── WorldMap.tsx               # Leaflet map component
│   ├── DataPlaygroundMDX.tsx      # Interactive API playground (MDX-embedded)
│   └── mdx.tsx                   # MDX component provider
├── lib/
│   ├── source.ts                 # Fumadocs source loader
│   ├── layout.shared.tsx         # Shared nav/link config for Fumadocs layouts
│   ├── countries.ts              # Data access helpers (wraps browser build)
│   ├── data.ts                   # DataService class
│   ├── formatters.ts             # CSV/XML/YAML formatters for web app
│   └── firebase.ts               # Firebase config
├── types/
│   └── index.ts                  # TypeScript interfaces (Country, State, City, Timezone)
├── data/                         # Raw JSON data files
│   ├── country.json              # All countries
│   ├── state.json                # All states
│   ├── city.json                 # All cities (optimized format)
│   └── cities/                   # Per-country city files
├── countrystatecity-npm/         # NPM package source
│   ├── src/
│   │   ├── index.ts              # Node entry (reads JSON from filesystem)
│   │   ├── index.browser.ts      # Browser entry (imports JSON directly)
│   │   ├── index.node.ts         # Node-specific entry
│   │   ├── types.ts              # Package type definitions
│   │   └── formatters.ts         # Package formatters
│   └── dist/                     # Built package output
├── countrystatecity-mcp/         # MCP server source
├── source.config.ts              # Fumadocs MDX collection config
├── next.config.mjs               # Next.js config (wrapped with createMDX)
├── postcss.config.mjs            # PostCSS config (@tailwindcss/postcss)
├── rollup.config.js              # Rollup config for NPM package build
├── tsconfig.json                 # TypeScript config (includes collections/* alias)
├── firebase.json                 # Firebase Hosting config
└── package.json                  # Dependencies and scripts
```

## Key Commands

```bash
npm run dev              # Start dev server (Turbopack)
npm run build:prod       # Build for production (auto version bump)
npm run build:lib        # Build NPM package with Rollup
npm run build:mcp        # Build MCP server with esbuild
npm run lint             # Run ESLint
npm run test             # Run tests with Vitest
```

## Architecture Notes

### Dual Build System

1. **Next.js build** (`next build`): Generates static site in `out/` for Firebase Hosting
2. **Rollup build** (`rollup -c`): Generates NPM package in `countrystatecity-npm/dist/` with:
   - `index.browser.js` (ESM, tree-shakeable, imports JSON directly)
   - `index.node.cjs` (CommonJS, reads files from disk via `fs`)
   - `index.node.mjs` (ESM for Node, reads files from disk via `fs`)

### Fumadocs Setup

- `source.config.ts` defines MDX collections (`content/docs/`)
- `lib/source.ts` creates the Fumadocs loader with `/docs` base URL
- `lib/layout.shared.tsx` provides shared nav config (logo, links)
- `components/mdx.tsx` provides MDX component mappings
- `.source/` directory is auto-generated (gitignored)
- Path alias: `collections/*` → `.source/*`

### Data Format

- City data uses an **optimized/compressed format** in `city.json`:
  - `i` = id, `n` = name, `s` = stateId, `c` = countryId, `la` = latitude, `lo` = longitude, `w` = wikiDataId
  - Both browser and node builds handle decompression at runtime
- Country and state data use standard full-field JSON format

### Component Patterns

- Interactive components use `"use client"` directive
- Docs pages are server-rendered via Fumadocs
- Browser build (`index.browser`) must be used for website imports (no `fs` module)
- Static imports preferred over dynamic `import()` for reliability

### NPM Package API

The `CountryStateCity` class uses static methods with lazy loading:

- `getAllCountries(format?)`, `getCountryById(id)`, `getCountryByIso2(code)`
- `getAllStates(format?)`, `getStatesByCountryId(id, format?)`
- `getAllCities(format?)`, `getCitiesByStateId(id, format?)`
- `searchCountries(query)`, `searchStates(query, countryId?)`
- `exportData(type, format, options)` for bulk export
- Supports `json`, `csv`, `xml`, `yaml` output formats

### Path Aliases

- `@/` maps to the project root
- `collections/*` maps to `.source/*` (Fumadocs generated)

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
- All components importing from the NPM source must use `index.browser` (not `index`)
- Fumadocs MDX components use specific import paths (e.g. `fumadocs-ui/components/callout`)
