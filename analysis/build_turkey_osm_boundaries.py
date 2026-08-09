#!/usr/bin/env python3
"""Build deterministic Türkiye province/district polygons from pinned OSM relations.

Runtime dependencies: shapely==2.1.2 and pyproj==3.7.2.
The source manifest pins all relation IDs and versions. Geometry is requested at
the manifest's historical Overpass snapshot and rejected on version drift.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
import urllib.error
import urllib.parse
import urllib.request
from itertools import pairwise
from pathlib import Path
from typing import Any

from pyproj import CRS, Transformer
from shapely import coverage_is_valid, coverage_simplify, make_valid
from shapely.geometry import LineString, Point, mapping
from shapely.ops import polygonize_full, transform, unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "analysis" / "turkey_osm_boundary_etl_config.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path)
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()

    config = read_json(args.config)
    manifest_path = ROOT / config["sourceManifest"]
    manifest = read_json(manifest_path)
    district_layer = read_json(ROOT / config["districtLayer"])
    cache_dir = args.cache_dir or ROOT / ".cache" / "turkey-osm-boundaries"
    cache_dir.mkdir(parents=True, exist_ok=True)

    geometries: dict[str, list[Any]] = {}
    features: dict[str, list[dict[str, Any]]] = {}
    fetch_reports: dict[str, Any] = {}
    for level in ("provinces", "districts"):
        level_features, level_geometries, fetch_report = build_level(
            level, manifest[level], manifest, config, cache_dir, args.offline
        )
        features[level] = level_features
        geometries[level] = level_geometries
        fetch_reports[level] = fetch_report

    source_topology = {
        level: topology_report(items, features[level])
        for level, items in geometries.items()
    }
    geometries["districts"], overlap_repairs = normalize_district_overlaps(
        features["districts"],
        geometries["districts"],
        district_layer,
        config,
    )
    features["districts"] = annotate_district_features(
        features["districts"], overlap_repairs, config
    )
    features["provinces"], geometries["provinces"] = derive_provinces(
        features["provinces"], features["districts"], geometries["districts"], config
    )
    topology = {
        level: topology_report(items, features[level])
        for level, items in geometries.items()
    }
    province_union = unary_union(geometries["provinces"])
    district_union = unary_union(geometries["districts"])
    interior_gap_ratio = province_interior_gap_ratio(
        province_union,
        district_union,
        gate_config=config["qualityGate"],
    )
    parent_failures = district_parent_failures(
        features["districts"],
        geometries["districts"],
        features["provinces"],
        geometries["provinces"],
    )

    gate_config = config["qualityGate"]
    checks = {
        "exactProvinceCount": len(features["provinces"])
        == gate_config["expectedProvinces"],
        "exactDistrictCount": len(features["districts"])
        == gate_config["expectedDistricts"],
        "allRelationVersionsPinned": all(
            item["versionMismatches"] == [] for item in fetch_reports.values()
        ),
        "validGeometry": all(
            item["invalidFeatures"] == 0 for item in topology.values()
        ),
        "nonOverlappingGeometry": all(
            item["positiveAreaOverlapPairs"]
            <= gate_config["maximumPositiveAreaOverlapPairs"]
            for item in topology.values()
        ),
        "districtsWithinParentProvince": parent_failures == [],
        "provinceInteriorCoveredByDistricts": interior_gap_ratio
        <= gate_config["maximumProvinceInteriorCoverageGapRatio"],
    }

    output_hashes: dict[str, str] = {}
    simplification = {}
    report = {
        "schemaVersion": 1,
        "source": manifest["source"],
        "sourceManifest": str(manifest_path.relative_to(ROOT)),
        "counts": {level: len(items) for level, items in features.items()},
        "fetch": fetch_reports,
        "geometryModel": config["geometryModel"],
        "sourceTopology": source_topology,
        "topology": topology,
        "normalization": {"districtOverlapRepairs": overlap_repairs},
        "coverage": {
            "provinceInteriorGapRatio": interior_gap_ratio,
            "districtParentFailures": parent_failures,
        },
        "simplification": simplification,
        "outputSha256": output_hashes,
        "qualityGate": {"passes": all(checks.values()), "checks": checks},
    }
    if not report["qualityGate"]["passes"]:
        write_json(args.report, report)
        failed = ", ".join(name for name, passed in checks.items() if not passed)
        raise SystemExit(f"Türkiye OSM boundary quality gate failed: {failed}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for level in ("provinces", "districts"):
        file_path = args.output_dir / f"turkey-{level}.geojson"
        output_hashes[file_path.name] = write_geojson(
            file_path, features[level], geometries[level], manifest, config
        )

    topology_path = args.output_dir / "turkey-admin.topojson"
    output_hashes[topology_path.name] = write_topojson(
        topology_path, features, geometries, manifest, config
    )

    for profile in config["simplificationProfiles"]:
        simplified_districts = simplify_geometries(
            geometries["districts"], profile["toleranceMeters"]
        )
        simplified_districts, profile_repairs = normalize_district_overlaps(
            features["districts"],
            simplified_districts,
            district_layer,
            config,
        )
        simplified_province_features, simplified_provinces = derive_provinces(
            features["provinces"],
            features["districts"],
            simplified_districts,
            config,
        )
        simplified = {
            "districts": simplified_districts,
            "provinces": simplified_provinces,
        }
        simplified_features = {
            "districts": features["districts"],
            "provinces": simplified_province_features,
        }
        simplified_topology = {
            level: topology_report(items, simplified_features[level])
            for level, items in simplified.items()
        }
        file_path = args.output_dir / f"turkey-admin-{profile['name']}.topojson"
        output_hashes[file_path.name] = write_topojson(
            file_path, simplified_features, simplified, manifest, config
        )
        simplification[profile["name"]] = {
            "toleranceMeters": profile["toleranceMeters"],
            "method": "shared-coverage-simplify-then-normalize-overlaps",
            "overlapRepairs": profile_repairs,
            "validGeometry": all(
                item["invalidFeatures"] == 0 for item in simplified_topology.values()
            ),
            "nonOverlappingGeometry": all(
                item["positiveAreaOverlapPairs"] == 0
                for item in simplified_topology.values()
            ),
            "coverageValid": all(
                coverage_is_valid(items) for items in simplified.values()
            ),
            "sha256": output_hashes[file_path.name],
        }

    write_json(args.report, report)
    print(
        f"Türkiye OSM boundaries passed: {len(features['provinces'])} provinces, "
        f"{len(features['districts'])} districts."
    )


def build_level(level, entities, manifest, config, cache_dir, offline):
    relation_ids = [item["osmRelationId"] for item in entities]
    relation_by_id = {}
    requests = []
    chunk_size = int(config["request"]["chunkSize"])
    for index in range(0, len(relation_ids), chunk_size):
        chunk = relation_ids[index : index + chunk_size]
        payload, request_report = load_chunk(
            level, index // chunk_size, chunk, manifest, config, cache_dir, offline
        )
        requests.append(request_report)
        for relation in payload["elements"]:
            if relation.get("type") == "relation":
                relation_by_id[relation["id"]] = relation

    version_mismatches = []
    output_features = []
    output_geometries = []
    for entity in entities:
        relation = relation_by_id.get(entity["osmRelationId"])
        if not relation:
            version_mismatches.append(
                {"osmRelationId": entity["osmRelationId"], "reason": "missing"}
            )
            continue
        if relation.get("version") != entity["osmVersion"]:
            relation = load_pinned_osm_api_relation(entity, cache_dir)
            if relation.get("version") != entity["osmVersion"]:
                version_mismatches.append(
                    {
                        "osmRelationId": entity["osmRelationId"],
                        "expectedVersion": entity["osmVersion"],
                        "receivedVersion": relation.get("version"),
                    }
                )
        geometry = relation_geometry(relation)
        output_geometries.append(geometry)
        output_features.append(
            {
                "id": entity["id"],
                "publicId": entity["publicId"],
                "name": entity["name"],
                "stateCode": entity["stateCode"],
                "stateName": entity.get("stateName"),
                "officialCode": entity.get("officialCode")
                or (entity["stateCode"] if level == "provinces" else None),
                "officialCodeStatus": entity.get("officialCodeStatus")
                or ("published-province-code" if level == "provinces" else None),
                "osmRelationId": entity["osmRelationId"],
                "osmVersion": entity["osmVersion"],
                "sourceSnapshotDate": manifest["source"]["snapshotDate"],
                "source": "OpenStreetMap",
                "license": "ODbL-1.0",
            }
        )
    return (
        output_features,
        output_geometries,
        {
            "requests": requests,
            "versionMismatches": version_mismatches,
        },
    )


def load_chunk(level, index, relation_ids, manifest, config, cache_dir, offline):
    snapshot = manifest["source"]["snapshotDate"]
    cache_key = hashlib.sha256(
        f"current-pinned-v1:{snapshot}:{','.join(map(str, relation_ids))}".encode()
    ).hexdigest()[:16]
    cache_path = cache_dir / f"{level}-{index:03d}-{cache_key}.json"
    if cache_path.exists():
        payload = read_json(cache_path)
        return payload, {"cache": cache_path.name, "source": "cache"}
    if offline:
        raise SystemExit(f"Missing offline cache: {cache_path}")

    query = (
        f"[out:json][timeout:{config['request']['timeoutSeconds']}];"
        f"rel(id:{','.join(map(str, relation_ids))});out meta geom;"
    )
    encoded = urllib.parse.urlencode({"data": query}).encode()
    errors = []
    for endpoint in config["overpassEndpoints"]:
        for attempt in range(config["request"]["attemptsPerEndpoint"]):
            try:
                request = urllib.request.Request(endpoint, data=encoded)
                with urllib.request.urlopen(
                    request, timeout=config["request"]["timeoutSeconds"] + 20
                ) as response:
                    payload = json.load(response)
                write_json(cache_path, payload)
                return payload, {
                    "cache": cache_path.name,
                    "source": endpoint,
                    "attempt": attempt + 1,
                }
            except (
                OSError,
                ValueError,
                json.JSONDecodeError,
                urllib.error.URLError,
            ) as error:  # network/service errors are retried and reported
                errors.append(f"{endpoint} attempt {attempt + 1}: {error}")
                time.sleep(2**attempt)
    if len(relation_ids) > 1:
        midpoint = len(relation_ids) // 2
        left, left_report = load_chunk(
            level,
            index * 2,
            relation_ids[:midpoint],
            manifest,
            config,
            cache_dir,
            offline,
        )
        right, right_report = load_chunk(
            level,
            index * 2 + 1,
            relation_ids[midpoint:],
            manifest,
            config,
            cache_dir,
            offline,
        )
        payload = {
            "version": 0.6,
            "generator": "CountryStateCity adaptive Overpass merge",
            "elements": [*left["elements"], *right["elements"]],
        }
        write_json(cache_path, payload)
        return payload, {
            "cache": cache_path.name,
            "source": "adaptive-split",
            "children": [left_report, right_report],
            "errors": errors,
        }
    try:
        payload = load_osm_api_relation(relation_ids[0])
        write_json(cache_path, payload)
        return payload, {
            "cache": cache_path.name,
            "source": "https://api.openstreetmap.org/api/0.6/relation/{id}/full.json",
            "errors": errors,
        }
    except (OSError, ValueError, json.JSONDecodeError, urllib.error.URLError) as error:
        errors.append(f"OpenStreetMap API fallback: {error}")
    raise SystemExit("Boundary request failed: " + " | ".join(errors))


def load_osm_api_relation(relation_id):
    url = f"https://api.openstreetmap.org/api/0.6/relation/{relation_id}/full.json"
    with urllib.request.urlopen(url, timeout=120) as response:
        payload = json.load(response)
    nodes = {
        item["id"]: {"lat": item["lat"], "lon": item["lon"]}
        for item in payload["elements"]
        if item["type"] == "node"
    }
    ways = {
        item["id"]: [
            nodes[node_id] for node_id in item.get("nodes", []) if node_id in nodes
        ]
        for item in payload["elements"]
        if item["type"] == "way"
    }
    relation = next(
        item
        for item in payload["elements"]
        if item["type"] == "relation" and item["id"] == relation_id
    )
    for member in relation.get("members", []):
        if member["type"] == "way" and member["ref"] in ways:
            member["geometry"] = ways[member["ref"]]
    return {
        "version": 0.6,
        "generator": "OpenStreetMap API fallback",
        "elements": [relation],
    }


def load_pinned_osm_api_relation(entity, cache_dir):
    cache_path = cache_dir / (
        f"osm-api-{entity['osmRelationId']}-v{entity['osmVersion']}.json"
    )
    if cache_path.exists():
        payload = read_json(cache_path)
    else:
        payload = load_osm_api_relation(entity["osmRelationId"])
        write_json(cache_path, payload)
    return next(
        item
        for item in payload["elements"]
        if item["type"] == "relation" and item["id"] == entity["osmRelationId"]
    )


def relation_geometry(relation):
    role_lines = {"outer": [], "inner": []}
    for member in relation.get("members", []):
        role = member.get("role")
        coordinates = member.get("geometry")
        if role not in role_lines or not coordinates or len(coordinates) < 2:
            continue
        if any("lon" not in item or "lat" not in item for item in coordinates):
            continue
        role_lines[role].append(
            LineString([(item["lon"], item["lat"]) for item in coordinates])
        )
    outer = polygonize_lines(role_lines["outer"])
    if outer.is_empty:
        raise ValueError(f"Relation {relation['id']} has no closed outer geometry")
    inner = polygonize_lines(role_lines["inner"])
    geometry = outer.difference(inner) if not inner.is_empty else outer
    geometry = make_valid(geometry)
    if geometry.geom_type not in {"Polygon", "MultiPolygon"}:
        geometry = unary_union(
            [
                item
                for item in geometry.geoms
                if item.geom_type in {"Polygon", "MultiPolygon"}
            ]
        )
    if geometry.is_empty or not geometry.is_valid:
        raise ValueError(f"Relation {relation['id']} produced invalid geometry")
    return geometry


def polygonize_lines(lines):
    if not lines:
        return unary_union([])
    polygons, cuts, dangles, invalid = polygonize_full(unary_union(lines))
    if len(cuts.geoms) or len(dangles.geoms) or len(invalid.geoms):
        raise ValueError(
            f"Unclosed relation linework: cuts={len(cuts.geoms)}, "
            f"dangles={len(dangles.geoms)}, invalid={len(invalid.geoms)}"
        )
    return unary_union(list(polygons.geoms))


def normalize_district_overlaps(features, geometries, district_layer, config):
    """Remove positive-area overlaps with an explicit centre-distance rule.

    Raw pinned OSM relations remain represented in sourceTopology. Product
    geometries assign each overlap to the district whose published centre is
    closest to a representative point in the overlap. The decision is recorded
    for both affected features and never depends on input or numeric ID order.
    """
    forward = Transformer.from_crs(
        CRS.from_epsg(4326), CRS.from_user_input(config["workingCrs"]), always_xy=True
    )
    reverse = Transformer.from_crs(
        CRS.from_user_input(config["workingCrs"]), CRS.from_epsg(4326), always_xy=True
    )
    centre_by_id = {
        item["publicId"]: transform(
            forward.transform,
            Point(float(item["longitude"]), float(item["latitude"])),
        )
        for item in district_layer["districts"]
    }
    projected = [transform(forward.transform, item) for item in geometries]
    feature_index = {item["publicId"]: index for index, item in enumerate(features)}
    repairs = []

    for iteration in range(config["geometryModel"]["maximumRepairIterations"]):
        overlaps = positive_area_overlaps(projected, features)
        if not overlaps:
            break
        for item in overlaps:
            left_index = feature_index[item["left"]]
            right_index = feature_index[item["right"]]
            overlap = projected[left_index].intersection(projected[right_index])
            if overlap.is_empty or overlap.area <= 1e-6:
                continue
            point = overlap.representative_point()
            left_distance = point.distance(centre_by_id[item["left"]])
            right_distance = point.distance(centre_by_id[item["right"]])
            if math.isclose(left_distance, right_distance, abs_tol=1e-6):
                raise ValueError(
                    "Overlap arbitration is ambiguous for "
                    f"{item['left']} and {item['right']}"
                )
            winner_index, loser_index = (
                (left_index, right_index)
                if left_distance < right_distance
                else (right_index, left_index)
            )
            separation = config["geometryModel"]["overlapSeparationMeters"]
            repaired = polygonal_only(
                make_valid(
                    projected[loser_index].difference(overlap.buffer(separation))
                )
            )
            if repaired.is_empty:
                raise ValueError(
                    f"Overlap repair emptied {features[loser_index]['publicId']}"
                )
            projected[loser_index] = repaired
            repairs.append(
                {
                    "iteration": iteration + 1,
                    "left": item["left"],
                    "right": item["right"],
                    "winner": features[winner_index]["publicId"],
                    "trimmed": features[loser_index]["publicId"],
                    "areaSquareMeters": overlap.area,
                    "separationMeters": separation,
                    "rule": config["geometryModel"]["districtOverlapRule"],
                }
            )
    remaining = positive_area_overlaps(projected, features)
    if remaining:
        raise ValueError(f"District overlap normalization did not converge: {remaining}")

    normalized = [
        polygonal_only(make_valid(transform(reverse.transform, item)))
        for item in projected
    ]
    return normalized, repairs


def positive_area_overlaps(geometries, features):
    overlaps = []
    tree = STRtree(geometries)
    for left_index, left in enumerate(geometries):
        for right_value in tree.query(left, predicate="intersects"):
            right_index = int(right_value)
            if right_index <= left_index:
                continue
            area = left.intersection(geometries[right_index]).area
            if area > 1e-6:
                left_id, right_id = sorted(
                    (features[left_index]["publicId"], features[right_index]["publicId"])
                )
                overlaps.append({"left": left_id, "right": right_id, "area": area})
    return sorted(overlaps, key=lambda item: (item["left"], item["right"]))


def polygonal_only(geometry):
    if geometry.geom_type in {"Polygon", "MultiPolygon"}:
        return geometry
    return unary_union(
        [
            item
            for item in geometry.geoms
            if item.geom_type in {"Polygon", "MultiPolygon"}
        ]
    )


def annotate_district_features(features, repairs, config):
    repairs_by_id = {item["publicId"]: [] for item in features}
    for repair in repairs:
        repairs_by_id[repair["left"]].append(repair)
        repairs_by_id[repair["right"]].append(repair)
    return [
        {
            **item,
            "geometryModel": config["geometryModel"]["name"],
            "geometryStatus": "normalized-osm-boundary",
            "geometryDerivation": config["geometryModel"]["districtOverlapRule"],
            "geometryRepairs": repairs_by_id[item["publicId"]],
        }
        for item in features
    ]


def derive_provinces(province_features, district_features, district_geometries, config):
    districts_by_state = {}
    for feature, geometry in zip(district_features, district_geometries, strict=True):
        districts_by_state.setdefault(feature["stateCode"], []).append(geometry)
    output_features = []
    output_geometries = []
    for feature in province_features:
        children = districts_by_state.get(feature["stateCode"], [])
        if not children:
            raise ValueError(f"Province {feature['publicId']} has no district geometry")
        output_features.append(
            {
                **feature,
                "geometryModel": config["geometryModel"]["name"],
                "geometryStatus": "derived-boundary",
                "geometryDerivation": config["geometryModel"]["provinceRule"],
                "sourceDistrictCount": len(children),
            }
        )
        output_geometries.append(polygonal_only(make_valid(unary_union(children))))
    return output_features, output_geometries


def topology_report(geometries, features):
    invalid = sum(not item.is_valid for item in geometries)
    overlaps = []
    tree = STRtree(geometries)
    for left_index, left in enumerate(geometries):
        for right_index in tree.query(left, predicate="intersects"):
            if int(right_index) <= left_index:
                continue
            area = left.intersection(geometries[int(right_index)]).area
            if area > 1e-12:
                overlaps.append(
                    {
                        "left": features[left_index]["publicId"],
                        "right": features[int(right_index)]["publicId"],
                        "areaDegreesSquared": area,
                    }
                )
    return {
        "features": len(geometries),
        "invalidFeatures": invalid,
        "positiveAreaOverlapPairs": len(overlaps),
        "overlaps": overlaps,
        "coverageValid": bool(coverage_is_valid(geometries)),
    }


def district_parent_failures(
    district_features, district_geometries, province_features, province_geometries
):
    provinces = {
        feature["stateCode"]: geometry
        for feature, geometry in zip(
            province_features, province_geometries, strict=True
        )
    }
    failures = []
    for feature, geometry in zip(district_features, district_geometries, strict=True):
        parent = provinces[feature["stateCode"]]
        outside_ratio = geometry.difference(parent).area / geometry.area
        if outside_ratio > 0.001:
            failures.append(
                {
                    "publicId": feature["publicId"],
                    "name": feature["name"],
                    "stateName": feature["stateName"],
                    "outsideRatio": outside_ratio,
                }
            )
    return failures


def province_interior_gap_ratio(province_union, district_union, gate_config):
    forward = Transformer.from_crs(
        CRS.from_epsg(4326), CRS.from_epsg(3857), always_xy=True
    )
    province_meters = make_valid(transform(forward.transform, province_union))
    district_meters = make_valid(transform(forward.transform, district_union))
    interior = province_meters.buffer(-gate_config["provinceInteriorBufferMeters"])
    if interior.is_empty:
        return math.inf
    return interior.difference(district_meters).area / interior.area


def simplify_geometries(geometries, tolerance_meters):
    forward = Transformer.from_crs(
        CRS.from_epsg(4326), CRS.from_epsg(3857), always_xy=True
    )
    reverse = Transformer.from_crs(
        CRS.from_epsg(3857), CRS.from_epsg(4326), always_xy=True
    )
    projected = [transform(forward.transform, item) for item in geometries]
    simplified = coverage_simplify(
        projected, tolerance_meters, simplify_boundary=True
    )
    return [
        polygonal_only(make_valid(transform(reverse.transform, item)))
        for item in simplified
    ]


def write_geojson(path, features, geometries, manifest, config):
    collection = {
        "type": "FeatureCollection",
        "csc:source": manifest["source"],
        "csc:geometryModel": config["geometryModel"],
        "features": [
            {
                "type": "Feature",
                "properties": feature,
                "geometry": rounded_mapping(geometry, config),
            }
            for feature, geometry in zip(features, geometries, strict=True)
        ],
    }
    return write_json(path, collection)


def write_topojson(path, features, geometries, manifest, config):
    arcs = []
    arc_index = {}
    objects = {}
    for level in ("provinces", "districts"):
        output = []
        for properties, geometry in zip(
            features[level], geometries[level], strict=True
        ):
            output.append(
                topology_geometry(properties, geometry, arcs, arc_index, config)
            )
        objects[level] = {"type": "GeometryCollection", "geometries": output}
    topology = {
        "type": "Topology",
        "csc:source": manifest["source"],
        "csc:geometryModel": config["geometryModel"],
        "objects": objects,
        "arcs": arcs,
    }
    return write_json(path, topology)


def topology_geometry(properties, geometry, arcs, arc_index, config):
    polygons = [geometry] if geometry.geom_type == "Polygon" else list(geometry.geoms)
    encoded = []
    for polygon in polygons:
        encoded.append(
            [ring_arcs(polygon.exterior.coords, arcs, arc_index, config)]
            + [
                ring_arcs(ring.coords, arcs, arc_index, config)
                for ring in polygon.interiors
            ]
        )
    return {
        "type": "Polygon" if geometry.geom_type == "Polygon" else "MultiPolygon",
        "properties": properties,
        "arcs": encoded[0] if geometry.geom_type == "Polygon" else encoded,
    }


def ring_arcs(coordinates, arcs, arc_index, config):
    rounded = [round_point(item, config) for item in coordinates]
    result = []
    for left, right in pairwise(rounded):
        forward = (tuple(left), tuple(right))
        reverse = (tuple(right), tuple(left))
        if forward in arc_index:
            result.append(arc_index[forward])
        elif reverse in arc_index:
            result.append(~arc_index[reverse])
        else:
            index = len(arcs)
            arcs.append([left, right])
            arc_index[forward] = index
            result.append(index)
    return result


def rounded_mapping(geometry, config):
    value = mapping(geometry)
    value["coordinates"] = round_nested(
        value["coordinates"], config["coordinatePrecision"]
    )
    return value


def round_nested(value, precision):
    if value and isinstance(value[0], (int, float)):
        return [round(item, precision) for item in value]
    return [round_nested(item, precision) for item in value]


def round_point(value, config):
    return [round(item, config["coordinatePrecision"]) for item in value[:2]]


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    content = (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    )
    path.write_text(content, encoding="utf-8")
    return hashlib.sha256(content.encode()).hexdigest()


if __name__ == "__main__":
    main()
