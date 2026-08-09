#!/usr/bin/env python3
"""Reconcile HGM district centres with the pinned Interior Ministry hierarchy."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import tempfile
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import shape as shapely_shape
from shapely.ops import transform


EXPECTED_HGM_SHA256 = "da8efe4dcbe47e5e8a8a34068e1e729832420634b519fab62303b86254471284"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("official_snapshot", type=Path)
    parser.add_argument("--aliases", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    digest = sha256_file(args.archive)
    if digest != EXPECTED_HGM_SHA256:
        raise SystemExit(f"Unexpected HGM archive SHA-256: {digest}")
    official = json.loads(args.official_snapshot.read_text(encoding="utf-8"))
    aliases = json.loads(args.aliases.read_text(encoding="utf-8"))["aliases"]
    if official["counts"] != {
        "provinces": 81,
        "districts": 922,
        "districtsWithMissingCoordinates": 2,
        "districtsWithOutOfRangeCoordinates": 0,
    }:
        raise SystemExit(f"Unexpected official snapshot counts: {official['counts']}")

    with tempfile.TemporaryDirectory(prefix="csc-hgm-centres-") as temporary:
        root = Path(temporary)
        subprocess.run(["bsdtar", "-xf", str(args.archive), "-C", str(root)], check=True)
        centers_path = next(
            path
            for path in root.rglob("*.shp")
            if "yerlesim" in normalize(path.stem)
        )
        hgm_centers = read_hgm_district_centers(centers_path)

    official_districts = [dict(item) for item in official["districts"]]
    matches, unmatched_hgm, unmatched_official = reconcile(
        hgm_centers, official_districts, aliases
    )
    candidates = build_candidates(unmatched_hgm, unmatched_official)
    measured_matches = [item for item in matches if item["distanceKm"] is not None]
    coordinate_conflicts = [item for item in measured_matches if item["distanceKm"] > 5]
    report = {
        "schemaVersion": 1,
        "sources": {
            "hgm": {"sha256": digest, "districtCenters": len(hgm_centers)},
            "interiorMinistry": {
                "snapshotDate": official["snapshotDate"],
                "url": official["source"]["url"],
                "districts": len(official_districts),
                "listContentSha256": official["source"]["listContentSha256"],
            },
        },
        "counts": {
            "exactMatches": len(matches),
            "unmatchedHgmCenters": len(unmatched_hgm),
            "unmatchedOfficialDistricts": len(unmatched_official),
            "candidatePairs": len(candidates),
            "officialCoordinatesMissing": sum(
                item["officialLatitude"] is None for item in matches
            ),
            "coordinateConflictsOver5Km": len(coordinate_conflicts),
            "coordinateConflictsOver25Km": sum(
                item["distanceKm"] > 25 for item in measured_matches
            ),
        },
        "matches": sorted(matches, key=lambda item: item["officialSourceId"]),
        "reviewQueue": candidates,
        "coordinateReviewQueue": sorted(
            coordinate_conflicts,
            key=lambda item: item["distanceKm"],
            reverse=True,
        ),
        "unmatchedHgmCenters": [center_summary(item) for item in unmatched_hgm],
        "unmatchedOfficialDistricts": unmatched_official,
        "gate": {
            "passes": False,
            "hierarchyPasses": not unmatched_hgm and not unmatched_official,
            "coordinatePasses": not coordinate_conflicts,
            "requiresReviewedAliases": bool(unmatched_hgm or unmatched_official),
            "officialDistrictCodeAvailable": False,
            "note": (
                "The public Interior Ministry source confirms names, parents and most coordinates, "
                "but exposes no authoritative district code. A product ID must not be represented "
                "as an official government code."
            ),
        },
    }
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def reconcile(hgm_centers, official_districts, aliases):
    hgm_by_name = defaultdict(list)
    official_by_name = defaultdict(list)
    for center in hgm_centers:
        hgm_by_name[normalize(center["sourceName"])].append(center)
    for district in official_districts:
        official_by_name[normalize(district["name"])].append(district)

    matches = []
    used_hgm = set()
    used_official = set()
    for name in sorted(hgm_by_name.keys() & official_by_name.keys()):
        hgm_group = hgm_by_name[name]
        official_group = official_by_name[name]
        pairs = []
        for hgm_index, hgm in enumerate(hgm_group):
            for official_index, official in enumerate(official_group):
                distance = coordinate_distance(hgm, official)
                pairs.append(
                    (
                        distance if distance is not None else math.inf,
                        hgm_index,
                        official_index,
                        distance,
                    )
                )
        paired_hgm = set()
        paired_official = set()
        for _sort_distance, hgm_index, official_index, distance in sorted(pairs):
            if hgm_index in paired_hgm or official_index in paired_official:
                continue
            hgm = hgm_group[hgm_index]
            official = official_group[official_index]
            paired_hgm.add(hgm_index)
            paired_official.add(official_index)
            used_hgm.add(id(hgm))
            used_official.add(official["sourceId"])
            matches.append(match_summary(hgm, official, distance))
        remaining_hgm = [item for index, item in enumerate(hgm_group) if index not in paired_hgm]
        remaining_official = [
            item for index, item in enumerate(official_group) if index not in paired_official
        ]
        if len(remaining_hgm) == len(remaining_official):
            for hgm, official in zip(remaining_hgm, remaining_official, strict=True):
                used_hgm.add(id(hgm))
                used_official.add(official["sourceId"])
                matches.append(match_summary(hgm, official, None))

    official_by_id = {item["sourceId"]: item for item in official_districts}
    hgm_by_alias_name = {
        normalize(item["sourceName"]): item
        for item in hgm_centers
        if id(item) not in used_hgm
    }
    for alias in aliases:
        hgm = hgm_by_alias_name.get(normalize(alias["hgmSourceName"]))
        official = official_by_id.get(alias["officialSourceId"])
        if not hgm or not official:
            raise ValueError(f"Reviewed alias cannot be resolved: {alias}")
        if official["sourceId"] in used_official:
            raise ValueError(f"Reviewed alias reuses official district: {alias}")
        distance = coordinate_distance(hgm, official)
        item = match_summary(hgm, official, distance)
        item["matchMethod"] = "reviewed-alias"
        item["reviewReason"] = alias["reason"]
        matches.append(item)
        used_hgm.add(id(hgm))
        used_official.add(official["sourceId"])

    unmatched_hgm = [item for item in hgm_centers if id(item) not in used_hgm]
    unmatched_official = [
        item for item in official_districts if item["sourceId"] not in used_official
    ]
    return matches, unmatched_hgm, unmatched_official


def build_candidates(unmatched_hgm, unmatched_official):
    result = []
    for hgm in unmatched_hgm:
        ranked = []
        for official in unmatched_official:
            distance = coordinate_distance(hgm, official)
            similarity = SequenceMatcher(
                None, normalize(hgm["sourceName"]), normalize(official["name"])
            ).ratio()
            score = (distance if distance is not None else 500) + (1 - similarity) * 50
            ranked.append(
                {
                    "officialSourceId": official["sourceId"],
                    "officialName": official["name"],
                    "provinceCode": official["provinceCode"],
                    "provinceName": official["provinceName"],
                    "distanceKm": round(distance, 3) if distance is not None else None,
                    "nameSimilarity": round(similarity, 4),
                    "score": round(score, 3),
                }
            )
        result.append(
            {
                "hgm": center_summary(hgm),
                "candidates": sorted(ranked, key=lambda item: item["score"])[:3],
            }
        )
    return sorted(result, key=lambda item: normalize(item["hgm"]["sourceName"]))


def read_hgm_district_centers(path):
    reader = shapefile.Reader(str(path), encoding="utf-8")
    fields = [item[0] for item in reader.fields[1:]]
    source_crs = CRS.from_wkt(decode_text(path.with_suffix(".prj").read_bytes()).strip())
    transformer = Transformer.from_crs(source_crs, CRS.from_epsg(4326), always_xy=True)
    result = []
    for record, source_shape in zip(reader.records(), reader.shapes(), strict=True):
        values = dict(zip(fields, record, strict=True))
        if values["KATEGORI"] != "İLÇE":
            continue
        point = transform(transformer.transform, shapely_shape(source_shape.__geo_interface__))
        result.append(
            {
                "sourceName": values["Adı"].strip(),
                "latitude": round(point.y, 8),
                "longitude": round(point.x, 8),
            }
        )
    if len(result) != 922:
        raise ValueError(f"Expected 922 HGM district centres; received {len(result)}")
    return result


def match_summary(hgm, official, distance):
    return {
        "officialSourceId": official["sourceId"],
        "officialName": official["name"],
        "provinceCode": official["provinceCode"],
        "provinceName": official["provinceName"],
        "hgmSourceName": hgm["sourceName"],
        "hgmLatitude": hgm["latitude"],
        "hgmLongitude": hgm["longitude"],
        "officialLatitude": official["latitude"],
        "officialLongitude": official["longitude"],
        "distanceKm": round(distance, 3) if distance is not None else None,
        "matchMethod": "normalized-name",
    }


def coordinate_distance(left, right):
    if right.get("latitude") is None or right.get("longitude") is None:
        return None
    return haversine_km(
        left["latitude"], left["longitude"], right["latitude"], right["longitude"]
    )


def haversine_km(latitude1, longitude1, latitude2, longitude2):
    radius = 6371.0088
    phi1, phi2 = math.radians(latitude1), math.radians(latitude2)
    delta_phi = math.radians(latitude2 - latitude1)
    delta_lambda = math.radians(longitude2 - longitude1)
    value = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(value))


def center_summary(center):
    return {
        "sourceName": center["sourceName"],
        "latitude": center["latitude"],
        "longitude": center["longitude"],
    }


def normalize(value):
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value).casefold()
        if not unicodedata.combining(character)
    ).replace("ı", "i").replace("_", " ").strip()


def decode_text(value):
    for encoding in ("utf-8", "cp1254", "latin-1"):
        try:
            return value.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Unsupported text encoding")


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    main()
