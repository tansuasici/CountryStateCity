# Dataset notice

Contains information from [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database), made available under the [Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/).

This directory contains a derivative database. See [`../DATA_LICENSE.md`](../DATA_LICENSE.md) for attribution and license information and [`provenance.json`](provenance.json) for machine-readable source, revision, transformation, and verification details.

## Reproducible data sync

The candidate update source is pinned in [`sources/dr5hn-v3.2-export.7.json`](sources/dr5hn-v3.2-export.7.json) by release, full commit SHA, exact byte size, and SHA-256 for every asset.

```bash
npm run test:data-sync
npm run data:check-freshness
npm run data:sync -- --check --verify-reproducible --record-report
```

The pipeline runs `raw → normalize → patch overlay → validate → diff → optimize/shard → package` under `.data-sync/`. It generates source, quality, schema, row-change, and output checksum reports. The recorded report for the pinned candidate is in [`sync-reports/v3.2-export.7`](sync-reports/v3.2-export.7).

Local corrections belong in [`patches/overrides.json`](patches/overrides.json) with a reason, stable source URL, and compatible license. Raw and production JSON must not be edited to hide an upstream problem.

## Coverage contract

[`coverage-policy.json`](coverage-policy.json) defines the public meaning of `available`, `missing`, `notApplicable`, and `unknown`. [`coverage-report.json`](coverage-report.json) is deterministically generated from the policy and current country/state/city snapshot; it assigns a stable reason code to every empty layer, required metadata gap, and missing country coordinate.

## Data quality release gate

`npm run test:data-quality` scans every canonical entity and generated distribution artifact before release. The gate covers required schema fields, unique IDs, parent references and denormalized fields, normalized duplicates, null/coverage classification, coordinate ranges, Wikidata QIDs, IANA time zones, country/state polygon outliers, and SHA-256 parity across canonical, optimized, shard, and npm outputs. Any unresolved `critical` or `high` finding fails CI and npm publication.

[`quality-exceptions.json`](quality-exceptions.json) is the only accepted-exception registry. Every entry requires an owner, rationale, evidence files, exact expected count, and future expiry date; count drift or expiry fails the gate. [`quality-report.json`](quality-report.json) is the machine-readable result, while [`quality-report.md`](quality-report.md) includes the check summary and all 250 country drill-down rows. Regenerate both with `npm run data:quality` after an intentional policy or data change.

## Time zones

`zoneName` is the only authoritative time-zone identity and is validated through ECMA-402 against IANA tzdb. The legacy `gmtOffset` and `gmtOffsetName` fields are a snapshot at each record's `observedAt` (`2026-01-15T00:00:00.000Z`), not a promise about the current offset. UTC labels always use `UTC±HH:MM`, including `UTC+00:00`. Use `CountryStateCity.getTimezoneOffset(zoneName, at)` to calculate the offset for a requested instant and observe daylight-saving changes. Exact source/runtime metadata and warnings are in [`timezone-policy.json`](timezone-policy.json).

## Canonical data and generated artifacts

[`country.json`](country.json), [`state.json`](state.json), and [`city.json`](city.json) are the only canonical distribution inputs. Optimized city data, the npm data copies, and every country shard are generated with `npm run data:artifacts`; they must not be edited directly. `npm run test:data-artifacts` recreates every derived byte in memory and fails on a changed, missing, or unexpected artifact. CI and `prepublishOnly` run this drift gate.

The core npm package publishes exactly one city dataset: [`city-optimized.json`](city-optimized.json). Node, browser, and MCP entrypoints all reuse it; the API reconstructs full `City` objects lazily. The 89 MB canonical city source, 39 MB per-city QID audit evidence, and per-country shards stay in the repository/release artifacts instead of being copied into the core runtime package. [`package-budget.json`](package-budget.json) records this decision and the 24 MB unpacked / 4 MB packed budgets; [`package-size-report.json`](package-size-report.json) records the measured package. `npm run test:package-size` blocks size or duplicate-data regressions.

