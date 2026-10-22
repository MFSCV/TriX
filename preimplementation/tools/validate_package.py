#!/usr/bin/env python3
"""Validate the proposed TriX 0.2 companion contracts and indexed fixtures.

This tool checks a documentation package. It is not a TriX compiler, production
semantic verifier, authorization service, runtime test or hardware qualification.
It never resolves an opaque reference, retrieves a schema or installs a package.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
from importlib.metadata import version
import json
import math
from pathlib import Path
import sys


SCHEMA_NAMES = (
    "task-request", "capability-manifest", "task-record", "test-evidence"
)
DRAFT = "https://json-schema.org/draft/2020-12/schema"
MAX_FILE_BYTES = 2 * 1024 * 1024
INT64_MAX = 9223372036854775807
SUPPORTED_REQUIRED_FEATURES: frozenset[str] = frozenset()
TERMINAL_STATES = {"SUCCEEDED", "FAILED", "CANCELLED"}


class RecordParseError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class PackageError(ValueError):
    pass


def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise RecordParseError("DUPLICATE_KEY", "Duplicate JSON object key.")
        result[key] = value
    return result


def no_nonfinite_literal(_value):
    raise RecordParseError("NON_FINITE_NUMBER", "Non-finite JSON number.")


def finite_float(value):
    number = float(value)
    if not math.isfinite(number):
        raise RecordParseError(
            "NON_FINITE_NUMBER", "JSON number exceeds the finite parser range."
        )
    return number


def load_json(path: Path):
    if path.stat().st_size > MAX_FILE_BYTES:
        raise RecordParseError("INPUT_TOO_LARGE", "File exceeds the package checker limit.")
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    try:
        parsed = json.loads(
            raw.decode("utf-8"),
            object_pairs_hook=no_duplicate_keys,
            parse_constant=no_nonfinite_literal,
            parse_float=finite_float,
        )
    except RecordParseError:
        raise
    except (UnicodeError, ValueError, RecursionError) as exc:
        raise RecordParseError("INVALID_JSON", "Invalid UTF-8 JSON document.") from exc
    return parsed, digest


def pointer(parts):
    return "".join("/" + str(part).replace("~", "~0").replace("/", "~1") for part in parts)


def issue(stage, code, path, message):
    return {"code": f"{stage}:{code}", "instance_path": path, "message": message}


def schema_errors(validator, instance):
    errors = []
    for error in validator.iter_errors(instance):
        errors.append({
            "code": f"schema:{error.validator}",
            "instance_path": pointer(error.absolute_path),
            "schema_path": pointer(error.absolute_schema_path),
            "message": f"Constraint '{error.validator}' was not satisfied.",
        })
    return sorted(errors, key=lambda entry: (entry["instance_path"], entry["schema_path"]))


def ensure_local_references(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"$ref", "$dynamicRef"} and (
                not isinstance(child, str) or not child.startswith("#/")
            ):
                raise PackageError("Companion schemas must use local fragment references only.")
            ensure_local_references(child)
    elif isinstance(value, list):
        for child in value:
            ensure_local_references(child)


def check_unique(items, field, path, errors):
    seen = set()
    for index, item in enumerate(items):
        value = item[field]
        if value in seen:
            errors.append(issue("semantic", "DUPLICATE_IDENTIFIER", f"{path}/{index}/{field}",
                                "Identifier is repeated within this record collection."))
        seen.add(value)


def selected_semantic_errors(name, record):
    """Check only the explicitly documented local invariants, after schema validation."""
    errors = []
    integer_paths = []
    if name == "task-request":
        integer_paths = [
            ("requirements", "cpu_threads_min"),
            ("requirements", "memory_bytes_min"),
            ("requirements", "accelerator_memory_bytes_min"),
            ("budget", "wall_time_limit_ms"),
            ("budget", "transfer_bytes_limit"),
            ("retry", "max_attempts"),
            ("retry", "max_elapsed_ms"),
        ]
        check_unique(record["inputs"], "name", "/inputs", errors)
        check_unique(record["outputs"], "name", "/outputs", errors)
        declared_outputs = {output["name"] for output in record["outputs"]}
        for index, output in enumerate(record["completion"]["required_outputs"]):
            if output not in declared_outputs:
                errors.append(issue("semantic", "UNDECLARED_REQUIRED_OUTPUT",
                                    f"/completion/required_outputs/{index}",
                                    "Completion refers to an undeclared output name."))
        for index, feature in enumerate(record["required_features"]):
            if feature not in SUPPORTED_REQUIRED_FEATURES:
                errors.append(issue("semantic", "UNSUPPORTED_REQUIRED_FEATURE",
                                    f"/required_features/{index}",
                                    "The companion subset supports no additional mandatory features."))
        if record["retry"]["mode"] == "NEVER" and record["retry"]["max_attempts"] != "1":
            errors.append(issue("semantic", "RETRY_POLICY_CONTRADICTION", "/retry/max_attempts",
                                "A NEVER retry policy permits one initial attempt."))
    elif name == "task-record":
        integer_paths = [("task_version",), ("controller_epoch",),
                         ("last_event", "controller_epoch")]
        check_unique(record["effects"], "effect_id", "/effects", errors)
        check_unique(record["outputs"], "name", "/outputs", errors)
        attempt = record["attempt"]
        if record["lifecycle"] in {"RUNNING", "CANCELLING"} and attempt is None:
            errors.append(issue("semantic", "MISSING_BOUND_ATTEMPT", "/attempt",
                                "This lifecycle requires a bound attempt record."))
        decision = record["terminal_decision"]
        if record["lifecycle"] in TERMINAL_STATES and decision["status"] == "CURRENT":
            for index, effect in enumerate(record["effects"]):
                if effect["outcome"] == "UNKNOWN":
                    errors.append(issue("semantic", "UNRESOLVED_TERMINAL_EFFECT",
                                        f"/effects/{index}/outcome",
                                        "A current terminal decision cannot hide an unresolved effect."))
            if record["lifecycle"] == "CANCELLED":
                disposition = record["cancellation"]["disposition"]
                if disposition == "EXECUTION_STOPPED" and not (
                    attempt is not None and attempt["execution"] == "STOPPED"
                    and attempt["knowledge"] == "CONFIRMED"
                ):
                    errors.append(issue("semantic", "CANCELLED_STOP_NOT_CONFIRMED", "/attempt",
                                        "The claimed stopped disposition lacks a confirmed STOPPED observation."))
                if disposition == "NO_DISPATCH" and not (
                    attempt is None or (
                        attempt["execution"] == "NOT_STARTED"
                        and attempt["knowledge"] == "CONFIRMED"
                    )
                ):
                    errors.append(issue("semantic", "CANCELLED_NO_DISPATCH_CONTRADICTION", "/attempt",
                                        "The no-dispatch disposition conflicts with the recorded attempt."))
    for path in integer_paths:
        value = record
        for part in path:
            value = value[part]
        if int(value) > INT64_MAX:
            errors.append(issue("semantic", "INT64_OUT_OF_RANGE", pointer(path),
                                "Encoded quantity exceeds the nonnegative Int64 range."))
    return errors


def safe_child(parent: Path, relative: str):
    if not isinstance(relative, str) or Path(relative).is_absolute():
        raise PackageError("Indexed paths must be relative paths.")
    child = (parent / relative).resolve()
    if not child.is_relative_to(parent.resolve()):
        raise PackageError("An indexed path escapes its owned directory.")
    return child


def validate_index(index, examples_dir):
    expected_keys = {"format", "version", "status", "scope", "cases"}
    if not isinstance(index, dict) or set(index) != expected_keys:
        raise PackageError("Unexpected example-index structure.")
    if (index["format"] != "trix-example-expectations" or index["version"] != "0.2"
            or index["status"] != "PROPOSED" or not isinstance(index["scope"], str)):
        raise PackageError("Unsupported example-index format or revision.")
    if not isinstance(index["cases"], list) or not index["cases"]:
        raise PackageError("Example index must contain cases.")
    ids, indexed_files = set(), set()
    for case in index["cases"]:
        required = {"case_id", "schema", "path", "expected", "purpose"}
        if not isinstance(case, dict) or not required <= set(case) or set(case) - required - {"expected_error"}:
            raise PackageError("Unexpected fixture case structure.")
        if not all(isinstance(value, str) and value for value in case.values()):
            raise PackageError("Fixture case values must be nonempty strings.")
        if case["case_id"] in ids or case["expected"] not in {"valid", "invalid"}:
            raise PackageError("Duplicate case identity or invalid expected outcome.")
        ids.add(case["case_id"])
        if case["schema"] not in {name + ".schema.json" for name in SCHEMA_NAMES}:
            raise PackageError("Fixture references an unknown companion schema.")
        if (case["expected"] == "invalid") != ("expected_error" in case):
            raise PackageError("Every negative fixture must name its expected rejection code.")
        child = safe_child(examples_dir, case["path"])
        if child in indexed_files or child.suffix != ".json" or not child.is_file():
            raise PackageError("Duplicate, absent or non-JSON fixture path.")
        indexed_files.add(child)
    actual_files = {p.resolve() for p in examples_dir.rglob("*.json")
                    if p != examples_dir / "expected-outcomes.json"}
    if indexed_files != actual_files:
        raise PackageError("Every JSON example and fixture must appear exactly once in the index.")
    return index["cases"]


def make_format_checker(FormatChecker):
    checker = FormatChecker()

    @checker.checks("date-time", raises=(ValueError, TypeError))
    def valid_timestamp(value):
        if not isinstance(value, str):
            return True
        if not value.endswith("Z"):
            return False
        datetime.fromisoformat(value[:-1] + "+00:00")
        return True

    return checker


def run_checks(package_root, Draft202012Validator, FormatChecker, dependency_version):
    report = {
        "report_format": "trix-companion-schema-validation",
        "report_version": "0.2",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "scope": "DOCUMENTATION_PACKAGE",
        "baseline_status": "PROPOSED",
        "overall_status": "error",
        "environment": {"python": sys.version.split()[0], "jsonschema": dependency_version},
        "tool_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "checks_performed": [
            "UTF-8 JSON parsing with duplicate-key and non-finite-number rejection",
            "Draft 2020-12 meta-schema validation of four standalone schemas",
            "Closed record shape, required values, UTC calendar timestamps and conditional field constraints",
            "Exact nonnegative Int64 quantity bounds without binary floating-point conversion",
            "Local input/output/effect identifier uniqueness and declared completion-output names",
            "Empty supported mandatory-feature set and NEVER retry-policy consistency",
            "Selected snapshot guards for bound attempts, current terminal effects and cancellation dispositions",
            "Complete example-index coverage and exact expected negative-fixture rejection codes",
        ],
        "not_checked": [
            "TriX source grammar, full IR, graph verification or compiler semantic preservation",
            "Reference resolution, real identity, permission, credential validity or secret-content detection",
            "Runtime transitions, durability, scheduling, execution, network behaviour or external effects",
            "Artifact authenticity, capability freshness, hardware availability or qualification",
            "Numerical quality, performance, operational security or acceptance-test implementation",
        ],
        "schemas": [], "cases": [], "configuration_errors": [], "summary": {},
    }
    try:
        schemas_dir = package_root / "schemas"
        examples_dir = package_root / "examples"
        expected_names = {name + ".schema.json" for name in SCHEMA_NAMES}
        if {p.name for p in schemas_dir.glob("*.schema.json")} != expected_names:
            raise PackageError("The package must contain exactly the four named companion schemas.")
        validators = {}
        for name in SCHEMA_NAMES:
            path = schemas_dir / (name + ".schema.json")
            schema, digest = load_json(path)
            if schema.get("$schema") != DRAFT or schema.get("$id") != f"urn:trix:proposed:schema:{name}:0.2":
                raise PackageError("A schema has an unsupported draft or identity.")
            ensure_local_references(schema)
            Draft202012Validator.check_schema(schema)
            validators[name] = Draft202012Validator(schema, format_checker=make_format_checker(FormatChecker))
            report["schemas"].append({"path": f"schemas/{path.name}", "sha256": digest, "status": "valid"})
        index, index_digest = load_json(examples_dir / "expected-outcomes.json")
        report["index_sha256"] = index_digest
        cases = validate_index(index, examples_dir)
        for case in cases:
            path = safe_child(examples_dir, case["path"])
            name = case["schema"].removesuffix(".schema.json")
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            try:
                record, _ = load_json(path)
                errors = schema_errors(validators[name], record)
                if not errors:
                    errors = selected_semantic_errors(name, record)
            except RecordParseError as exc:
                errors = [issue("parse", exc.code, "", str(exc))]
            observed = "invalid" if errors else "valid"
            codes = {error["code"] for error in errors}
            matched = observed == case["expected"] and (
                case["expected"] == "valid" or case["expected_error"] in codes
            )
            report["cases"].append({
                "case_id": case["case_id"], "path": "examples/" + case["path"],
                "schema": case["schema"], "sha256": digest,
                "expected": case["expected"], "observed": observed,
                "expected_error": case.get("expected_error"),
                "expectation_met": matched, "errors": errors,
            })
        report["overall_status"] = "pass" if all(c["expectation_met"] for c in report["cases"]) else "fail"
    except Exception as exc:
        report["configuration_errors"].append({"type": type(exc).__name__, "message": str(exc)})
    rejected_by_stage = Counter(
        c["errors"][0]["code"].split(":", 1)[0] for c in report["cases"] if c["errors"]
    )
    report["summary"] = {
        "schemas_checked": len(report["schemas"]),
        "schemas_valid": sum(s["status"] == "valid" for s in report["schemas"]),
        "cases_checked": len(report["cases"]),
        "expected_valid_cases": sum(c["expected"] == "valid" for c in report["cases"]),
        "expected_invalid_cases": sum(c["expected"] == "invalid" for c in report["cases"]),
        "accepted_cases": sum(c["observed"] == "valid" for c in report["cases"]),
        "rejected_cases": sum(c["observed"] == "invalid" for c in report["cases"]),
        "expectations_met": sum(c["expectation_met"] for c in report["cases"]),
        "expectations_not_met": sum(not c["expectation_met"] for c in report["cases"]),
        "rejected_by_stage": dict(sorted(rejected_by_stage.items())),
        "runtime_tests_run": 0,
        "hardware_qualifications_run": 0,
    }
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package-root", type=Path, default=Path(__file__).resolve().parents[1],
                        help="Package directory; defaults to the parent of tools/.")
    parser.add_argument("--report", type=Path,
                        help="JSON report destination; defaults to validation/schema_validation_report.json.")
    args = parser.parse_args(argv)
    if sys.version_info < (3, 10):
        print("Python 3.10 or newer is required.", file=sys.stderr)
        return 2
    try:
        from jsonschema import Draft202012Validator, FormatChecker
        dependency_version = version("jsonschema")
        if dependency_version.split(".", 1)[0] != "4":
            raise ImportError("This tool requires jsonschema 4.x.")
    except (ImportError, ModuleNotFoundError) as exc:
        print(f"Dependency unavailable: {exc}. Install the versions in tools/requirements.txt.", file=sys.stderr)
        return 2
    package_root = args.package_root.resolve()
    destination = args.report or package_root / "validation" / "schema_validation_report.json"
    report = run_checks(package_root, Draft202012Validator, FormatChecker, dependency_version)
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    except OSError as exc:
        print(f"Could not write validation report: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({"status": report["overall_status"], "summary": report["summary"],
                      "report": str(destination)}, sort_keys=True))
    return {"pass": 0, "fail": 1, "error": 2}[report["overall_status"]]


if __name__ == "__main__":
    raise SystemExit(main())
