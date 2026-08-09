#!/usr/bin/env python3
"""Audit the official HGM Turkey administrative-boundary archive without redistributing it.

Runtime dependencies: pyshp, shapely, pyproj. macOS bsdtar is used to extract RAR input.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import shape as shapely_shape
from shapely.ops import polygonize_full, transform, unary_union


EXPECTED_SHA256 = "da8efe4dcbe47e5e8a8a34068e1e729832420634b519fab62303b86254471284"
OFFICIAL_PRODUCT_URL = "https://www.harita.gov.tr/urun/turkiye-mulki-idare-sinirlari/232"
OFFICIAL_DOWNLOAD_URL = (
    "https://www.harita.gov.tr/uploads/files/products/"
    "turkiye-mulki-idare-sinirlari-2083.rar"
)
OFFICIAL_ANNOUNCEMENT_URL = (
    "https://www.harita.gov.tr/haber/ulkemize-ait-ulke-il-ve-ilce-sinirlari-ile-"
    "il-ve-ilce-yerlesim-noktalarini-iceren-vektor-veri-ile-il-ve-ilce-yuz-"
    "olcumleri-bilgisi-internet-sitemizde-ucretsiz-olarak-kullanima-sunulmustur/168"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    archive_bytes = args.archive.read_bytes()
    digest = hashlib.sha256(archive_bytes).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(f"Unexpected archive SHA-256: {digest}")

    with tempfile.TemporaryDirectory(prefix="csc-hgm-boundary-") as temporary:
        extraction_root = Path(temporary)
        subprocess.run(
            ["bsdtar", "-xf", str(args.archive), "-C", str(extraction_root)],
            check=True,
        )
        layers = [audit_layer(path) for path in sorted(extraction_root.rglob("*.shp"))]

    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "producer": "Harita Genel Müdürlüğü (HGM)",
            "productUrl": OFFICIAL_PRODUCT_URL,
            "downloadUrl": OFFICIAL_DOWNLOAD_URL,
            "announcementUrl": OFFICIAL_ANNOUNCEMENT_URL,
            "announcementDate": "2022-04-27",
            "archiveFile": args.archive.name,
            "bytes": len(archive_bytes),
            "sha256": digest,
            "archiveFolder": "İl_İlçe_Sınır_ve_Yerleşim_Verisi_2026",
        },
        "reuseTerms": {
            "price": "free",
            "commercialUse": False,
            "nonCommercialUse": True,
            "redistribution": "allowed only for non-commercial fair use",
            "attributionRequired": True,
            "copyrightHolder": "Harita Genel Müdürlüğü",
            "officialStatus": "indicative/display-only; not official administrative boundaries",
            "productionDecision": (
                "Do not bundle in the general-purpose NPM/MCP/hosted product without separate "
                "written commercial redistribution permission from HGM."
            ),
        },
        "coordinatePolicy": {
            "target": "EPSG:4326",
            "result": (
                "Every layer uses a custom projected CRS based on WGS 84. No direct EPSG authority "
                "code is declared; deterministic conversion to EPSG:4326 uses each .prj WKT."
            ),
        },
        "layers": layers,
    }

    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(output, encoding="utf-8")
    else:
        print(output, end="")


def audit_layer(shp_path: Path) -> dict:
    reader = shapefile.Reader(str(shp_path), encoding="utf-8")
    fields = [
        {"name": name, "type": field_type, "length": length, "decimal": decimal}
        for name, field_type, length, decimal in reader.fields[1:]
    ]
    field_names = [field["name"] for field in fields]
    records = [dict(zip(field_names, record, strict=True)) for record in reader.records()]
    geometries = [shapely_shape(item.__geo_interface__) for item in reader.shapes()]
    object_id_field = next(
        (name for name in field_names if normalize(name) in {"objectid", "fid", "oid"}),
        None,
    )
    object_ids = [record[object_id_field] for record in records] if object_id_field else []
    object_id_counts = Counter(object_ids)
    duplicate_object_ids = sorted(
        [value for value, count in object_id_counts.items() if count > 1], key=str
    )
    geometry_hashes = Counter(geometry.wkb_hex for geometry in geometries if not geometry.is_empty)

    topology = {
        "emptyGeometries": sum(geometry.is_empty for geometry in geometries),
        "zeroLengthGeometries": sum(
            geometry.geom_type in {"LineString", "MultiLineString"} and geometry.length == 0
            for geometry in geometries
        ),
        "invalidGeometries": sum(not geometry.is_valid for geometry in geometries),
        "nonSimpleLines": sum(
            geometry.geom_type in {"LineString", "MultiLineString"} and not geometry.is_simple
            for geometry in geometries
        ),
        "duplicateGeometryGroups": sum(count > 1 for count in geometry_hashes.values()),
        "duplicateGeometryRows": sum(count for count in geometry_hashes.values() if count > 1),
    }

    if reader.shapeType in {3, 13, 23}:
        polygons, cuts, dangles, invalid_rings = polygonize_full(unary_union(geometries))
        topology["polygonize"] = {
            "polygons": geometry_count(polygons),
            "cutEdges": geometry_count(cuts),
            "dangles": geometry_count(dangles),
            "invalidRings": geometry_count(invalid_rings),
        }

    prj_path = shp_path.with_suffix(".prj")
    prj_wkt = decode_text(prj_path.read_bytes()).strip()
    crs = CRS.from_wkt(prj_wkt)
    transformer = Transformer.from_crs(crs, CRS.from_epsg(4326), always_xy=True)
    transformed_bounds = list(transform(transformer.transform, unary_union(geometries)).bounds)
    attribute_quality = {}
    for field in fields:
        name = field["name"]
        values = [record[name] for record in records]
        counts = Counter(str(value).strip() for value in values)
        attribute_quality[name] = {
            "distinct": len(counts),
            "nullOrBlank": sum(value is None or str(value).strip() == "" for value in values),
            "zero": sum(isinstance(value, (int, float)) and value == 0 for value in values),
            **(
                {"valueCounts": dict(sorted(counts.items()))}
                if len(counts) <= 20
                else {}
            ),
        }

    return {
        "name": canonical_layer_name(shp_path.stem),
        "sourceFile": shp_path.name,
        "geometryType": shapefile.SHAPETYPE_LOOKUP.get(reader.shapeType, str(reader.shapeType)),
        "records": len(records),
        "bounds": list(reader.bbox),
        "crs": {
            "authority": crs.to_authority(),
            "name": crs.name,
            "isGeographic": crs.is_geographic,
            "wkt": crs.to_wkt(),
            "target": "EPSG:4326",
            "transformedBounds": transformed_bounds,
        },
        "schema": fields,
        "attributeQuality": attribute_quality,
        "objectId": {
            "field": object_id_field,
            "distinct": len(object_id_counts) if object_id_field else None,
            "duplicateValues": duplicate_object_ids,
            "duplicateRows": sum(count - 1 for count in object_id_counts.values() if count > 1),
        },
        "topology": topology,
    }


def geometry_count(geometry) -> int:
    return len(geometry.geoms) if hasattr(geometry, "geoms") else (0 if geometry.is_empty else 1)


def normalize(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value).lower()
        if not unicodedata.combining(character)
    ).replace("ı", "i")


def decode_text(value: bytes) -> str:
    for encoding in ("utf-8", "cp1254", "latin-1"):
        try:
            return value.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Unsupported text encoding")


def canonical_layer_name(stem: str) -> str:
    key = normalize(stem).replace("_", " ")
    if "yerlesim" in key:
        return "settlement-centers"
    if "ulke" in key:
        return "country-boundary-lines"
    if "ilce" in key:
        return "district-boundary-lines"
    if key.startswith("il "):
        return "province-boundary-lines"
    return key.replace(" ", "-")


if __name__ == "__main__":
    main()
