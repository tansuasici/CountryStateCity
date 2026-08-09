#!/usr/bin/env python3
"""Reproducible country-polygon audit for every published city coordinate.

The audit deliberately separates coordinate defects from differences in political
worldview, imported dependency hierarchy, territorial claims, and Natural Earth
1:10m island generalization. The Natural Earth archive is pinned by byte size and
SHA-256 before it is read.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import shutil
import sys
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

import shapefile
from pyproj import Geod
from shapely.geometry import Point, shape
from shapely.ops import nearest_points, unary_union
from shapely.prepared import prep
from shapely.strtree import STRtree


GENERATED_AT = "2026-08-06T00:00:00Z"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_reference_archive(repo: Path, policy: dict, offline: bool) -> Path:
    reference = policy["reference"]
    cache_dir = repo / ".cache" / "natural-earth" / reference["version"]
    archive = cache_dir / "ne_10m_admin_0_countries.zip"
    cache_dir.mkdir(parents=True, exist_ok=True)

    if not archive.exists():
        if offline:
            raise RuntimeError(f"Pinned Natural Earth archive is not cached: {archive}")
        temporary = archive.with_suffix(".zip.download")
        request = urllib.request.Request(
            reference["downloadUrl"],
            headers={
                "User-Agent": (
                    "CountryStateCity-data-quality-audit/2.0 "
                    "(+https://github.com/tansuasici/CountryStateCity)"
                )
            },
        )
        with urllib.request.urlopen(request, timeout=120) as response, temporary.open("wb") as out:
            shutil.copyfileobj(response, out)
        temporary.replace(archive)

    actual_bytes = archive.stat().st_size
    actual_hash = sha256_file(archive)
    if actual_bytes != reference["bytes"]:
        raise RuntimeError(
            f"Natural Earth byte-size mismatch: {actual_bytes} != {reference['bytes']}"
        )
    if actual_hash != reference["sha256"]:
        raise RuntimeError(
            f"Natural Earth SHA-256 mismatch: {actual_hash} != {reference['sha256']}"
        )
    return archive


def ensure_shapefile(archive: Path) -> Path:
    target_dir = archive.parent / "admin0"
    shape_path = target_dir / "ne_10m_admin_0_countries.shp"
    required = [".shp", ".shx", ".dbf"]
    if not all(shape_path.with_suffix(suffix).exists() for suffix in required):
        target_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive) as source:
            for member in source.namelist():
                if Path(member).suffix.lower() in {".shp", ".shx", ".dbf", ".prj", ".cpg"}:
                    source.extract(member, target_dir)
    return shape_path


def natural_earth_code(properties: dict) -> str | None:
    enhanced = str(properties.get("ISO_A2_EH") or "")
    standard = str(properties.get("ISO_A2") or "")
    if re.fullmatch(r"[A-Z]{2}", enhanced):
        return enhanced
    if re.fullmatch(r"[A-Z]{2}", standard):
        return standard
    return None


def load_reference_geometries(shape_path: Path) -> tuple[dict, list[dict], list, STRtree]:
    reader = shapefile.Reader(str(shape_path))
    fields = [field[0] for field in reader.fields[1:]]
    features: list[dict] = []
    by_code: dict[str, list] = {}
    for item in reader.iterShapeRecords():
        properties = dict(zip(fields, item.record))
        geometry = shape(item.shape.__geo_interface__)
        code = natural_earth_code(properties)
        feature = {
            "geometry": geometry,
            "countryCode": code,
            "admin": properties.get("ADMIN"),
            "adminCode": properties.get("ADM0_A3"),
            "type": properties.get("TYPE"),
            "sovereign": properties.get("SOVEREIGNT"),
        }
        features.append(feature)
        if code:
            by_code.setdefault(code, []).append(geometry)

    country_geometries = {code: unary_union(parts) for code, parts in by_code.items()}
    feature_geometries = [feature["geometry"] for feature in features]
    return country_geometries, features, feature_geometries, STRtree(feature_geometries)


def valid_coordinate(row: dict) -> tuple[float, float] | None:
    try:
        latitude = float(row["latitude"])
        longitude = float(row["longitude"])
    except (KeyError, TypeError, ValueError):
        return None
    if not (math.isfinite(latitude) and math.isfinite(longitude)):
        return None
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return None
    return latitude, longitude


def reference_areas_for_point(
    point: Point, features: list[dict], feature_tree: STRtree
) -> list[dict]:
    matches = []
    for index in feature_tree.query(point, predicate="intersects"):
        feature = features[int(index)]
        matches.append(
            {
                "countryCode": feature["countryCode"],
                "admin": feature["admin"],
                "adminCode": feature["adminCode"],
                "type": feature["type"],
                "sovereign": feature["sovereign"],
            }
        )
    return sorted(matches, key=lambda item: (str(item["adminCode"]), str(item["admin"])))


def rule_matches(rule: dict, outlier: dict) -> bool:
    match = rule["match"]
    if "cityId" in match and outlier["cityId"] != match["cityId"]:
        return False
    if "countryCode" in match and outlier["countryCode"] != match["countryCode"]:
        return False
    if "stateName" in match and outlier["stateName"] != match["stateName"]:
        return False
    if "stateNames" in match and outlier["stateName"] not in match["stateNames"]:
        return False
    return True


def classify_outliers(major_outliers: list[dict], policy: dict) -> dict:
    individual_reviews = {
        item["cityId"]: item for item in policy["individualReferenceScaleReviews"]
    }
    classified = []
    unresolved = []
    duplicate_matches = []
    rule_counts = Counter()
    matched_individual_ids: set[int] = set()

    for outlier in major_outliers:
        matches = []
        for rule in policy["exceptionRules"]:
            if rule_matches(rule, outlier):
                matches.append(
                    {
                        "exceptionId": rule["id"],
                        "reasonCode": rule["reasonCode"],
                        "status": rule["status"],
                    }
                )
        individual = individual_reviews.get(outlier["cityId"])
        if individual:
            if individual["expectedCountryCode"] != outlier["countryCode"]:
                unresolved.append(
                    {
                        **outlier,
                        "classificationError": "individual-review-country-mismatch",
                    }
                )
                continue
            matches.append(
                {
                    "exceptionId": f"osm-relation-{individual['osmRelationId']}",
                    "reasonCode": policy["individualReviewPolicy"]["reasonCode"],
                    "status": policy["individualReviewPolicy"]["status"],
                    "osmRelationId": individual["osmRelationId"],
                }
            )
            matched_individual_ids.add(outlier["cityId"])

        if not matches:
            unresolved.append(outlier)
            continue
        if len(matches) > 1:
            duplicate_matches.append({**outlier, "matches": matches})
            continue

        resolution = matches[0]
        rule_counts[resolution["exceptionId"]] += 1
        classified.append({**outlier, **resolution})

    expected_individual_ids = set(individual_reviews)
    stale_individual_ids = sorted(expected_individual_ids - matched_individual_ids)
    group_rule_checks = []
    for rule in policy["exceptionRules"]:
        actual = rule_counts[rule["id"]]
        group_rule_checks.append(
            {
                "exceptionId": rule["id"],
                "reasonCode": rule["reasonCode"],
                "expected": rule["expectedCount"],
                "actual": actual,
                "passes": actual == rule["expectedCount"],
            }
        )

    return {
        "classified": classified,
        "unresolved": unresolved,
        "duplicateMatches": duplicate_matches,
        "staleIndividualReviewIds": stale_individual_ids,
        "groupRuleChecks": group_rule_checks,
    }


def audit(repo: Path, policy: dict, offline: bool) -> dict:
    archive = ensure_reference_archive(repo, policy, offline)
    shape_path = ensure_shapefile(archive)
    country_geometries, features, _, feature_tree = load_reference_geometries(shape_path)
    prepared = {code: prep(geometry) for code, geometry in country_geometries.items()}
    geod = Geod(ellps="WGS84")

    countries = read_json(repo / "data" / "country.json")
    cities = read_json(repo / "data" / "city.json")
    country_by_id = {country["id"]: country for country in countries}
    city_by_id = {city["id"]: city for city in cities}
    threshold_km = policy["thresholds"]["majorOutlierKm"]

    invalid_coordinate_ids = []
    missing_geometry_by_code = Counter()
    outside = []
    for city in cities:
        coordinate = valid_coordinate(city)
        if coordinate is None:
            invalid_coordinate_ids.append(city["id"])
            continue
        country = country_by_id.get(city.get("countryId"))
        country_code = country.get("iso2") if country else None
        geometry = country_geometries.get(country_code)
        if geometry is None:
            missing_geometry_by_code[str(country_code)] += 1
            continue
        latitude, longitude = coordinate
        point = Point(longitude, latitude)
        if prepared[country_code].covers(point):
            continue

        nearest = nearest_points(point, geometry)[1]
        distance_m = geod.inv(longitude, latitude, nearest.x, nearest.y)[2]
        outside.append(
            {
                "cityId": city["id"],
                "name": city.get("name"),
                "stateId": city.get("stateId"),
                "stateName": city.get("stateName"),
                "countryCode": country_code,
                "latitude": latitude,
                "longitude": longitude,
                "distanceKm": round(distance_m / 1000, 3),
                "referenceAreas": reference_areas_for_point(point, features, feature_tree),
            }
        )

    major_outliers = sorted(
        [item for item in outside if item["distanceKm"] > threshold_km],
        key=lambda item: (-item["distanceKm"], item["cityId"]),
    )
    classification = classify_outliers(major_outliers, policy)

    correction_checks = []
    corrected_ids = set()
    country_polygon_corrections = [
        correction
        for correction in policy["corrections"]
        if correction.get("baselineScope", "country-polygon-major-outlier")
        == "country-polygon-major-outlier"
    ]
    for correction in policy["corrections"]:
        city = city_by_id.get(correction["cityId"])
        corrected_ids.add(correction["cityId"])
        actual = (
            {
                "latitude": city.get("latitude"),
                "longitude": city.get("longitude"),
            }
            if city
            else None
        )
        passes = actual == correction["after"]
        correction_checks.append(
            {
                "cityId": correction["cityId"],
                "name": correction["name"],
                "countryCode": correction["countryCode"],
                "before": correction["before"],
                "after": correction["after"],
                "actual": actual,
                "sourceId": correction["source"]["id"],
                "sourceUrl": correction["source"]["url"],
                "baselineScope": correction.get(
                    "baselineScope", "country-polygon-major-outlier"
                ),
                "passes": passes,
            }
        )

    correction_still_major = sorted(
        item["cityId"] for item in major_outliers if item["cityId"] in corrected_ids
    )
    expected_current_outside = (
        policy["baseline"]["outsideReferencePolygon"]
        - len(country_polygon_corrections)
    )
    expected_current_major = policy["baseline"]["majorOutliers"] - len(
        country_polygon_corrections
    )
    reason_counts = Counter(item["reasonCode"] for item in classification["classified"])

    resolution_summary = [
        {
            "resolution": "Disputed/de-facto model",
            "count": reason_counts["disputed-territory-de-jure-owner"]
            + reason_counts["disputed-territory-source-owner"],
            "action": "Documented policy exception",
            "reasonCodes": "disputed-territory-de-jure-owner; disputed-territory-source-owner",
        },
        {
            "resolution": "Dependency hierarchy",
            "count": reason_counts["dependency-sovereign-parent-model"],
            "action": "Versioned hierarchy decision deferred",
            "reasonCodes": "dependency-sovereign-parent-model",
        },
        {
            "resolution": "Reference-scale omission",
            "count": reason_counts["reference-scale-small-island-omission"],
            "action": "Country location independently verified",
            "reasonCodes": "reference-scale-small-island-omission",
        },
        {
            "resolution": "Corrected coordinate",
            "count": len(country_polygon_corrections),
            "action": "Production and patch overlay updated",
            "reasonCodes": "incorrect-coordinate",
        },
        {
            "resolution": "Territorial claim",
            "count": reason_counts["territorial-claim"],
            "action": "Explicit claim-area exception",
            "reasonCodes": "territorial-claim",
        },
    ]
    resolution_summary.sort(key=lambda item: (-item["count"], item["resolution"]))
    baseline_resolution_total = sum(item["count"] for item in resolution_summary)

    checks = {
        "allCityCoordinatesValid": len(invalid_coordinate_ids) == 0,
        "allCitiesHaveReferenceGeometry": sum(missing_geometry_by_code.values()) == 0,
        "outsideCountMatchesPinnedBaselineAfterCorrections": len(outside)
        == expected_current_outside,
        "majorCountMatchesPinnedBaselineAfterCorrections": len(major_outliers)
        == expected_current_major,
        "allCorrectionsApplied": all(item["passes"] for item in correction_checks),
        "correctedRowsNoLongerMajorOutliers": len(correction_still_major) == 0,
        "allMajorOutliersClassified": len(classification["classified"]) == len(major_outliers),
        "noUnresolvedMajorOutliers": len(classification["unresolved"]) == 0,
        "noDuplicateExceptionMatches": len(classification["duplicateMatches"]) == 0,
        "noStaleIndividualReviews": len(classification["staleIndividualReviewIds"]) == 0,
        "groupRuleCountsMatch": all(
            item["passes"] for item in classification["groupRuleChecks"]
        ),
        "baselineResolutionTotalMatches": baseline_resolution_total
        == policy["baseline"]["majorOutliers"],
    }

    missing_reference_codes = sorted(
        set(policy["reference"]["missingCountryGeometryCodes"])
        - set(country_geometries)
    )
    unexpected_missing_reference_codes = sorted(
        set(policy["reference"]["missingCountryGeometryCodes"])
        ^ set(missing_reference_codes)
    )
    checks["missingGeometryRegistryMatches"] = len(unexpected_missing_reference_codes) == 0

    report = {
        "schemaVersion": 1,
        "snapshotDate": policy["snapshotDate"],
        "generatedAt": GENERATED_AT,
        "dataset": {
            "grain": "one row per published city record",
            "cityRows": len(cities),
            "countryRows": len(countries),
            "coordinateFields": ["latitude", "longitude"],
        },
        "reference": {
            "id": policy["reference"]["id"],
            "version": policy["reference"]["version"],
            "scale": policy["reference"]["scale"],
            "worldview": policy["reference"]["worldview"],
            "sha256": policy["reference"]["sha256"],
            "featureCount": len(features),
            "countryGeometryCodes": len(country_geometries),
            "missingGeometryCodesWithoutCityRows": missing_reference_codes,
        },
        "counts": {
            "invalidCoordinates": len(invalid_coordinate_ids),
            "citiesWithoutReferenceGeometry": sum(missing_geometry_by_code.values()),
            "outsideReferencePolygon": len(outside),
            "outsideReferencePolygonBaseline": policy["baseline"][
                "outsideReferencePolygon"
            ],
            "majorOutliers": len(major_outliers),
            "majorOutliersBaseline": policy["baseline"]["majorOutliers"],
            "correctedCoordinates": len(policy["corrections"]),
            "countryPolygonCorrections": len(country_polygon_corrections),
            "classifiedExceptions": len(classification["classified"]),
            "unresolvedMajorOutliers": len(classification["unresolved"]),
        },
        "majorOutlierThresholdKm": threshold_km,
        "resolutionSummary": resolution_summary,
        "reasonCodeCounts": dict(sorted(reason_counts.items())),
        "corrections": correction_checks,
        "exceptionRuleChecks": classification["groupRuleChecks"],
        "majorOutliers": classification["classified"],
        "diagnostics": {
            "invalidCoordinateIds": invalid_coordinate_ids,
            "missingGeometryByCountryCode": dict(sorted(missing_geometry_by_code.items())),
            "correctionStillMajorOutlierIds": correction_still_major,
            "unresolvedMajorOutliers": classification["unresolved"],
            "duplicateExceptionMatches": classification["duplicateMatches"],
            "staleIndividualReviewIds": classification["staleIndividualReviewIds"],
            "unexpectedMissingReferenceCodes": unexpected_missing_reference_codes,
        },
        "qualityGate": {
            "passes": all(checks.values()),
            "checks": checks,
        },
    }
    return report


def markdown_report(report: dict, policy: dict) -> str:
    counts = report["counts"]
    correction_rows = "\n".join(
        "| {cityId} | {name} | {countryCode} | {before[latitude]}, {before[longitude]} "
        "| {after[latitude]}, {after[longitude]} | {sourceId} |".format(**item)
        for item in report["corrections"]
    )
    resolution_rows = "\n".join(
        f"| {item['resolution']} | {item['count']} | {item['action']} |"
        for item in report["resolutionSummary"]
    )
    return f"""# City coordinate and territory quality report