The website has a separate country-scoped delivery layer for the map and interactive playground. `npm run data:web-city-shards` generates one compact JSON file for each of the 250 ISO alpha-2 codes under `public/data/cities/`; selecting a country fetches only that country's shard, caches successful responses, and cancels stale requests when the selection changes. The generated directory is intentionally ignored because it is reproducible from the canonical shards. `npm run test:web-city-shards` verifies every file, count, byte size, and SHA-256, while `npm run test:routes` rejects any production JavaScript chunk that embeds the global city dataset.

[`country-metadata-policy.json`](country-metadata-policy.json) distinguishes 249 officially assigned ISO 3166 alpha-2 codes from the user-assigned `XK` exception and records country-name/currency aliases, effective dates, and authoritative sources. Each country row exposes `codeAuthority`, `codeStatus`, `metadataSource`, and `metadataVerifiedAt`. Run `npm run data:country-metadata` after changing the policy; child compatibility names are then regenerated from IDs.

[`schema-normalization-policy.json`](schema-normalization-policy.json) defines the canonical state-type enum and the shared country-translation locale set. State types are NFC-normalized, trimmed, and lower-case; missing source types remain `null` with `typeStatus: "unknown"` and `typeReasonCode: "source-type-missing"`. Every country exposes the same 14 BCP 47 translation keys; 22 genuinely missing values are `null` and listed in `translationMissingLocales`. Deprecated `kr`, `br`, and `cn` callers can migrate through `getCountryTranslation()` to `ko`, `pt-BR`, and `zh-CN`; raw legacy keys are scheduled for removal only under the documented 3.0 migration.

[`entity-level-policy.json`](entity-level-policy.json) defines the canonical administrative-area and settlement model. Every state and city source row carries an explicit `entityType`, `administrativeLevel` (or `null` when not applicable), `placeType`, `parentId`, `lifecycleStatus`, `validFrom`, and `validTo`. [`entity-level-report.json`](entity-level-report.json) summarizes levels and lifecycle status for every country. The pinned current subdivision snapshot yields 4,488 current state rows; 35 abolished Albanian districts are historical, and 440 unmatched rows remain visible as `review-required` instead of being silently declared current or deleted.

Legacy state/city getters preserve source compatibility. New `getAdministrativeAreas()` defaults to current level-1 source-state areas and accepts level/country/status/source-layer filters; `getSettlements()` excludes administrative-area-like city rows. Run `npm run data:entity-levels` after changing the policy.

[`distribution-manifest.json`](distribution-manifest.json) records the SHA-256 of each canonical source and generated artifact, the shared package version, upstream release/revision, and the compact-coordinate precision contract. Compact coordinates use four decimal places; the manifest publishes the measured maximum centre-point error for the current snapshot. Root `package.json` is the release-version authority, while `countrystatecity-npm` is a private build workspace locked to that same version.

Country and state names/codes copied into child rows are compatibility fields, not independent sources. `npm run data:normalize-parents` derives every state `countryCode/countryName` and city `countryCode/countryName/stateCode/stateName` value exclusively from `countryId/stateId`. The upstream sync runs the same normalizer after patch overlays, and both `test:data` and `test:data-artifacts` reject stale parent values.

## Wikidata references

City `wikiDataId` is optional supplemental metadata and never the primary record identity. [`identity/wikidata-qid-policy.json`](identity/wikidata-qid-policy.json) defines duplicate, coordinate-distance, territorial-parent, and confidence rules. [`identity/wikidata-qid-verification.json`](identity/wikidata-qid-verification.json) records the 2026-08-08 Wikidata Query Service audit, entity types/revisions, per-city confidence, every duplicate group, and every rejected unique assignment. The audit clears every ambiguous multi-record QID and any unique QID whose Wikidata coordinate is more than 100 km away; country mismatches alone remain low-confidence because Wikidata may use a sovereign parent for a dependent territory.

```bash
npm run data:coverage
npm run test:data
```

Published row counts are not an exhaustiveness claim. Consumers should inspect `CountryStateCity.getCoverageReport()` or `CountryStateCity.getCountryCoverage(code)` before interpreting an empty state or city result.

