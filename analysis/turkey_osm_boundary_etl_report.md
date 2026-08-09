# Türkiye OSM boundary ETL review

Reviewed: 2026-08-06

Linear: TAN-5525

Machine-readable report: [`turkey_osm_boundary_etl_report.json`](turkey_osm_boundary_etl_report.json)

## Decision

OpenStreetMap is a redistribution-compatible ODbL source for the optional Türkiye boundary layer. The pinned manifest reconciles exactly 81 province relations and 922 unique district relations to the CSC administrative layer. Six ambiguous district names use reviewed relation IDs; Wikidata IDs are not used because the legacy dataset contains known QID drift.

The normalized geometry is publishable as a **derived administrative visualization layer**. It is not a cadastral, legal, or survey-grade boundary product.

## Source findings preserved

The raw pinned relations remain unchanged and are audited separately in `sourceTopology`:

- 13 positive-area district overlap pairs occur in Adana, Ankara, Diyarbakır, and Mersin.
- Ankara and Çankırı province relations overlap.
- Eldivan and Şabanözü extend outside the pinned Çankırı province relation.
- Province relations include administrative/maritime extents that district relations do not model identically.

These findings are not hidden with a numeric tolerance and the raw province geometry is not presented as equivalent to district coverage.

## Published geometry model

`district-first-derived-coverage-v1` applies two explicit rules:

1. Each district overlap is assigned to the district whose published centre is nearest to a representative point inside the overlap. The losing geometry is trimmed with a documented one-metre separation so reprojection cannot recreate a positive-area overlap.
2. Each province is derived from the union of its normalized child districts. The pinned province relation remains provenance metadata, but is not passed through as the product geometry.

Every repair records the pair, winner, trimmed district, source overlap area, rule, iteration, and separation distance in the machine-readable report. Affected district features repeat the relevant repair metadata.

## Verified output

- Exactly 81 province and 922 district Polygon/MultiPolygon features.
- Unique CSC public IDs and unique pinned OSM relation IDs.
- No invalid output feature.
- No positive-area overlap in raw product geometry or any zoom profile.
- Every district is inside its derived parent province.
- Province coverage and district coverage use the same district-first semantics.
- Deterministic raw GeoJSON, raw TopoJSON, and zoom-profile TopoJSON hashes.
- Source attribution is `© OpenStreetMap contributors`, ODbL 1.0.

The one-metre repair separation may create sub-map-scale slivers around the 13 repaired source overlaps. `coverageValid` therefore remains an informational diagnostic; the release gate requires valid, non-overlapping geometry and exact parent coverage under the documented model.

## Output profiles

| File                            | Intended use          | Simplification |
| ------------------------------- | --------------------- | -------------: |
| `turkey-provinces.geojson`      | Raw province download |           none |
| `turkey-districts.geojson`      | Raw district download |           none |
| `turkey-admin.topojson`         | Raw combined topology |           none |
| `turkey-admin-z0-4.topojson`    | Country overview      |        5,000 m |
| `turkey-admin-z5-7.topojson`    | Regional exploration  |        1,000 m |
| `turkey-admin-z8-plus.topojson` | Detailed interaction  |          100 m |

Zoom profiles use shared-coverage simplification and rerun the same overlap normalization before output.

## Reproduction

```bash
npm run data:boundaries:turkey:manifest -- \
  --province-meta /path/to/osm-province-meta.json \
  --district-meta /path/to/osm-district-meta.json

uv run --with shapely==2.1.2 --with pyproj==3.7.2 \
  python analysis/build_turkey_osm_boundaries.py \
  --output-dir data/boundaries/tr \
  --report analysis/turkey_osm_boundary_etl_report.json

npm run test:turkey-osm-boundaries
```
