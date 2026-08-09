#!/usr/bin/env python3
"""Reproducible structural audit for the CountryStateCity JSON datasets."""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path
from zoneinfo import available_timezones


ADMINISTRATIVE_SUFFIXES = (
    "metropolitan collectivity with special status",
    "districts under republic administration",
    "special self-governing province",
    "special administrative region",
    "autonomous territorial unit",
    "overseas collectivity with special status",
    "decentralized regional entity",
    "free municipal consortium",
    "federal capital territory",
    "metropolitan administration",
    "special self-governing city",
    "special island authority",
    "metropolitan department",
    "administrative territory",
    "district municipality",
    "metropolitan district",
    "administrative region",
    "autonomous municipality",
    "autonomous community",
    "autonomous republic",
    "autonomous province",
    "autonomous district",
    "autonomous region",
    "metropolitan region",
    "metropolitan city",
    "special municipality",
    "rural municipality",
    "urban municipality",
    "city municipality",
    "unitary authority",
    "capital territory",
    "capital district",
    "federal territory",
    "federal district",
    "municipal district",
    "council area",
    "london borough",
    "local council",
    "two-tier county",
    "city with county rights",
    "union territory",
    "administrative atoll",
    "island council",
    "outlying area",
    "geographical unit",
    "regional unit",
    "administered area",
    "federal dependency",
    "municipality",
    "governorate",
    "prefecture",
    "department",
    "province",
    "district",
    "county",
    "region",
    "canton",
    "parish",
    "territory",
    "oblast",
    "krai",
    "republic",
    "state",
    "voivodship",
    "division",
    "popularate",
    "borough",
    "ward",
    "administration",
    "commune",
    "emirate",
)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def name_hygiene(rows: list[dict]) -> dict:
    names = [str(row.get("name") or "") for row in rows]
    return {
        "outerWhitespace": sum(name != name.strip() for name in names),
        "repeatedWhitespace": sum(bool(re.search(r"\s{2,}", name)) for name in names),
        "controlCharacters": sum(bool(re.search(r"[\x00-\x1f\x7f]", name)) for name in names),
        "replacementCharacters": sum("\ufffd" in name for name in names),
    }


def normalized_name_duplicate_groups(rows: list[dict], parent_field: str) -> list[list[dict]]:
    grouped: dict[tuple, list[dict]] = defaultdict(list)
    for row in rows:
        key = (row.get(parent_field), normalize_text(str(row.get("name") or "")).casefold())
        grouped[key].append(row)
    return [group for group in grouped.values() if len(group) > 1]


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_m = 6_371_008.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    value = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius_m * math.asin(math.sqrt(value))


def duplicate_groups(rows: list[dict], field: str) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[str(row.get(field))].append(row)
    return {key: value for key, value in grouped.items() if len(value) > 1}


