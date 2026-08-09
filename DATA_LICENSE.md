# Data License and Attribution

The source code in this repository is licensed separately under the [MIT License](LICENSE).

The country, state, and city database in `data/`, its compact and sharded representations, and database exports produced by this project are a derivative database made available under the [Open Data Commons Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/).

## Required attribution

> Contains information from [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database), which is made available under the [Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/).

The Türkiye district layer also contains GeoNames ADM2 source identities and alternate names from [GeoNames](https://www.geonames.org/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changes made by this project include current-hierarchy filtering, legacy identity matching, suffix normalization, and reviewed aliases.

The Lakshadweep coordinate correction uses the GeoNames ADM2 record under CC BY 4.0. The reviewed Juan Fernández, Tain, and Sarupathar coordinate corrections use [Wikidata](https://www.wikidata.org/) entity revisions under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

The reproducible global country-placement audit uses [Natural Earth Admin 0 – Countries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/) 5.1.1, which Natural Earth makes available in the public domain. Natural Earth is a cartographic QA reference only; its default de-facto worldview is not adopted as this dataset's canonical political position.

The reviewed Sarıçam district centre correction, the pinned Türkiye boundary relation manifest, and the optional normalized Türkiye boundary layer contain information from [OpenStreetMap](https://www.openstreetmap.org/copyright), available under ODbL v1.0. © OpenStreetMap contributors. The boundary layer uses the documented `district-first-derived-coverage-v1` model and must retain this attribution and its derivative-geometry metadata when redistributed.

Keep this notice, the source link, and the ODbL URI with public copies or substantial extracts of the database. A publicly used derivative database may also trigger ODbL share-alike and machine-readable access obligations. See the license text for the controlling terms.

The original import did not record an exact upstream revision. That provenance gap is explicitly recorded rather than guessed. Corrections are verified against the pinned baseline in [`data/provenance.json`](data/provenance.json), and future sources without a URL, revision/date, and license are rejected by the data integrity check.

This notice documents the project's current compliance implementation; it is not legal advice. ODbL classification and distribution obligations should be reviewed by qualified counsel for the intended release model.
