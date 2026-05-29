// Precomputed dataset counts.
// Used so high-traffic pages (e.g. the homepage) can show totals without
// loading the full ~148k-row city dataset into the client bundle.
// Source counts: data/country.json, data/state.json, data/city.json (2026-05).
export const STATS = {
  countries: 250,
  states: 4963,
  cities: 147740,
} as const;