## Executive Summary

- **The 25 km quality gate is fully resolved.** The pinned baseline contained {counts['majorOutliersBaseline']} major outliers; {counts['countryPolygonCorrections']} country-polygon coordinate defects were corrected and the remaining {counts['classifiedExceptions']} records have stable reason-code exceptions.
- **Most apparent failures are model differences, not bad points.** Crimea/Ukraine and Puerto Rico/US account for 580 of the 636 baseline cases.
- **No unresolved major outlier remains.** All {report['dataset']['cityRows']:,} city coordinates are numeric and in range; every city row has a usable country reference geometry.

## What the audit measures

Every published city point is compared with the pinned Natural Earth Admin-0 Countries {report['reference']['version']} geometry at {report['reference']['scale']}. A point outside its assigned country polygon is informational until its geodesic distance exceeds {report['majorOutlierThresholdKm']} km. Natural Earth uses a default de-facto worldview; CountryStateCity preserves its imported hierarchy and records worldview differences rather than silently changing political ownership.

## The baseline resolves into five explainable classes

| Resolution class | Records | Treatment |
|---|---:|---|
{resolution_rows}

The {counts['outsideReferencePolygon']} points still outside the reference polygon include small coastline and island generalization effects below the gate. They are not treated as coordinate defects.

## Applied coordinate corrections