## City coordinate and territory quality

[`geography/state-coordinate-policy.json`](geography/state-coordinate-policy.json) re-sources every state centre with an explicit method and source. 4,088 states use a point guaranteed to lie on the matched Natural Earth Admin-1 polygon; 818 use a pinned source point validated against the country reference; 8 use the median of validated child-place centres. Forty-nine rows without a defensible point remain `null` with an explicit exception instead of a fabricated coordinate. Every one of the 317 baseline points more than 25 km from its assigned country polygon has a recorded review resolution; the only remaining numeric major outliers are documented Natural Earth worldview/hierarchy exceptions.

```bash
npm run data:audit:state-coordinates -- --offline --apply
npm run test:state-coordinates
```

[`geography/city-coordinate-policy.json`](geography/city-coordinate-policy.json) records the pinned Natural Earth 5.1.1 country reference, four reviewed coordinate corrections, and stable exceptions for political worldview, dependency hierarchy, territorial claims, and small islands omitted at 1:10m. Natural Earth is a reproducible QA baseline, not the canonical legal or political authority for this dataset.

The audit evaluates all 147,739 city rows. Its 25 km baseline contained 636 major mismatches: 4 incorrect coordinates were fixed and every one of the remaining 632 records has exactly one documented exception. Crimea remains assigned to Ukraine; Puerto Rico remains in the imported US hierarchy until a separately versioned hierarchy migration is approved.

```bash
npm run data:apply:city-coordinate-corrections
npm run data:audit:city-coordinates
npm run test:city-coordinates
```

The review output is published in [`../analysis/city_coordinate_quality_report.md`](../analysis/city_coordinate_quality_report.md), with full machine-readable detail in the adjacent JSON report. The CI check runs offline against the archive pinned by byte size and SHA-256, so a changed upstream download cannot silently alter the result.

Public identity uses the immutable `csc:{entity}:{legacyNumericId}` namespace documented in [`identity-policy.json`](identity-policy.json). Upstream IDs are tracked separately as mutable source identifiers; an upstream ID can never silently take over an existing CSC public ID. The sync pipeline writes [`identity-report.json`](sync-reports/v3.2-export.7/identity-report.json) and blocks `--apply` while any same-source-ID collision or successor-less removal remains unresolved.

Version-pair migration downloads are indexed by [`migrations/index.json`](migrations/index.json). Rename, move, delete, merge, split, source-ID change, and identity-repair events carry explicit successor/redirect semantics. A split never gets an automatic redirect; consumers must choose among its published successors.

### Data semver

- **Patch:** identity-preserving metadata, alias, display-name, or coordinate corrections.
- **Minor:** additive entities or fields that preserve every existing public identity.
- **Major:** public schema removals or hierarchy-semantic changes requiring a migration file.

Public ID reuse is forbidden in every release type, including majors. Production apply remains disabled while the pinned candidate's identity report contains unresolved migration decisions.

## Türkiye district layer

[`admin/districts/tr.json`](admin/districts/tr.json) publishes a distinct Türkiye district grain: exactly 922 current districts under 81 provinces. It preserves the matched legacy city numeric identity under the separate `csc:district:*` namespace, strips presentation-only `İlçesi` suffixes, and retains legacy/GeoNames spellings as aliases.

The production centre coordinates and legacy identities come from the existing ODbL dataset. GeoNames ADM2 identities and alternate labels are attributed under CC BY 4.0. The Interior Ministry and user-provided HGM archive are validation-only because their redistribution terms do not support copying those source records into this package. The reproducible [reconciliation report](../analysis/turkey_admin_reconciliation_report.json) verifies all 922 names/parents. Eleven of its twelve centre conflicts are corroborated within 2 km by another validation source; the remaining Sarıçam record was a same-named village point and is corrected to the OpenStreetMap district relation's `admin_centre`. No coordinate conflict remains unresolved in the published district layer.

[`migrations/tr-city-to-district.json`](migrations/tr-city-to-district.json) maps all 922 district-centre legacy city IDs to their new district IDs without deleting the old API records. The other 104 Türkiye city rows are explicitly classified as places that are not current districts. This prevents `Merkez`, neighbourhood, village, and other locality records from being presented as districts.

