#!/usr/bin/env python3
"""Build and audit a deterministic, non-publishable HGM boundary candidate.

The HGM archive contains unlabeled boundary polylines and labeled settlement
centres. This tool polygonizes the linework, labels faces by point-in-polygon,
and emits a review report. It deliberately refuses to publish geometry until
rights, topology, feature-count, and official metadata gates all pass.

Runtime dependencies: pyshp==3.0.3, shapely==2.1.2, pyproj==3.7.2.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
import unicodedata
from pathlib import Path
from typing import Any

import shapefile
from pyproj import CRS, Transformer
from shapely import normalize as normalize_geometry
from shapely import set_precision, to_wkb
from shapely.geometry import mapping, shape as shapely_shape
from shapely.ops import polygonize_full, transform, unary_union


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "analysis" / "turkey_boundary_etl_config.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument(
        "--metadata",
        type=Path,
        help="Optional reviewed official name/code mapping produced by TAN-5523.",
    )
    parser.add_argument("--output-report", type=Path, required=True)
    parser.add_argument(
        "--output-geojson-dir",
        type=Path,
        help="Written only if every publication gate passes.",
    )
    parser.add_argument(
        "--rights-compatible",
        action="store_true",
        help="Assert that written redistribution rights compatible with the product exist.",
    )
    args = parser.parse_args()

    config = load_json(args.config)
    metadata = load_metadata(args.metadata)
    archive_digest = sha256_file(args.archive)
    expected_digest = config["source"]["sha256"]
    if archive_digest != expected_digest:
        raise SystemExit(
            f"Unexpected archive SHA-256: {archive_digest}; expected {expected_digest}"
        )

    with tempfile.TemporaryDirectory(prefix="csc-hgm-etl-") as temporary:
        extraction_root = Path(temporary)
        subprocess.run(
            ["bsdtar", "-xf", str(args.archive), "-C", str(extraction_root)],
            check=True,
        )
        layer_paths = discover_layers(extraction_root)
        boundary_crs = read_crs(layer_paths["province-boundary-lines"])
        centers = read_centers(
            layer_paths["settlement-centers"], boundary_crs, metadata
        )
        line_layers = {
            name: read_lines(path)
            for name, path in layer_paths.items()
            if name.endswith("boundary-lines")
        }

        level_results: dict[str, dict[str, Any]] = {}
        feature_geometries: dict[str, list[tuple[dict[str, Any], Any]]] = {}
        for level_name, level_config in config["levels"].items():
            result, features = build_level(
                level_name, level_config, centers, line_layers
            )
            level_results[level_name] = result
            feature_geometries[level_name] = features

    gate = build_publication_gate(
        config=config,
        levels=level_results,
        rights_compatible=args.rights_compatible,
    )
    report = {
        "schemaVersion": 1,
        "source": {
            **config["source"],
            "bytes": args.archive.stat().st_size,
        },
        "coordinatePolicy": {
            "workingCrs": boundary_crs.to_wkt(),
            "outputCrs": config["targetCrs"],
            "alwaysXY": True,
        },
        "parameters": {
            level: {
                "precisionGridMeters": item["precisionGridMeters"],
                "lineLayers": item["lineLayers"],
            }
            for level, item in config["levels"].items()
        },
        "levels": level_results,
        "publicationGate": gate,
    }
    write_json(args.output_report, report)

    if args.output_geojson_dir:
        if not gate["passes"]:
            reasons = "; ".join(gate["blockingReasons"])
            raise SystemExit(f"GeoJSON publication refused: {reasons}")
        write_geojson_outputs(
            args.output_geojson_dir,
            boundary_crs,
            feature_geometries,
            report,
        )


def build_level(level_name, config, centers, line_layers):
    categories = set(config["centerCategories"])
    selected_centers = [item for item in centers if item["category"] in categories]
    source_lines = [
        geometry
        for layer_name in config["lineLayers"]
        for geometry in line_layers[layer_name]
    ]
    grid = float(config["precisionGridMeters"])
    prepared_lines = [
        set_precision(geometry, grid, mode="valid_output")
        for geometry in source_lines
    ]
    polygons, cuts, dangles, invalid_rings = polygonize_full(
        unary_union(prepared_lines)
    )
    faces = sorted(polygons.geoms, key=geometry_sort_key)

    face_centers: dict[int, list[dict[str, Any]]] = {}
    unmatched = []
    ambiguous = []
    for center in selected_centers:
        matched = [index for index, face in enumerate(faces) if face.covers(center["point"])]
        if len(matched) == 1:
            face_centers.setdefault(matched[0], []).append(center)
        elif not matched:
            unmatched.append(center_summary(center))
        else:
            ambiguous.append(
                {**center_summary(center), "candidateFaceIndexes": matched}
            )

    collisions = []
    features = []
    for face_index, matched_centers in sorted(face_centers.items()):
        if len(matched_centers) > 1:
            collisions.append(
                {
                    "faceIndex": face_index,
                    "centers": [center_summary(item) for item in matched_centers],
                    "geometrySha256": geometry_digest(faces[face_index]),
                }
            )
            continue
        center = matched_centers[0]
        properties = {
            "level": level_name,
            "sourceCenterName": center["sourceName"],
            "name": center["officialName"],
            "code": center["officialCode"],
            "source": "HGM-2083",
        }
        features.append((properties, faces[face_index]))

    unique_labeled_faces = len(face_centers)
    missing_metadata = [
        center_summary(item)
        for item in selected_centers
        if not item["officialName"] or not item["officialCode"]
    ]
    invalid_features = sum(not geometry.is_valid for _, geometry in features)
    overlap_pairs = count_positive_area_overlaps([geometry for _, geometry in features])
    digest = hashlib.sha256()
    for properties, geometry in sorted(
        features, key=lambda item: (item[0]["sourceCenterName"], geometry_sort_key(item[1]))
    ):
        digest.update(canonical_json(properties).encode("utf-8"))
        digest.update(canonical_wkb(geometry))

    expected = int(config["expectedFeatures"])
    result = {
        "expectedFeatures": expected,
        "centerCount": len(selected_centers),
        "polygonizedFaces": len(faces),
        "uniqueLabeledFaces": unique_labeled_faces,
        "publishableFeatures": len(features),
        "unlabeledFaces": len(faces) - unique_labeled_faces,
        "unmatchedCenters": unmatched,
        "ambiguousCenters": ambiguous,
        "centerCollisions": collisions,
        "missingOfficialMetadata": missing_metadata,
        "topology": {
            "cutEdges": geometry_count(cuts),
            "dangles": geometry_count(dangles),
            "invalidRings": geometry_count(invalid_rings),
            "invalidPublishableFeatures": invalid_features,
            "positiveAreaOverlapPairs": overlap_pairs,
        },
        "candidateSha256": digest.hexdigest(),
        "checks": {
            "centerCount": len(selected_centers) == expected,
            "exactFeatureCount": unique_labeled_faces == expected,
            "allCentersMatchedOnce": not unmatched and not ambiguous,
            "noCenterCollisions": not collisions,
            "officialMetadataComplete": not missing_metadata,
            "validGeometry": invalid_features == 0,
            "nonOverlappingGeometry": overlap_pairs == 0,
        },
    }
    return result, features


def build_publication_gate(config, levels, rights_compatible):
    checks = {
        "compatibleCommercialRedistributionRights": rights_compatible,
        "officialMetadataComplete": all(
            level["checks"]["officialMetadataComplete"] for level in levels.values()
        ),
        "exactFeatureCounts": all(
            level["checks"]["exactFeatureCount"] for level in levels.values()
        ),
        "allCentersMatchedOnce": all(
            level["checks"]["allCentersMatchedOnce"] for level in levels.values()
        ),
        "noCenterCollisions": all(
            level["checks"]["noCenterCollisions"] for level in levels.values()
        ),
        "validNonOverlappingGeometry": all(
            level["checks"]["validGeometry"]
            and level["checks"]["nonOverlappingGeometry"]
            for level in levels.values()
        ),
    }
    labels = {
        "compatibleCommercialRedistributionRights": "HGM rights are not compatible with general-purpose commercial redistribution",
        "officialMetadataComplete": "reviewed official name/code metadata is incomplete",
        "exactFeatureCounts": "polygon feature counts do not equal 81 provinces and 922 districts",
        "allCentersMatchedOnce": "one or more centres do not match exactly one face",
        "noCenterCollisions": "one or more polygon faces contain multiple administrative centres",
        "validNonOverlappingGeometry": "candidate geometry is invalid or overlaps",
    }
    return {
        "passes": all(checks.values()),
        "checks": checks,
        "blockingReasons": [labels[name] for name, passed in checks.items() if not passed],
        "policy": config["publicationGate"],
    }


def write_geojson_outputs(output_dir, source_crs, features_by_level, report):
    output_dir.mkdir(parents=True, exist_ok=True)
    transformer = Transformer.from_crs(source_crs, CRS.from_epsg(4326), always_xy=True)
    for level, features in features_by_level.items():
        collection = {
            "type": "FeatureCollection",
            "csc:source": report["source"],
            "features": [
                {
                    "type": "Feature",
                    "properties": properties,
                    "geometry": mapping(transform(transformer.transform, geometry)),
                }
                for properties, geometry in features
            ],
        }
        write_json(output_dir / f"turkey-{level}.geojson", collection)


def discover_layers(root):
    result = {}
    for path in sorted(root.rglob("*.shp")):
        key = normalize_text(path.stem).replace("_", " ")
        if "yerlesim" in key:
            result["settlement-centers"] = path
        elif "ulke" in key:
            result["country-boundary-lines"] = path
        elif "ilce" in key:
            result["district-boundary-lines"] = path
        elif key.startswith("il "):
            result["province-boundary-lines"] = path
    required = {
        "settlement-centers",
        "country-boundary-lines",
        "district-boundary-lines",
        "province-boundary-lines",
    }
    missing = required - result.keys()
    if missing:
        raise ValueError(f"Archive is missing layers: {sorted(missing)}")
    return result


def read_centers(path, target_crs, metadata):
    reader = shapefile.Reader(str(path), encoding="utf-8")
    fields = [item[0] for item in reader.fields[1:]]
    source_crs = read_crs(path)
    projected = Transformer.from_crs(source_crs, target_crs, always_xy=True)
    wgs84 = Transformer.from_crs(source_crs, CRS.from_epsg(4326), always_xy=True)
    centers = []
    for record, source_shape in zip(reader.records(), reader.shapes(), strict=True):
        values = dict(zip(fields, record, strict=True))
        source_name = values["Adı"].strip()
        category = values["KATEGORI"].strip()
        metadata_item = metadata.get((category, normalize_text(source_name)), {})
        source_geometry = shapely_shape(source_shape.__geo_interface__)
        lon_lat = transform(wgs84.transform, source_geometry)
        centers.append(
            {
                "category": category,
                "sourceName": source_name,
                "officialName": metadata_item.get("name"),
                "officialCode": metadata_item.get("code"),
                "point": transform(projected.transform, source_geometry),
                "longitude": round(lon_lat.x, 8),
                "latitude": round(lon_lat.y, 8),
            }
        )
    return centers


def read_lines(path):
    reader = shapefile.Reader(str(path), encoding="utf-8")
    return [shapely_shape(item.__geo_interface__) for item in reader.shapes()]


def load_metadata(path):
    if not path:
        return {}
    raw = load_json(path)
    result = {}
    for level in ("province", "district"):
        for item in raw.get(level, []):
            category = item["category"]
            key = (category, normalize_text(item["sourceName"]))
            if key in result:
                raise ValueError(f"Duplicate metadata key: {key}")
            result[key] = item
    return result


def read_crs(shp_path):
    return CRS.from_wkt(decode_text(shp_path.with_suffix(".prj").read_bytes()).strip())


def center_summary(center):
    return {
        "category": center["category"],
        "sourceName": center["sourceName"],
        "officialName": center["officialName"],
        "officialCode": center["officialCode"],
        "longitude": center["longitude"],
        "latitude": center["latitude"],
    }


def count_positive_area_overlaps(geometries):
    overlaps = 0
    for index, left in enumerate(geometries):
        for right in geometries[index + 1 :]:
            if left.intersects(right) and left.intersection(right).area > 0:
                overlaps += 1
    return overlaps


def geometry_sort_key(geometry):
    bounds = tuple(round(value, 6) for value in geometry.bounds)
    return (*bounds, geometry_digest(geometry))


def geometry_digest(geometry):
    return hashlib.sha256(canonical_wkb(geometry)).hexdigest()


def canonical_wkb(geometry):
    return to_wkb(
        normalize_geometry(geometry), byte_order=1, output_dimension=2, include_srid=False
    )


def geometry_count(geometry):
    return len(geometry.geoms) if hasattr(geometry, "geoms") else int(not geometry.is_empty)


def normalize_text(value):
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value).casefold()
        if not unicodedata.combining(character)
    ).replace("ı", "i")


def decode_text(value):
    for encoding in ("utf-8", "cp1254", "latin-1"):
        try:
            return value.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Unsupported text encoding")


def canonical_json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    main()
