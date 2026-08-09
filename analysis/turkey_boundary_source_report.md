# HGM Türkiye Mülki İdare Sınırları source audit

Audited: 2026-08-05

Linear: TAN-5524

Machine-readable result: [`turkey_boundary_source_audit.json`](turkey_boundary_source_audit.json)

Deterministic ETL candidate: [`turkey_boundary_etl_report.json`](turkey_boundary_etl_report.json)

## Decision

The desktop archive is byte-for-byte identical to the file currently served by Harita Genel Müdürlüğü (HGM):

- Product: <https://www.harita.gov.tr/urun/turkiye-mulki-idare-sinirlari/232>
- Official download: <https://www.harita.gov.tr/uploads/files/products/turkiye-mulki-idare-sinirlari-2083.rar>
- Announcement (2022-04-27): <https://www.harita.gov.tr/haber/ulkemize-ait-ulke-il-ve-ilce-sinirlari-ile-il-ve-ilce-yerlesim-noktalarini-iceren-vektor-veri-ile-il-ve-ilce-yuz-olcumleri-bilgisi-internet-sitemizde-ucretsiz-olarak-kullanima-sunulmustur/168>
- Size: 5,000,397 bytes
- SHA-256: `da8efe4dcbe47e5e8a8a34068e1e729832420634b519fab62303b86254471284`

HGM permits free non-commercial fair use and redistribution while retaining copyright and requiring HGM attribution. HGM also states that the country/province/district boundaries are indicative, display-only, derived from different sources, and not official administrative boundaries.

Do **not** bundle these geometries in the general-purpose NPM package, MCP server, hosted API, or another surface that permits commercial use unless HGM gives separate written commercial redistribution permission. The archive itself is not committed to this repository.

## CRS and conversion

The layers are not already EPSG:4326. Their `.prj` files define custom projected CRSs based on the WGS 84 datum and do not declare a direct EPSG authority code.

| Layers                                     | Source projection                                            | Core parameters                          | EPSG:4326 transformed extent           |
| ------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------- | -------------------------------------- |
| Province, district, country boundary lines | Albers Equal Area (`Albers_Sınır_2026`)                      | lon₀ 35°, standard parallels 36.5° / 41° | approx. 25.31–45.68° E, 34.32–42.18° N |
| Settlement centers                         | Lambert Conformal Conic 2SP (`Lambert_Conformal_Conic_TC1M`) | lon₀ 35°, standard parallels 35° / 41°   | approx. 25.90–44.57° E, 35.90–42.03° N |

Deterministic WGS84 conversion must use the embedded `.prj` WKT with `always_xy=true`; assuming raw coordinates are longitude/latitude would be incorrect.

## Layer schema

| Layer              | Geometry  |  Rows | Attributes                                          |
| ------------------ | --------- | ----: | --------------------------------------------------- |
| Province boundary  | Polyline  |   445 | `OBJECTID`, `Shape_Leng`, `Detay_Adi`               |
| District boundary  | Polyline  | 2,499 | `OBJECTID`, `Shape_Leng`, `Shape_Le_1`, `Detay_Adi` |
| Country boundary   | PolylineM |   155 | `OBJECTID`, `Shape_Leng`, `Detay_Adi`               |
| Settlement centers | Point     | 1,003 | `KATEGORI`, `Adı`                                   |

Boundary attributes contain only the generic categories `İL_SINIRI`, `İLÇE_SINIRI`, or `ÜLKE_SINIRI`; they contain no province/district name or official administrative code. Settlement centers contain 1 capital, 80 province centers, and 922 district centers. There are 978 distinct center names, so names alone are not globally unique.

## Topology audit

The audit checks actual geometry independently from DBF length attributes.

| Layer    | Non-simple lines | Exact duplicate geometry | Polygonized faces | Cut edges | Dangles |
| -------- | ---------------: | -----------------------: | ----------------: | --------: | ------: |
| Province |                0 |                        0 |               198 |         0 |      18 |
| District |                2 |       9 groups / 18 rows |               985 |         5 |     351 |
| Country  |                3 |                        0 |               130 |         1 |      31 |

Additional district findings:

- 2,499 rows use only 2,406 distinct `OBJECTID` values; 93 rows repeat an ID.
- `Shape_Leng` is zero in 152 DBF rows, but the actual Shapely geometry length is non-zero for every row. This is a stale/invalid attribute, not 152 empty lines.
- Raw polygonization returns 985 district faces rather than the required 922 districts, confirming slivers/extra faces.
- Province polygonization returns 198 faces rather than 81 provinces, so center labeling and topology repair are mandatory at both levels.
- No raw geometry is empty; no polygonized ring is reported invalid. This does not imply production readiness because dangles, cuts, duplicates, non-simple lines, unlabeled faces, and license scope remain unresolved.

## Controlled exceptions and next gate

The source archive is accepted only as an externally downloaded, checksum-pinned, non-commercial research input. TAN-5525 may use it to develop deterministic snapping, noding, polygonization, and point-in-polygon review tooling, but derived geometry must not be published through the product until both conditions are met:

1. HGM grants written rights compatible with the intended commercial/general-purpose distribution model, or a compatible alternative source is selected.
2. The ETL produces exactly 81 province and 922 district polygons with reviewed labels/codes, no overlap, documented sliver tolerance, and deterministic hashes.

## Deterministic ETL candidate

`build_turkey_boundary_candidate.py` now checksum-verifies and temporarily extracts the archive, converts settlement centres into the boundary working CRS with `always_xy=true`, precision-nodes the configured line layers, polygonizes them, and labels faces with point-in-polygon. Parameters are pinned in `turkey_boundary_etl_config.json`.

The reproducible candidate currently yields:

| Level    | Precision grid | Centres | Unique labelled faces | Unresolved collisions            |
| -------- | -------------: | ------: | --------------------: | -------------------------------- |
| Province |            1 m |      81 |                    81 | none                             |
| District |        0.006 m |     922 |                   920 | Karkamış–Birecik; İpekyolu–Tuşba |

All matched candidate faces are valid and have no positive-area overlap. The candidate remains intentionally non-publishable because two district faces are unresolved, reviewed official name/code metadata is not yet supplied, and HGM reuse terms are not compatible with the general-purpose commercial distribution model. Supplying `--output-geojson-dir` fails closed while any publication check is false.

## Reproduction

Install `pyshp==3.0.3`, `shapely==2.1.2`, and `pyproj==3.7.2`, then run:

```bash
python analysis/audit_turkey_boundary_source.py \
  /path/to/turkiye-mulki-idare-sinirlari-2083.rar \
  --output analysis/turkey_boundary_source_audit.json
```

Build the non-publishable topology candidate and review report:

```bash
uv run --with pyshp==3.0.3 --with shapely==2.1.2 --with pyproj==3.7.2 \
  python analysis/build_turkey_boundary_candidate.py \
  /path/to/turkiye-mulki-idare-sinirlari-2083.rar \
  --output-report analysis/turkey_boundary_etl_report.json

npm run test:turkey-boundaries
```

The script rejects any archive whose SHA-256 differs from the pinned official file and extracts it only into a temporary directory.
