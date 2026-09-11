#!/usr/bin/env python3
"""Extract the Falcon 900B QRH1 Rev02 performance grids into traceable JSON.

The extractor reads the digitally generated Dassault/FlightSafety QRH tables.
It does not interpolate or extrapolate. Runtime interpolation is intentionally
kept separate and bounded by the extracted grid.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pdfplumber


SOURCE_ID = "DGAC18DSOF182A"
SOURCE_REVISION = "Rev02"
SOURCE_DATE = "2021-04-15"


def joined(words):
    return "".join(w["text"] for w in sorted(words, key=lambda item: item["x0"]))


def number(text):
    value = text.strip().replace(" ", "").replace(",", ".")
    if not value or value == "-":
        return None
    return float(value) if "." in value else int(value)


def grouped_tops(words, tolerance=0.7):
    groups = []
    for word in sorted(words, key=lambda item: (item["top"], item["x0"])):
        if not groups or abs(word["top"] - groups[-1][0]) > tolerance:
            groups.append([word["top"], [word]])
        else:
            groups[-1][1].append(word)
    return groups


def temperatures(words):
    candidates = []
    for word in words:
        text = word["text"]
        if re.fullmatch(r"[+-]\d+(?:\.\d+)?", text):
            candidates.append((word["top"], word))
    by_top = grouped_tops([item[1] for item in candidates], tolerance=0.4)
    row = max(by_top, key=lambda item: len(item[1]))[1]
    return [
        {"value_c": float(w["text"]), "center": (w["x0"] + w["x1"]) / 2, "top": w["top"]}
        for w in sorted(row, key=lambda item: item["x0"])
    ]


def column_bounds(temp_row, left_floor, right_ceiling):
    centers = [item["center"] for item in temp_row]
    bounds = []
    for index, center in enumerate(centers):
        if index == 0:
            left = left_floor
        else:
            left = (centers[index - 1] + center) / 2
        if index == len(centers) - 1:
            right = right_ceiling
        else:
            right = (center + centers[index + 1]) / 2
        bounds.append((left, right))
    return bounds


def weight_rows(words, minimum_top, maximum_x):
    candidates = [w for w in words if minimum_top < w["top"] < 700 and 75 < w["x0"] < maximum_x]
    rows = []
    for top, row_words in grouped_tops(candidates):
        raw = joined(row_words)
        match = re.fullmatch(r"(\d{2})(000|500)", raw)
        if match:
            rows.append((int(match.group(1) + match.group(2)), top))
    return rows


def line_fields(words, target_top, left, right, field_count):
    line = [
        w for w in words
        if abs(w["top"] - target_top) <= 1.25 and left <= (w["x0"] + w["x1"]) / 2 < right
    ]
    width = (right - left) / field_count
    values = []
    for index in range(field_count):
        start = left + index * width
        end = right if index == field_count - 1 else start + width
        values.append(joined([w for w in line if start <= (w["x0"] + w["x1"]) / 2 < end]))
    return values


def simple_speed_table(page, weight_label):
    text = page.extract_text(x_tolerance=1, y_tolerance=2) or ""
    pairs = re.findall(r"^\s*(\d{2})\s*(000|500)\s+(\d{3})\s*$", text, flags=re.MULTILINE)
    return [{"weight_lb": int(a + b), weight_label: int(speed)} for a, b, speed in pairs]


def takeoff_metadata(table_number):
    group = (table_number - 1) // 4
    return {
        "table": f"50-10 page {table_number}",
        "flaps_deg": 7 if group < 4 else 20,
        "surface": "DRY" if group in (0, 2, 4, 6) else "WET",
        "anti_ice": "OFF" if group in (0, 1, 4, 5) else "ON",
        "pressure_altitude_ft": (table_number - 1) % 4 * 2000,
    }


def extract_takeoff_page(page, table_number):
    words = page.extract_words(x_tolerance=1, y_tolerance=2)
    temp_row = temperatures(words)
    bounds = column_bounds(temp_row, 130, 405) if len(temp_row) == 3 else column_bounds(temp_row, 112, 420)
    rows = weight_rows(words, temp_row[0]["top"] + 4, 132 if len(temp_row) == 3 else 115)
    cells = []
    for weight, weight_top in rows:
        for temp, (left, right) in zip(temp_row, bounds):
            first = line_fields(words, weight_top - 8.88, left, right, 3)
            second = line_fields(words, weight_top + 0.12, left, right, 3)
            third = line_fields(words, weight_top + 9.00, left, right, 3)
            raw = first + second + third
            cells.append({
                "weight_lb": weight,
                "temperature_c": temp["value_c"],
                "v1_kt": number(first[0]),
                "n1_sc_pct": None if first[1] in ("", "-") else first[1],
                "second_segment_gross_gradient_pct": number(first[2]),
                "vr_v2_kt": number(second[0]),
                "acceleration_g": number(second[1]),
                "balanced_field_length_ft": number(second[2]),
                "vft_kt": number(third[0]),
                "pitch_deg": number(third[1]),
                "limit_code": None if third[2] in ("", "-") else third[2],
                "source_available": any(value not in ("", "-") for value in raw),
            })
    return {**takeoff_metadata(table_number), "temperatures_c": [x["value_c"] for x in temp_row], "cells": cells}


def landing_metadata(table_number):
    return {
        "table": f"50-25 page {table_number}",
        "anti_ice": "OFF" if table_number <= 5 else "ON",
        "pressure_altitude_ft": ((table_number - 2) % 4) * 2000,
        "approach_flaps_deg": 20,
        "landing_flaps_deg": 40,
    }


def extract_landing_page(page, table_number):
    words = page.extract_words(x_tolerance=1, y_tolerance=2)
    temp_row = temperatures(words)
    bounds = column_bounds(temp_row, 180, 390)
    rows = weight_rows(words, temp_row[0]["top"] + 4, bounds[0][0])
    cells = []
    for weight, weight_top in rows:
        for temp, (left, right) in zip(temp_row, bounds):
            first = line_fields(words, weight_top - 9.00, left, right, 2)
            second = line_fields(words, weight_top + 0.24, left, right, 2)
            third = line_fields(words, weight_top + 9.48, left, right, 2)
            raw = first + second + third
            cells.append({
                "weight_lb": weight,
                "temperature_c": temp["value_c"],
                "landing_distance_ft": number(first[0]),
                "approach_climb_gradient_pct": number(first[1]),
                "landing_distance_x_1_67_ft": number(second[0]),
                "landing_climb_gradient_pct": number(second[1]),
                "landing_distance_x_1_92_ft": number(third[0]),
                "source_available": any(value not in ("", "-") for value in raw),
            })
    return {**landing_metadata(table_number), "temperatures_c": [x["value_c"] for x in temp_row], "cells": cells}


def validate(data):
    assert len(data["takeoff"]) == 32
    assert len(data["landing"]) == 8
    assert len(data["vft_vfr"]) == 20
    assert len(data["vref"]) == 20
    for table in data["takeoff"]:
        assert len(table["temperatures_c"]) in (3, 4)
        assert len(table["cells"]) == len(table["temperatures_c"]) * len({c["weight_lb"] for c in table["cells"]})
    for table in data["landing"]:
        assert len(table["temperatures_c"]) == 4
        assert len(table["cells"]) == 80
    assert sum(len(table["cells"]) for table in data["takeoff"]) == 2368
    assert sum(len(table["cells"]) for table in data["landing"]) == 640

    sample = next(
        cell for cell in data["takeoff"][0]["cells"]
        if cell["weight_lb"] == 32000 and cell["temperature_c"] == 30
    )
    assert sample["v1_kt"] == 97
    assert sample["vr_v2_kt"] == 115
    assert sample["balanced_field_length_ft"] == 3278
    assert sample["vft_kt"] == 156

    wet_min_v1_sample = next(
        cell for cell in data["takeoff"][4]["cells"]
        if cell["weight_lb"] == 28000 and cell["temperature_c"] == 0
    )
    assert wet_min_v1_sample["balanced_field_length_ft"] == 3795
    assert wet_min_v1_sample["pitch_deg"] is None
    assert wet_min_v1_sample["limit_code"] is None

    landing_sample = next(
        cell for cell in data["landing"][0]["cells"]
        if cell["weight_lb"] == 28000 and cell["temperature_c"] == 45
    )
    assert landing_sample["landing_distance_ft"] == 2356
    assert landing_sample["landing_distance_x_1_67_ft"] == 3934
    assert landing_sample["landing_climb_gradient_pct"] == 18.2

    for table in data["takeoff"]:
        for cell in table["cells"]:
            if not cell["source_available"]:
                continue
            assert 80 <= cell["v1_kt"] <= 180
            assert 80 <= cell["vr_v2_kt"] <= 200
            assert 100 <= cell["vft_kt"] <= 220
            assert 2000 <= cell["balanced_field_length_ft"] <= 20000
    for table in data["landing"]:
        for cell in table["cells"]:
            assert 1500 <= cell["landing_distance_ft"] <= 10000


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with pdfplumber.open(args.source) as document:
        data = {
            "aircraft": "Falcon 900B",
            "source": {
                "document": "Falcon 900B Quick Reference Handbook 1 - Performance",
                "document_id": SOURCE_ID,
                "revision": SOURCE_REVISION,
                "revision_date": SOURCE_DATE,
                "use": "Development/validation only; bounded interpolation; no extrapolation",
            },
            "structural_limits_lb": {
                "maximum_ramp_weight": 45700,
                "maximum_takeoff_weight": 45500,
                "maximum_landing_weight": 42000,
                "maximum_zero_fuel_weight": 28220,
                "minimum_flight_weight": 20700,
            },
            "limit_codes": {
                "1": "Structural",
                "2": "Climb",
                "3": "Dry runway",
                "4": "Minimum V1",
                "5": "Maximum brake-energy speed",
                "6": "VR",
            },
            "vft_vfr": simple_speed_table(document.pages[7], "vft_kt"),
            "vref": simple_speed_table(document.pages[40], "vref_kt"),
            "takeoff": [extract_takeoff_page(document.pages[8 + index], index + 1) for index in range(32)],
            "landing": [extract_landing_page(document.pages[41 + index], index + 2) for index in range(8)],
        }

    for row in data["vft_vfr"]:
        row["vfr_rule"] = "V2 + 25 kt"
    validate(data)
    args.output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.output} ({args.output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