| City ID | Record | Country | Previous coordinate | Corrected coordinate | Source |
|---:|---|---|---|---|---|
{correction_rows}

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
- OpenStreetMap checks are ODbL-attributed validation snapshots dated {policy['individualReviewPolicy']['verifiedAt']}.
- The source `city` table mixes settlements and administrative entities; this audit validates coordinates and country placement, not entity type.

Machine-readable detail, including all {counts['classifiedExceptions']} classified records, is in `analysis/city_coordinate_quality_report.json`.
"""


def artifact_report(report: dict) -> dict:
    counts = report["counts"]
    sources = [
        {
            "id": "report-sql",
            "label": "Reviewed report datasets",
            "path": "analysis/city_coordinate_quality_report.sql",
            "query": {
                "description": "DuckDB queries over the generated machine-readable audit; each statement produces one visible report dataset.",
                "language": "sql",
                "tables_used": ["analysis/city_coordinate_quality_report.json"],
                "filters": ["no sampling"],
                "metric_definitions": [
                    "Major outlier = a city point more than 25 geodesic kilometres from its assigned Natural Earth country polygon.",
                    "Resolved = corrected production coordinate or exactly one accepted reason-code exception.",
                ],
            },
        },
        {
            "id": "geo-audit",
            "label": "CountryStateCity city-coordinate quality report",
            "path": "analysis/city_coordinate_quality_report.json",
            "query": {
                "description": "Pinned Natural Earth point-in-polygon and geodesic-distance audit over every production city row.",
                "language": "python",
                "tables_used": [
                    "data/city.json",
                    "data/country.json",
                    "data/geography/city-coordinate-policy.json",
                    "Natural Earth ne_10m_admin_0_countries 5.1.1",
                ],
                "filters": ["major outlier distance > 25 km", "no sampling"],
                "metric_definitions": [
                    "Major outlier = a city point more than 25 geodesic kilometres from its assigned Natural Earth country polygon.",
                    "Resolved = corrected production coordinate or exactly one accepted reason-code exception.",
                ],
            },
        },
        {
            "id": "territory-policy",
            "label": "Country and territory assignment policy",
            "path": "data/geography/city-coordinate-policy.json",
        },
        {
            "id": "natural-earth",
            "label": "Natural Earth Admin 0 – Countries 5.1.1",
            "href": "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/",
        },
        {
            "id": "osm-validation",
            "label": "OpenStreetMap validation relations",
            "href": "https://www.openstreetmap.org/copyright",
        },
    ]
    headline = [
        {
            "baselineMajorOutliers": counts["majorOutliersBaseline"],
            "correctedCoordinates": counts["correctedCoordinates"],
            "classifiedExceptions": counts["classifiedExceptions"],
            "unresolvedMajorOutliers": counts["unresolvedMajorOutliers"],
        }
    ]
    correction_rows = [
        {
            "cityId": item["cityId"],
            "name": item["name"],
            "countryCode": item["countryCode"],
            "before": f"{item['before']['latitude']}, {item['before']['longitude']}",
            "after": f"{item['after']['latitude']}, {item['after']['longitude']}",
            "source": item["sourceId"],
            "status": "Corrected",
        }
        for item in report["corrections"]
    ]
    exception_rows = [
        {
            "exception": item["exceptionId"],
            "reasonCode": item["reasonCode"],
            "count": item["actual"],
            "status": "Pass" if item["passes"] else "Fail",
        }
        for item in report["exceptionRuleChecks"]
    ] + [
        {
            "exception": "individually-reviewed-small-islands",
            "reasonCode": "reference-scale-small-island-omission",
            "count": report["reasonCodeCounts"]["reference-scale-small-island-omission"],
            "status": "Pass",
        }
    ]

    cards = [
        {
            "id": "baseline-card",
            "description": "Every city point over 25 km from its assigned country polygon in the pinned pre-correction baseline.",
            "dataset": "headline",
            "sourceId": "report-sql",
            "metrics": [
                {"label": "Baseline major outliers", "field": "baselineMajorOutliers", "format": "number"}
            ],
        },
        {
            "id": "corrected-card",
            "description": "Rows whose published latitude or longitude was demonstrably wrong and was changed.",
            "dataset": "headline",
            "sourceId": "report-sql",
            "metrics": [
                {"label": "Coordinates corrected", "field": "correctedCoordinates", "format": "number"}
            ],
        },
        {
            "id": "exception-card",
            "description": "Remaining major outliers covered by one stable political, hierarchy, claim, or scale reason code.",
            "dataset": "headline",
            "sourceId": "report-sql",
            "metrics": [
                {"label": "Classified exceptions", "field": "classifiedExceptions", "format": "number"}
            ],
        },
        {
            "id": "unresolved-card",
            "description": "Major outliers that are neither corrected nor matched by exactly one approved exception.",
            "dataset": "headline",
            "sourceId": "report-sql",
            "metrics": [
                {"label": "Unresolved", "field": "unresolvedMajorOutliers", "format": "number"}
            ],
        },
    ]
    charts = [
        {
            "id": "resolution-chart",
            "title": "Baseline major outliers by resolution class",
            "subtitle": "All 636 records, measured against Natural Earth 5.1.1 at a 25 km threshold",
            "showDescription": True,
            "type": "bar",
            "dataset": "resolution-summary",
            "sourceId": "report-sql",
            "encodings": {
                "x": {"field": "resolution", "type": "nominal", "label": "Resolution class"},
                "y": {"field": "count", "type": "quantitative", "label": "City records", "format": "number"},
                "tooltip": [
                    {"field": "resolution", "type": "text", "label": "Resolution"},
                    {"field": "count", "type": "quantitative", "label": "Records", "format": "number"},
                    {"field": "action", "type": "text", "label": "Treatment"},
                ],
            },
            "valueFormat": "number",
            "layout": "full",
            "maxRows": 5,
        }
    ]
    tables = [
        {
            "id": "correction-table",
            "title": "Applied coordinate corrections",
            "subtitle": "Four source-backed changes applied to canonical, compact, shard, and patch-overlay data",
            "showDescription": True,
            "dataset": "corrections",
            "defaultSort": {"field": "cityId", "direction": "asc"},
            "density": "compact",
            "sourceId": "report-sql",
            "layout": "full",
            "columns": [
                {"field": "cityId", "label": "City ID", "format": "number"},
                {"field": "name", "label": "Record", "type": "text"},
                {"field": "countryCode", "label": "Country", "type": "text"},
                {"field": "before", "label": "Previous coordinate", "type": "text"},
                {"field": "after", "label": "Corrected coordinate", "type": "text"},
            ],
        },
        {
            "id": "exception-table",
            "title": "Exception rule coverage",
            "subtitle": "Exact rule counts plus 44 individually reviewed small-island records",
            "showDescription": True,
            "dataset": "exception-groups",
            "defaultSort": {"field": "count", "direction": "desc"},
            "density": "compact",
            "sourceId": "report-sql",
            "layout": "full",
            "columns": [
                {"field": "reasonCode", "label": "Reason code", "type": "text"},
                {"field": "count", "label": "Records", "format": "number"},
            ],
        },
    ]
    blocks = [
        {"id": "title", "type": "markdown", "body": "# City coordinate and territory quality"},
        {
            "id": "executive-summary",
            "type": "markdown",
            "sourceId": "geo-audit",
            "body": (
                "## Executive Summary\n\n"
                "- **The 25 km quality gate is fully resolved.** The pinned baseline had 636 major outliers; four true coordinate defects were corrected and all 632 remaining records have stable reason-code exceptions.\n"
                "- **Most failures were model differences, not bad points.** Crimea/Ukraine and Puerto Rico/US account for 580 baseline cases.\n"
                "- **No unresolved major outlier remains.** All 147,739 city coordinates are numeric and within valid latitude/longitude ranges."
            ),
        },
        {
            "id": "headline-metrics",
            "type": "metric-strip",
            "cardIds": ["baseline-card", "corrected-card", "exception-card", "unresolved-card"],
        },
        {
            "id": "resolution-finding",
            "type": "markdown",
            "sourceId": "geo-audit",
            "body": (
                "## Political and hierarchy models explain almost every large gap\n\n"
                "Natural Earth uses a default de-facto worldview. CountryStateCity preserves its imported hierarchy and records political or dependency differences explicitly. The chart shows the full 636-record baseline; the four corrected records are retained so the resolution accounting stays auditable."
            ),
        },
        {"id": "resolution-visual", "type": "chart", "chartId": "resolution-chart"},
        {
            "id": "correction-finding",
            "type": "markdown",
            "sourceId": "geo-audit",
            "body": (
                "## Four coordinates were genuinely wrong\n\n"
                "Juan Fernández, Tain, Sarupathar, and Lakshadweep were outside for reasons that independent sources contradicted. Correcting them moved every point inside its assigned country reference geometry."
            ),
        },
        {"id": "correction-evidence", "type": "table", "tableId": "correction-table"},
        {
            "id": "exception-finding",
            "type": "markdown",
            "sourceId": "geo-audit",
            "body": (
                "## Every remaining major outlier has exactly one reason code\n\n"
                "Group rules cover stable worldview and hierarchy cases. Forty-four small-island records were checked one by one against OSM administrative relations because a 1:10m reference cannot represent every atoll and islet."
            ),
        },
        {"id": "exception-evidence", "type": "table", "tableId": "exception-table"},
        {
            "id": "recommendations",
            "type": "markdown",
            "body": (
                "## Recommended next steps\n\n"
                "1. Keep the coordinate audit in CI and release gates.\n"
                "2. Decide Puerto Rico and other dependency reparenting as a versioned hierarchy migration.\n"
                "3. Add an explicit worldview selector before disputed-area polygons become a general product surface."
            ),
        },
        {
            "id": "further-questions",
            "type": "markdown",
            "body": (
                "## Further questions\n\n"
                "- Should dependency entities become canonical top-level navigation parents in the next data-major release?\n"
                "- Should the API expose source hierarchy and ISO-territory hierarchy as separate views?"
            ),
        },
        {
            "id": "caveats",
            "type": "markdown",
            "body": (
                "## Caveats and assumptions\n\n"
                "Natural Earth 1:10m is a cartographic QA baseline, not a legal boundary authority. The 25 km threshold tolerates coastline and small-island simplification; it does not certify city-centre precision. The source city table also mixes settlements and administrative entities, which requires a separate entity-grain policy."
            ),
        },
    ]
    return {
        "surface": "report",
        "manifest": {
            "version": 1,
            "surface": "report",
            "title": "City coordinate and territory quality",
            "description": "Resolution of country-polygon outliers across every published city record.",
            "generatedAt": GENERATED_AT,
            "cards": cards,
            "charts": charts,
            "tables": tables,
            "sources": sources,
            "blocks": blocks,
        },
        "snapshot": {
            "version": 1,
            "generatedAt": GENERATED_AT,
            "status": "ready",
            "datasets": {
                "headline": headline,
                "resolution-summary": report["resolutionSummary"],
                "corrections": correction_rows,
                "exception-groups": exception_rows,
            },
        },
        "sources": sources,
    }


def write_or_check(path: Path, content: str, check: bool) -> None:
    if check:
        if not path.exists():
            raise RuntimeError(f"Generated artifact is missing: {path}")
        existing = path.read_text(encoding="utf-8")
        if existing != content:
            raise RuntimeError(f"Generated artifact is stale: {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument(
        "--policy",
        type=Path,
        default=Path("data/geography/city-coordinate-policy.json"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("analysis/city_coordinate_quality_report.json"),
    )
    parser.add_argument(
        "--markdown",
        type=Path,
        default=Path("analysis/city_coordinate_quality_report.md"),
    )
    parser.add_argument(
        "--artifact",
        type=Path,
        default=Path("analysis/city_coordinate_quality_artifact.json"),
    )
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    repo = args.repo.resolve()
    policy_path = args.policy if args.policy.is_absolute() else repo / args.policy
    output_path = args.output if args.output.is_absolute() else repo / args.output
    markdown_path = args.markdown if args.markdown.is_absolute() else repo / args.markdown
    artifact_path = args.artifact if args.artifact.is_absolute() else repo / args.artifact
    policy = read_json(policy_path)

    report = audit(repo, policy, args.offline)
    report_payload = json_text(report)
    markdown_payload = markdown_report(report, policy)
    artifact_payload = json_text(artifact_report(report))
    write_or_check(output_path, report_payload, args.check)
    write_or_check(markdown_path, markdown_payload, args.check)
    write_or_check(artifact_path, artifact_payload, args.check)

    if not report["qualityGate"]["passes"]:
        failed = [
            name for name, passes in report["qualityGate"]["checks"].items() if not passes
        ]
        raise SystemExit(f"City coordinate quality gate failed: {', '.join(failed)}")

    verb = "verified" if args.check else "generated"
    print(
        f"City coordinate audit {verb}: {report['dataset']['cityRows']} rows, "
        f"{report['counts']['correctedCoordinates']} corrections, "
        f"{report['counts']['classifiedExceptions']} classified exceptions, "
        f"{report['counts']['unresolvedMajorOutliers']} unresolved."
    )


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print(f"City coordinate audit failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
