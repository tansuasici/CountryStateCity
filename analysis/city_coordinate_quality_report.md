# City coordinate and territory quality report

## Executive Summary

- **The 25 km quality gate is fully resolved.** The pinned baseline contained 636 major outliers; 4 country-polygon coordinate defects were corrected and the remaining 632 records have stable reason-code exceptions.
- **Most apparent failures are model differences, not bad points.** Crimea/Ukraine and Puerto Rico/US account for 580 of the 636 baseline cases.
- **No unresolved major outlier remains.** All 147,739 city coordinates are numeric and in range; every city row has a usable country reference geometry.

## What the audit measures

Every published city point is compared with the pinned Natural Earth Admin-0 Countries 5.1.1 geometry at 1:10m. A point outside its assigned country polygon is informational until its geodesic distance exceeds 25 km. Natural Earth uses a default de-facto worldview; CountryStateCity preserves its imported hierarchy and records worldview differences rather than silently changing political ownership.

## The baseline resolves into five explainable classes

| Resolution class | Records | Treatment |
|---|---:|---|
| Disputed/de-facto model | 332 | Documented policy exception |
| Dependency hierarchy | 255 | Versioned hierarchy decision deferred |
| Reference-scale omission | 44 | Country location independently verified |
| Corrected coordinate | 4 | Production and patch overlay updated |
| Territorial claim | 1 | Explicit claim-area exception |

The 3308 points still outside the reference polygon include small coastline and island generalization effects below the gate. They are not treated as coordinate defects.

## Applied coordinate corrections

| City ID | Record | Country | Previous coordinate | Corrected coordinate | Source |
|---:|---|---|---|---|---|
| 148461 | Juan Fernández | CL | -30.02564270, -82.05192080 | -33.61666667, -78.86666667 | wikidata-Q14454 |
| 149096 | Tain | GH | 8.18114110, -2.86487620 | 7.87100000, -2.31700000 | wikidata-Q695048 |
| 133809 | Sarupathar | IN | 26.20600000, 96.81000000 | 26.19545833, 93.86240278 | wikidata-Q638291 |
| 132750 | Lakshadweep | IN | 11.27333000, 74.04582000 | 10.56510000, 72.64564000 | geonames-9748019 |
| 107863 | Kadıköy | TR | 40.98229000, 29.09032000 | 40.98109600, 29.06514473 | openstreetmap-relation-1276548-point-on-surface |

The production JSON, compact representation, country shards, and pinned sync patch overlay all carry the same corrected values. This table also includes corrections found by stricter admin-level containment checks, which are tracked separately from the country-polygon baseline.

## Policy decisions

- Crimea remains assigned to Ukraine. The exception documents the difference between the project's de-jure owner and Natural Earth's default de-facto polygon.
- Puerto Rico remains under the imported US state hierarchy for this release. Natural Earth models it as a separate dependency polygon, while the dataset also has a separate PR country record. Any reparenting must be a versioned hierarchy migration rather than a silent coordinate fix.
- Somaliland and Northern Cyprus differences are recorded as disputed-territory source-owner exceptions.
- Chile's Antártica record is explicitly marked as a territorial claim.
- Forty-four small-island points were checked individually against OpenStreetMap administrative relations and retained as reference-scale exceptions.

## Recommended next steps

1. Keep `npm run test:city-coordinates` in CI and release gates.
2. Decide Puerto Rico and other dependency reparenting in the coverage-policy work before changing public parents.
3. Offer an explicit worldview option if future boundary products expose disputed-area polygons.

## Further questions

- Should dependency entities such as Puerto Rico become canonical top-level navigation parents in the next data-major release?
- Should the product expose both source hierarchy and ISO-territory hierarchy as separate views?

## Caveats and assumptions

- Natural Earth 1:10m is a cartographic validation source, not a cadastral or legal boundary authority.
- The 25 km threshold deliberately tolerates coastline simplification and omitted tiny islands; it is not a measure of city-centre precision.
- OpenStreetMap checks are ODbL-attributed validation snapshots dated 2026-08-06.
- The source `city` table mixes settlements and administrative entities; this audit validates coordinates and country placement, not entity type.

Machine-readable detail, including all 632 classified records, is in `analysis/city_coordinate_quality_report.json`.
