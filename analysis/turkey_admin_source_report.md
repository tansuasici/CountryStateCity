# Türkiye administrative hierarchy reconciliation

Audited: 2026-08-05

Linear: TAN-5523

Official snapshot: [`../data/sources/tr-admin-2026-08-05.json`](../data/sources/tr-admin-2026-08-05.json)

Machine reconciliation: [`turkey_admin_reconciliation_report.json`](turkey_admin_reconciliation_report.json)

## Decision

The T.C. Interior Ministry's [Valilikler ve Kaymakamlıklar](https://www.icisleri.gov.tr/valilikler) page is the current hierarchy baseline. Its public UI and detail endpoint return exactly 81 provinces and 922 districts, including each district's parent province and usually a centre coordinate.

The pinned snapshot is a candidate/review source, not a production replacement. It does not publish an authoritative district code, and its coordinate data contains confirmed gaps and conflicts. The snapshot's `sourceId` is therefore an internal source identity and must never be presented as an official government code.

## Full-row reconciliation

All 922 HGM `İLÇE` centres were compared with all 922 Interior Ministry districts:

- 919 pairs match by normalized current name.
- 3 pairs use reviewed aliases with near-identical coordinates:
  - `Doğubeyazıt` → `Doğubayazıt` (0.236 km)
  - `EYÜP` → `Eyüpsultan` (0.090 km)
  - `Gazi Osmanpaşa` → `Gaziosmanpaşa` (0.231 km)
- No HGM centre or official district remains unmatched.
- Every official district has one parent province; compound source identities are unique.

This closes the name/parent hierarchy check, not the full production gate.

## Coordinate quality

The Interior Ministry source returns `0,0` for two districts. They are represented as `null` with `coordinateStatus: missing`, never as real locations:

- Artvin / Kemalpaşa
- Hakkâri / Derecik

Compared with HGM centres, 12 official coordinates differ by more than 5 km and 4 differ by more than 25 km. The largest conflicts are concentrated in Hatay:

| District   |  Distance |
| ---------- | --------: |
| İskenderun | 38.518 km |
| Dörtyol    | 38.048 km |
| Hassa      | 32.818 km |
| Belen      | 32.467 km |

The reconciliation artifact retains these in `coordinateReviewQueue`; neither restricted source wins automatically. For the production district layer, eleven records are corroborated within 2 km by a second validation source. Sarıçam was the remaining conflict: the legacy point represented a same-named village, so the district layer uses OpenStreetMap relation 1249247's reviewed `admin_centre` node 958049062. HGM coordinates are not copied into the product while redistribution rights remain incompatible with the product license.

The published result is [`../data/admin/districts/tr.json`](../data/admin/districts/tr.json): 910 source-provided centres, 11 corroborated conflicts, 1 open-data correction, and 0 unresolved coordinate reviews.

## Entity and identity policy

Türkiye must be modelled as distinct entity grains:

1. province (`İL` / `BAŞKENT` centre metadata),
2. district (`İLÇE`, exactly 922 current records),
3. populated place / neighbourhood / village records.

The current 1,026 TR city rows mix these grains and must not be relabelled wholesale as districts. Production migration needs a separate stable CSC public ID, source identities for Interior Ministry/HGM/upstream records, and explicit aliases or successors for legacy city IDs.

## Reproduction

```bash
npm run data:sync:turkey-admin -- \
  --output data/sources/tr-admin-2026-08-05.json \
  --snapshot-date 2026-08-05

uv run --with pyshp==3.0.3 --with shapely==2.1.2 --with pyproj==3.7.2 \
  python analysis/reconcile_turkey_admin_centers.py \
  /path/to/turkiye-mulki-idare-sinirlari-2083.rar \
  data/sources/tr-admin-2026-08-05.json \
  --aliases analysis/turkey_admin_reviewed_aliases.json \
  --output analysis/turkey_admin_reconciliation_report.json

npm run test:turkey-admin
```
