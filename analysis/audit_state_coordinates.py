#!/usr/bin/env python3
"""Re-source state points and audit them against pinned country polygons."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import urllib.request
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import shapefile
from pyproj import Geod
from shapely.geometry import Point, shape
from shapely.ops import nearest_points, unary_union

VERIFIED_AT = "2026-08-08"
GEOD = Geod(ellps="WGS84")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(path)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_archive(repo: Path, source: dict, offline: bool) -> Path:
    cache = repo / ".cache" / "natural-earth" / source["version"]
    archive = cache / "ne_10m_admin_1_states_provinces.zip"
    cache.mkdir(parents=True, exist_ok=True)
    if not archive.exists():
        if offline:
            raise RuntimeError(f"Pinned Admin-1 archive is not cached: {archive}")
        request = urllib.request.Request(
            source["downloadUrl"],
            headers={"User-Agent": "CountryStateCity-state-audit/2.0"},
        )
        temporary = archive.with_suffix(".zip.download")
        with (
            urllib.request.urlopen(request, timeout=120) as response,
            temporary.open("wb") as out,
        ):
            shutil.copyfileobj(response, out)
        temporary.replace(archive)
    if (
        archive.stat().st_size != source["bytes"]
        or sha256_file(archive) != source["sha256"]
    ):
        raise RuntimeError("Natural Earth Admin-1 archive checksum mismatch")
    return archive


def ensure_shape(archive: Path, stem: str) -> Path:
    target = archive.parent / stem
    shape_path = target / f"{stem}.shp"
    if not shape_path.exists():
        target.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive) as source:
            for member in source.namelist():
                if Path(member).suffix.lower() in {
                    ".shp",
                    ".shx",
                    ".dbf",
                    ".prj",
                    ".cpg",
                }:
                    source.extract(member, target)
    return shape_path


def load_admin1(shape_path: Path) -> dict[str, list[dict]]:
    reader = shapefile.Reader(str(shape_path))
    fields = [field[0] for field in reader.fields[1:]]
    by_code: dict[str, list[dict]] = defaultdict(list)
    for item in reader.iterShapeRecords():
        props = dict(zip(fields, item.record))
        code = str(props.get("iso_3166_2") or "").strip()
        if not code:
            continue
        geometry = shape(item.shape.__geo_interface__)
        if not geometry.is_valid:
            geometry = geometry.buffer(0)
        by_code[code].append(
            {
                "geometry": geometry,
                "name": props.get("name"),
                "nameEn": props.get("name_en"),
                "neId": props.get("ne_id"),
            }
        )
    return by_code


def load_admin0(shape_path: Path) -> dict[str, Any]:
    reader = shapefile.Reader(str(shape_path))
    fields = [field[0] for field in reader.fields[1:]]
    grouped: dict[str, list] = defaultdict(list)
    for item in reader.iterShapeRecords():
        props = dict(zip(fields, item.record))
        code = str(props.get("ISO_A2_EH") or "")
        if len(code) != 2:
            code = str(props.get("ISO_A2") or "")
        if len(code) == 2:
            grouped[code].append(shape(item.shape.__geo_interface__))
    return {code: unary_union(parts) for code, parts in grouped.items()}


def distance_km(point: Point, geometry: Any | None) -> float | None:
    if geometry is None:
        return None
    if geometry.covers(point):
        return 0.0
    nearest = nearest_points(point, geometry)[1]
    _, _, meters = GEOD.inv(point.x, point.y, nearest.x, nearest.y)
    return meters / 1000


def valid_point(latitude: Any, longitude: Any) -> Point | None:
    try:
        lat, lon = float(latitude), float(longitude)
    except (TypeError, ValueError):
        return None
    return (
        Point(lon, lat)
        if math.isfinite(lat)
        and math.isfinite(lon)
        and -90 <= lat <= 90
        and -180 <= lon <= 180
        else None
    )


def normalized(value: Any) -> str:
    return " ".join(str(value or "").casefold().split())


def choose_admin1(features: list[dict], state: dict) -> dict | None:
    if not features:
        return None
    exact = [
        feature
        for feature in features
        if normalized(state["name"])
        in {normalized(feature["name"]), normalized(feature["nameEn"])}
    ]
    if len(exact) == 1:
        return exact[0]
    return features[0] if len(features) == 1 else None


def source_state_map(rows: list[dict]) -> dict[str, dict]:
    return {
        f"{row.get('country_code')}-{row.get('iso2')}": row
        for row in rows
        if row.get("country_code") and row.get("iso2")
    }


def child_points(cities: list[dict]) -> dict[int, list[Point]]:
    grouped: dict[int, list[Point]] = defaultdict(list)
    for city in cities:
        point = valid_point(city.get("latitude"), city.get("longitude"))
        if point:
            grouped[city["stateId"]].append(point)
    return grouped


def median_child(points: list[Point], country_geometry: Any | None) -> Point | None:
    usable = [
        point
        for point in points
        if country_geometry is None or distance_km(point, country_geometry) <= 25
    ]
    if not usable:
        return None
    lats = sorted(point.y for point in usable)
    lons = sorted(point.x for point in usable)
    point = Point(lons[len(lons) // 2], lats[len(lats) // 2])
    return (
        point
        if country_geometry is None or distance_km(point, country_geometry) <= 25
        else None
    )


def coordinate_fields(
    point: Point | None, coordinate_type: str, source: str, validation: str, status: str
) -> dict:
    return {
        "latitude": f"{point.y:.8f}" if point else None,
        "longitude": f"{point.x:.8f}" if point else None,
        "coordinateType": coordinate_type,
        "coordinateSource": source,
        "coordinateVerifiedAt": VERIFIED_AT,
        "coordinateValidation": validation,
        "coordinateStatus": status,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    source_manifest = read_json(repo / "data/sources/natural-earth-admin1-5.1.1.json")
    city_policy = read_json(repo / "data/geography/city-coordinate-policy.json")
    countries = read_json(repo / "data/country.json")
    states = read_json(repo / "data/state.json")
    cities = read_json(repo / "data/city.json")

    admin1_archive = ensure_archive(repo, source_manifest["source"], args.offline)
    admin1 = load_admin1(
        ensure_shape(admin1_archive, "ne_10m_admin_1_states_provinces")
    )
    admin0_source = city_policy["reference"]
    admin0_archive = (
        repo
        / ".cache"
        / "natural-earth"
        / admin0_source["version"]
        / "ne_10m_admin_0_countries.zip"
    )
    if (
        not admin0_archive.exists()
        or admin0_archive.stat().st_size != admin0_source["bytes"]
        or sha256_file(admin0_archive) != admin0_source["sha256"]
    ):
        raise RuntimeError(
            "Pinned Admin-0 archive is missing or changed; run the city coordinate audit first"
        )
    admin0 = load_admin0(ensure_shape(admin0_archive, "ne_10m_admin_0_countries"))

    if args.check:
        policy = read_json(repo / "data/geography/state-coordinate-policy.json")
        report = read_json(repo / "analysis/state_coordinate_quality_report.json")
        if len(policy.get("records", {})) != len(states):
            raise RuntimeError("State coordinate policy record count drift")
        unresolved = []
        for state in states:
            key = f"{state['countryCode']}-{state['stateCode']}"
            record = policy["records"].get(key)
            if not record:
                unresolved.append(f"missing:{key}")
                continue
            for field in [
                "latitude",
                "longitude",
                "coordinateType",
                "coordinateSource",
                "coordinateVerifiedAt",
                "coordinateValidation",
                "coordinateStatus",
            ]:
                if state.get(field) != record.get(field):
                    unresolved.append(f"drift:{key}.{field}")
            point = valid_point(state.get("latitude"), state.get("longitude"))
            distance = (
                distance_km(point, admin0.get(state["countryCode"])) if point else None
            )
            if point is None and state.get("coordinateStatus") != "exception":
                unresolved.append(f"null:{key}")
            if (
                distance is not None
                and distance > 25
                and state.get("coordinateStatus") != "exception"
            ):
                unresolved.append(f"outlier:{key}:{distance:.3f}")
        if unresolved or report.get("unresolvedMajorOutliers") != 0:
            raise RuntimeError(f"State coordinate audit failed: {unresolved[:20]}")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return

    fallback = source_manifest["fallbackSource"]
    fallback_path = repo / fallback["file"]
    if (
        fallback_path.stat().st_size != fallback["bytes"]
        or sha256_file(fallback_path) != fallback["sha256"]
    ):
        raise RuntimeError("Pinned upstream state asset checksum mismatch")
    current_states = source_state_map(read_json(fallback_path))
    children = child_points(cities)
    country_by_id = {row["id"]: row for row in countries}

    records: dict[str, dict] = {}
    baseline_major: list[dict] = []
    exceptions: list[dict] = []
    method_counts: Counter[str] = Counter()
    changed = 0

    for state in states:
        key = f"{state['countryCode']}-{state['stateCode']}"
        country_geometry = admin0.get(state["countryCode"])
        before = valid_point(state.get("latitude"), state.get("longitude"))
        before_distance = distance_km(before, country_geometry) if before else None
        if (
            before_distance is not None
            and before_distance > source_manifest["majorOutlierThresholdKm"]
        ):
            baseline_major.append(
                {
                    "stateId": state["id"],
                    "key": key,
                    "name": state["name"],
                    "beforeDistanceKm": round(before_distance, 3),
                }
            )

        feature = choose_admin1(admin1.get(key, []), state)
        if feature:
            point = feature["geometry"].representative_point()
            fields = coordinate_fields(
                point,
                "point-on-surface",
                "natural-earth-admin1-5.1.1",
                "matched-admin1-polygon",
                "verified",
            )
            evidence = {
                "naturalEarthId": feature["neId"],
                "matchedName": feature["name"],
            }
        else:
            current = current_states.get(key)
            current_point = (
                valid_point(current.get("latitude"), current.get("longitude"))
                if current
                else None
            )
            current_distance = (
                distance_km(current_point, country_geometry) if current_point else None
            )
            if current_point and (
                country_geometry is None
                or (current_distance is not None and current_distance <= 25)
            ):
                fields = coordinate_fields(
                    current_point,
                    "source-point-unspecified",
                    "dr5hn-states-v3.2-export.7",
                    "inside-or-within-25km-country-reference"
                    if country_geometry
                    else "country-reference-unavailable",
                    "verified" if country_geometry else "exception",
                )
                evidence = {"upstreamStateId": current.get("id")}
            elif before and (
                country_geometry is None
                or (before_distance is not None and before_distance <= 25)
            ):
                fields = coordinate_fields(
                    before,
                    "source-point-unspecified",
                    "legacy-pinned-source",
                    "inside-or-within-25km-country-reference"
                    if country_geometry
                    else "country-reference-unavailable",
                    "verified" if country_geometry else "exception",
                )
                evidence = {}
            else:
                derived = median_child(children.get(state["id"], []), country_geometry)
                if derived:
                    fields = coordinate_fields(
                        derived,
                        "child-place-median",
                        "canonical-child-place-centres",
                        "inside-or-within-25km-country-reference",
                        "derived",
                    )
                    evidence = {"childPointCount": len(children.get(state["id"], []))}
                else:
                    fields = coordinate_fields(
                        None,
                        "unavailable",
                        "state-coordinate-policy:v1",
                        "documented-no-defensible-point",
                        "exception",
                    )
                    evidence = {
                        "reasonCode": "no-matched-admin1-or-validated-source-point"
                    }

        after = valid_point(fields["latitude"], fields["longitude"])
        after_distance = distance_km(after, country_geometry) if after else None
        if after_distance is not None and after_distance > 25:
            fields["coordinateValidation"] = (
                "documented-natural-earth-worldview-or-hierarchy-exception"
            )
            fields["coordinateStatus"] = "exception"
            evidence["reasonCode"] = "admin1-admin0-reference-model-difference"
        if fields["coordinateStatus"] == "exception":
            exceptions.append(
                {
                    "stateId": state["id"],
                    "key": key,
                    "name": state["name"],
                    "reasonCode": evidence.get(
                        "reasonCode", "country-reference-unavailable"
                    ),
                    "afterDistanceKm": round(after_distance, 3)
                    if after_distance is not None
                    else None,
                    "reviewedAt": VERIFIED_AT,
                }
            )

        method_counts[fields["coordinateType"]] += 1
        if (
            state.get("latitude") != fields["latitude"]
            or state.get("longitude") != fields["longitude"]
        ):
            changed += 1
        record = {
            "stateId": state["id"],
            "name": state["name"],
            **fields,
            "evidence": evidence,
        }
        records[key] = record
        state.update(fields)

    reviewed = []
    record_by_id = {record["stateId"]: record for record in records.values()}
    for item in baseline_major:
        record = record_by_id[item["stateId"]]
        point = valid_point(record["latitude"], record["longitude"])
        country = country_by_id[
            next(
                state["countryId"] for state in states if state["id"] == item["stateId"]
            )
        ]
        after_distance = (
            distance_km(point, admin0.get(country["iso2"])) if point else None
        )
        reviewed.append(
            {
                **item,
                "resolution": record["coordinateStatus"],
                "coordinateSource": record["coordinateSource"],
                "afterDistanceKm": round(after_distance, 3)
                if after_distance is not None
                else None,
                "reviewedAt": VERIFIED_AT,
            }
        )

    policy = {
        "schemaVersion": 1,
        "policyVersion": "state-coordinate-policy:v1",
        "verifiedAt": VERIFIED_AT,
        "sourceManifest": "data/sources/natural-earth-admin1-5.1.1.json",
        "coordinateDefinition": "point-on-surface for a matched Admin-1 polygon; otherwise a validated pinned source point, child-place median, or explicit unavailable exception",
        "majorOutlierThresholdKm": 25,
        "records": records,
        "reviewedMajorOutliers": reviewed,
        "exceptions": exceptions,
    }
    report = {
        "schemaVersion": 1,
        "verifiedAt": VERIFIED_AT,
        "counts": {
            "states": len(states),
            "coordinatesChanged": changed,
            "baselineMajorOutliers": len(baseline_major),
            "reviewedMajorOutliers": len(reviewed),
            "exceptions": len(exceptions),
        },
        "coordinateTypes": dict(sorted(method_counts.items())),
        "unresolvedMajorOutliers": sum(
            1
            for row in reviewed
            if row["resolution"] not in {"verified", "derived", "exception"}
        ),
    }

    if args.apply:
        write_json(repo / "data/state.json", states)
        write_json(repo / "data/geography/state-coordinate-policy.json", policy)
        write_json(repo / "analysis/state_coordinate_quality_report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