```bash
npm run data:sync:turkey-admin -- \
  --output data/sources/tr-admin-2026-08-05.json \
  --snapshot-date 2026-08-05
npm run test:turkey-admin
```

To regenerate the open-data layer, download the three files pinned by SHA-256 in [`sources/geonames-tr-2026-08-05.json`](sources/geonames-tr-2026-08-05.json), unzip `TR.zip`, and run:

```bash
npm run data:districts:turkey -- --geonames-dir /path/to/geonames
```

Do not label `csc:district:*`, GeoNames IDs, or the validation snapshot `sourceId` as an official government code. `officialDistrictCode` intentionally remains `null`. Do not copy Interior Ministry or HGM records into production while their redistribution terms remain incompatible with the product license.

## Türkiye boundary layer

[`sources/osm-tr-admin-boundaries-2026-08-06.json`](sources/osm-tr-admin-boundaries-2026-08-06.json) pins 81 province and 922 district OpenStreetMap boundary relations by relation ID, version, timestamp, CSC identity, and ODbL attribution. Six ambiguous names are resolved by reviewed relation ID; no OSM relation is reused for two districts.

[`boundaries/manifest.json`](boundaries/manifest.json) is the public delivery contract. It versions the pilot as `2026-08-06.1`, records file byte budgets and SHA-256 hashes, and exposes immutable website URLs for three zoom profiles plus admin-1/admin-2 GeoJSON downloads. The NPM package exports only the overview TopoJSON as an opt-in lazy asset; `npm run test:web-boundaries` rejects stale files, checksum drift, or budget regressions.

The OSM ETL in [`../analysis/build_turkey_osm_boundaries.py`](../analysis/build_turkey_osm_boundaries.py) fetches relation geometry in adaptive chunks, rejects relation-version drift, falls back to the official OSM API, builds Polygon/MultiPolygon geometry, and checks validity, overlap, parent containment, coverage, and deterministic output hashes. It emits GeoJSON and shared-arc TopoJSON at raw, z0–4, z5–7, and z8+ simplification profiles under [`boundaries/tr`](boundaries/tr).

The pinned raw OSM relations contain 13 district overlap pairs, one province overlap, two district/parent discrepancies, and a province-versus-district coverage semantic mismatch. Product geometry uses the explicit `district-first-derived-coverage-v1` model: overlaps are assigned to the district nearest the published district centre, a documented one-metre separation prevents floating-point re-overlap, and each province is derived from the union of its normalized child districts. Every repair is recorded in feature metadata and the machine-readable report. This is an administrative visualization layer, not a cadastral or legal boundary source. See the [review report](../analysis/turkey_osm_boundary_etl_report.md).

## Display names and administrative types

[`location-display.json`](location-display.json) is a non-destructive UI metadata layer generated from the pinned current source. It contains all 250 English country display names and is keyed by the full subdivision code (`countryCode-stateCode`) for concise subdivision names plus explicit administrative types.

For example, the canonical legacy record remains `Andrijevica Municipality`, while the display layer renders `Andrijevica` with the separate category `Municipality`. This preserves API round-trips and public numeric IDs while avoiding repeated or invented labels in user interfaces.

```bash
npm run data:display-metadata
```

The generator verifies the pinned source byte size and SHA-256 before writing the metadata. Country display names use the English ECMA-402 `Intl.DisplayNames`/Unicode CLDR convention. When a subdivision is not present in the current source, the UI may infer a type only from an explicit suffix such as `County` or `Province`; otherwise it leaves the type blank.

Every populated-place name is normalized for Unicode and whitespace. If its canonical name explicitly ends in a controlled administrative suffix (`District`, `Municipality`, `County`, `Province`, and similar), the UI separates that suffix as an inferred category while preserving the canonical value for API round-trips. The city source has no entity-type field, so records without such an explicit suffix must not be presented as verified `City`, `Town`, `Village`, or `District` entities without another authoritative source.