def audit(repo_root: Path) -> dict:
    data_dir = repo_root / "data"
    countries = load_json(data_dir / "country.json")
    states = load_json(data_dir / "state.json")
    cities = load_json(data_dir / "city.json")
    optimized = load_json(data_dir / "city-optimized.json")
    display_metadata = load_json(data_dir / "location-display.json")
    country_display_metadata = display_metadata.get("countries", {})
    subdivision_metadata = display_metadata.get("subdivisions", {})

    country_by_id = {row["id"]: row for row in countries}
    state_by_id = {row["id"]: row for row in states}
    country_ids = set(country_by_id)
    state_ids = set(state_by_id)

    duplicate_city_ids = duplicate_groups(cities, "id")
    exact_city_keys: dict[tuple, list[int]] = defaultdict(list)
    for row in cities:
        key = (
            row.get("name"), row.get("stateId"), row.get("countryId"),
            row.get("latitude"), row.get("longitude"), row.get("wikiDataId"),
        )
        exact_city_keys[key].append(row["id"])
    exact_city_duplicates = [
        {"name": key[0], "stateId": key[1], "countryId": key[2], "ids": ids}
        for key, ids in exact_city_keys.items() if len(ids) > 1
    ]

    state_orphans = [row["id"] for row in states if row.get("countryId") not in country_ids]
    city_country_orphans = [row["id"] for row in cities if row.get("countryId") not in country_ids]
    city_state_orphans = [row["id"] for row in cities if row.get("stateId") not in state_ids]

    city_mismatch = Counter()
    for row in cities:
        country = country_by_id.get(row.get("countryId"))
        state = state_by_id.get(row.get("stateId"))
        if country and row.get("countryName") != country.get("name"):
            city_mismatch["countryName"] += 1
        if state and row.get("stateName") != state.get("name"):
            city_mismatch["stateName"] += 1
        if state and row.get("stateCode") != state.get("stateCode"):
            city_mismatch["stateCode"] += 1

    state_country_name_mismatch = sum(
        1 for row in states
        if row.get("countryId") in country_by_id
        and row.get("countryName") != country_by_id[row["countryId"]].get("name")
    )

    states_per_country = Counter(row.get("countryId") for row in states)
    cities_per_country = Counter(row.get("countryId") for row in cities)
    cities_per_state = Counter(row.get("stateId") for row in cities)

    qid_groups: dict[str, list[dict]] = defaultdict(list)
    missing_qids = 0
    invalid_qids = 0
    for row in cities:
        qid = row.get("wikiDataId")
        if not qid:
            missing_qids += 1
        elif not re.fullmatch(r"Q\d+", str(qid)):
            invalid_qids += 1
        else:
            qid_groups[str(qid)].append(row)
    duplicate_qid_groups = {key: rows for key, rows in qid_groups.items() if len(rows) > 1}
    duplicate_qid_rows = sum(len(rows) for rows in duplicate_qid_groups.values())
    cross_state_qids = sum(1 for rows in duplicate_qid_groups.values() if len({r.get("stateId") for r in rows}) > 1)
    cross_country_qids = sum(1 for rows in duplicate_qid_groups.values() if len({r.get("countryId") for r in rows}) > 1)

    optimized_by_id = defaultdict(list)
    for row in optimized:
        optimized_by_id[row["i"]].append(row)
    optimized_identity_mismatch = 0
    max_rounding_error_m = 0.0
    coordinate_differences = 0
    for row in cities:
        candidates = optimized_by_id.get(row["id"], [])
        match = next((x for x in candidates if x.get("n") == row.get("name") and x.get("s") == row.get("stateId")), None)
        if match is None:
            optimized_identity_mismatch += 1
            continue
        try:
            original_lat, original_lon = float(row["latitude"]), float(row["longitude"])
            compact_lat, compact_lon = float(match["la"]), float(match["lo"])
            distance = haversine_m(original_lat, original_lon, compact_lat, compact_lon)
            if distance:
                coordinate_differences += 1
                max_rounding_error_m = max(max_rounding_error_m, distance)
        except (TypeError, ValueError):
            pass

    valid_timezones = available_timezones()
    timezone_entries = [timezone for country in countries for timezone in (country.get("timezones") or [])]
    invalid_timezone_names = [
        timezone.get("zoneName") for timezone in timezone_entries
        if timezone.get("zoneName") not in valid_timezones
    ]

    state_type_counts = Counter(row.get("type") for row in states)
    normalized_types = Counter(
        str(row.get("type")).strip().casefold()
        for row in states if row.get("type") is not None
    )

    state_keys = {f'{row.get("countryCode")}-{row.get("stateCode")}' for row in states}
    metadata_keys = set(subdivision_metadata)
    metadata_type_values = ADMINISTRATIVE_SUFFIXES

    naming_source_counts = Counter()
    display_name_changes = 0
    resolved_types = 0
    for row in states:
        key = f'{row.get("countryCode")}-{row.get("stateCode")}'
        canonical_name = normalize_text(str(row.get("name") or ""))
        metadata_entry = subdivision_metadata.get(key)
        if metadata_entry:
            naming_source_counts["verified"] += 1
            display_name = normalize_text(str(metadata_entry.get("name") or canonical_name))
            display_type = normalize_text(str(metadata_entry.get("type") or ""))
        else:
            display_name = canonical_name
            display_type = normalize_text(str(row.get("type") or ""))
            naming_source_counts["source"] += bool(display_type)

            if not display_type:
                lower_name = display_name.casefold()
                inferred_type = next(
                    (value for value in metadata_type_values if lower_name.endswith(f" {value}")),
                    "",
                )
                if inferred_type:
                    display_type = inferred_type
                    display_name = display_name[: -(len(inferred_type) + 1)].strip()
                    naming_source_counts["inferred"] += 1
                else:
                    naming_source_counts["unknown"] += 1

        display_name_changes += display_name != canonical_name
        resolved_types += bool(display_type)

    state_name_duplicates = normalized_name_duplicate_groups(states, "countryId")
    city_name_duplicates = normalized_name_duplicate_groups(cities, "stateId")
    country_display_name_changes = sum(
        normalize_text(str(country_display_metadata.get(row.get("iso2"), {}).get("name") or row.get("name")))
        != normalize_text(str(row.get("name") or ""))
        for row in countries
    )
    place_display_name_changes = 0
    place_explicit_type_counts = Counter()
    for row in cities:
        raw_name = str(row.get("name") or "")
        display_name = normalize_text(raw_name)
        lower_name = display_name.casefold()
        inferred_type = next(
            (value for value in ADMINISTRATIVE_SUFFIXES if lower_name.endswith(f" {value}")),
            "",
        )
        if inferred_type:
            place_explicit_type_counts[inferred_type] += 1
            display_name = display_name[: -(len(inferred_type) + 1)].strip()
        place_display_name_changes += display_name != raw_name

    result = {
        "scope": {
            "countries": len(countries),
            "states": len(states),
            "cities": len(cities),
            "optimizedCities": len(optimized),
        },
        "identity": {
            "duplicateCountryIdGroups": len(duplicate_groups(countries, "id")),
            "duplicateStateIdGroups": len(duplicate_groups(states, "id")),
            "duplicateCityIdGroups": len(duplicate_city_ids),
            "duplicateCityIds": {
                key: [
                    {"name": row.get("name"), "stateName": row.get("stateName"), "countryName": row.get("countryName")}
                    for row in rows
                ] for key, rows in duplicate_city_ids.items()
            },
            "exactDuplicateCityEntities": exact_city_duplicates,
        },
        "referentialIntegrity": {
            "orphanStates": len(state_orphans),
            "orphanCityCountries": len(city_country_orphans),
            "orphanCityStates": len(city_state_orphans),
            "cityDenormalizedMismatchTotal": sum(city_mismatch.values()),
            "cityDenormalizedMismatchByField": dict(city_mismatch),
            "stateCountryNameMismatches": state_country_name_mismatch,
        },
        "coverage": {
            "countriesWithoutStates": sum(1 for row in countries if not states_per_country[row["id"]]),
            "countriesWithoutCities": sum(1 for row in countries if not cities_per_country[row["id"]]),
            "statesWithoutCities": sum(1 for row in states if not cities_per_state[row["id"]]),
            "statesWithoutCoordinates": sum(
                1 for row in states if row.get("latitude") in (None, "") or row.get("longitude") in (None, "")
            ),
            "countriesWithZeroZeroCoordinates": [
                row.get("iso2") for row in countries
                if row.get("latitude") not in (None, "") and row.get("longitude") not in (None, "")
                and float(row["latitude"]) == 0.0 and float(row["longitude"]) == 0.0
            ],
        },
        "wikidata": {
            "missingQids": missing_qids,
            "invalidQidFormat": invalid_qids,
            "distinctNonemptyQids": len(qid_groups),
            "duplicateQidGroups": len(duplicate_qid_groups),
            "rowsInDuplicateQidGroups": duplicate_qid_rows,
            "crossStateDuplicateQidGroups": cross_state_qids,
            "crossCountryDuplicateQidGroups": cross_country_qids,
            "maxQidMultiplicity": max((len(rows) for rows in qid_groups.values()), default=0),
        },
        "schema": {
            "stateTypeNulls": state_type_counts.get(None, 0),
            "stateTypeRawDistinct": len(state_type_counts) - (1 if None in state_type_counts else 0),
            "stateTypeNormalizedDistinct": len(normalized_types),
            "translationKeySets": len({tuple(sorted((row.get("translations") or {}).keys())) for row in countries}),
        },
        "naming": {
            "nameHygiene": {
                "countries": name_hygiene(countries),
                "states": name_hygiene(states),
                "cities": name_hygiene(cities),
            },
            "normalizedDuplicateStateNameGroupsWithinCountry": len(state_name_duplicates),
            "normalizedDuplicateCityNameGroupsWithinState": len(city_name_duplicates),
            "displayMetadata": {
                "sourceRelease": display_metadata.get("source", {}).get("release"),
                "sourceRevision": display_metadata.get("source", {}).get("revision"),
                "metadataSubdivisions": len(metadata_keys),
                "localSubdivisionsMatchedByCode": len(state_keys & metadata_keys),
                "localSubdivisionsNotInCurrentSource": len(state_keys - metadata_keys),
                "currentSourceSubdivisionsNotInLocalData": len(metadata_keys - state_keys),
                "displayNameChanges": display_name_changes,
                "typeCoverageBefore": len(states) - state_type_counts.get(None, 0),
                "typeCoverageAfter": resolved_types,
                "typeUnresolvedAfter": len(states) - resolved_types,
                "resolutionSourceCounts": dict(naming_source_counts),
            },
            "countryDisplay": {
                "metadataRows": len(country_display_metadata),
                "displayNameChanges": country_display_name_changes,
                "locale": display_metadata.get("countryNameStandard", {}).get("locale"),
                "standard": display_metadata.get("countryNameStandard", {}).get("api"),
            },
            "cityEntityType": {
                "available": False,
                "affectedRows": len(cities),
                "explicitAdministrativeSuffixRows": sum(place_explicit_type_counts.values()),
                "untypedRowsAfterSafeInference": len(cities) - sum(place_explicit_type_counts.values()),
                "displayNameChanges": place_display_name_changes,
                "inferredTypeCounts": dict(place_explicit_type_counts.most_common()),
                "note": "The source city schema has no feature/entity type. Only categories explicitly present as a name suffix are separated; other rows cannot safely be labelled city, town, village, or district.",
            },
        },
        "timezones": {
            "entries": len(timezone_entries),
            "invalidIanaZoneNames": invalid_timezone_names,
            "note": "gmtOffset is a static snapshot and can be wrong during daylight-saving changes; zoneName is authoritative.",
        },
        "optimizedParity": {
            "identityMismatches": optimized_identity_mismatch,
            "rowsWithRoundedCoordinates": coordinate_differences,
            "maxRoundingErrorMeters": round(max_rounding_error_m, 3),
        },
    }
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = audit(args.repo.resolve())
    payload = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
    print(payload)


if __name__ == "__main__":
    main()
