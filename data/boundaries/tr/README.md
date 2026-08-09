# Türkiye administrative boundaries

Optional province and district geometry generated from pinned OpenStreetMap relations. The files are not included in the core NPM package and must be loaded only by consumers that need polygon geometry.

The package ships only the 963 kB overview topology plus the versioned boundary manifest, so polygon support remains opt-in and lazy. Its NPM export uses a `.json` extension for Node/browser import-attribute compatibility while retaining TopoJSON content. Regional/detailed profiles and the full GeoJSON downloads are published by the website under the immutable version path recorded in [`../manifest.json`](../manifest.json).

| File                            | Contents                                |
| ------------------------------- | --------------------------------------- |
| `turkey-provinces.geojson`      | 81 derived province features            |
| `turkey-districts.geojson`      | 922 normalized district features        |
| `turkey-admin.topojson`         | Raw combined province/district topology |
| `turkey-admin-z0-4.topojson`    | 5 km overview profile                   |
| `turkey-admin-z5-7.topojson`    | 1 km regional profile                   |
| `turkey-admin-z8-plus.topojson` | 100 m detailed profile                  |

Geometry model: `district-first-derived-coverage-v1`. It resolves pinned source overlaps by distance to the published district centre, uses a documented one-metre separation for repaired overlaps, and derives province geometry from normalized child districts. It is suitable for visualization and spatial lookup, not cadastral or legal use.

Source: © OpenStreetMap contributors, ODbL 1.0. See [`../../../DATA_LICENSE.md`](../../../DATA_LICENSE.md) and the [ETL review](../../../analysis/turkey_osm_boundary_etl_report.md).

Province features publish the official two-digit province code. Türkiye does not publish a reusable canonical district-code field in the validation source used here, so district `officialCode` remains `null` together with the explicit `not-published-by-validation-source` status; CSC and pinned OSM relation IDs remain available for stable identity.

Regenerate the layer with `npm run data:boundaries:turkey`. Add `-- --offline` only when the checksum-keyed `.cache/turkey-osm-boundaries` fetch cache is already available.
