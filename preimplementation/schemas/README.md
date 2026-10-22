# Proposed TriX 0.2 companion contracts

These four standalone JSON Schema Draft 2020-12 files are proposed bounded record contracts. Their `urn:trix:proposed:` identifiers are local specification identifiers, not claims of a registered service or deployed API. The numbered English requirements remain the behavioural authority; contradictions must be resolved before claiming conformance.

| Schema | Boundary |
| --- | --- |
| `task-request.schema.json` | One task admission envelope: identities, operation and type references, declared effects, data policy, requirements, budgets, retry and completion criteria, and opaque authority references |
| `capability-manifest.schema.json` | Scoped platform, role, version, availability and capability claims, with their evidence status |
| `task-record.schema.json` | One snapshot separating task lifecycle, attempt execution, observation knowledge and individual effect outcomes |
| `test-evidence.schema.json` | A test result that distinguishes not-run, pass, fail, blocked, inconclusive and not-applicable |

The task request is **not the complete language IR**, a task graph, a source grammar, an API authentication algorithm or a canonical semantic encoding. Type and operation references are opaque in these contracts. They require resolution and compatibility checks in a future production verifier. Input values are represented by artifact references; this does not define every portable TriX value type. The full IR, reference-resolution rules, source-to-plan preservation and canonical identity remain separate decision gates.

## Proposed encoding choices

All top-level and nested contract objects are closed. The optional `metadata` map accepts only declared namespaced keys, with bounded string, Boolean or null values. Metadata has no execution, authority or qualification semantics. Extension keys do not bypass `required_features`: this companion admission subset supports an empty set of additional mandatory features and rejects any requested feature outside that set.

Quantities that use the nonnegative subset of Int64 are base-ten **strings**. The companion checker compares their integer values with `9223372036854775807`; these quantities never pass through a binary floating-point representation. Money amounts use bounded nonnegative decimal strings without exponent syntax and carry a three-letter currency code. Recognising that shape does not validate a currency, pricing source or enforceable budget. Duration fields state milliseconds; memory and transfer fields state bytes. These record bounds are a proposed encoding profile, not operational performance or capacity promises.

Timestamps use a UTC subset with a trailing `Z`, whole seconds or up to six fractional digits, and valid calendar values. Leap-second text is outside this proposed encoding. The checker does not use timestamps to order distributed events, establish freshness or infer that a process stopped. Array and text bounds are structural limits of these records; implementations must separately establish their supported operational limits.

Opaque `authref:` and `authctx:` strings are references to grants and authentication context. Their existence, issuer, binding, expiry and current validity are **not checked**. No identifier, digest, declared capability or reference grants authority. Provider credentials, secret values, authorization headers and private payload content have no designated fields in these contracts. A closed field list is not secret-content detection: arbitrary strings can still be misused. Real writers, access boundaries and logging controls must enforce the no-secret rule.

## Record interpretation

A capability can be `DECLARED`, `OBSERVED` or `QUALIFIED`. The latter two require evidence references, and `QUALIFIED` also requires a qualification-scope reference. Structural acceptance does not authenticate that evidence. The illustrative manifest declares fictional capabilities and explicitly does not assert availability or qualification. Vendor, architecture, OS and ABI strings identify the declared tuple; accepting their syntax does not make that tuple supported.

Task records follow RUN-002's separate dimensions. `RECONCILING` with a last `ACTIVE`/`STALE` observation and an `UNKNOWN` effect is valid. For a current terminal decision, all listed effects must be resolved; previously `APPLIED` effects remain visible after cancellation. A cancellation disposition of `FURTHER_EFFECTS_BLOCKED` requires an explicit permission reference, evidence and a separate cost-tracking reference. It does not assert that remote execution stopped. `NO_DISPATCH` represents the early-cancellation case without a dispatched current attempt. The snapshot cannot prove that another attempt or unlisted effect does not exist.

A late contradiction can preserve a historical terminal lifecycle using a `DISPUTED` terminal-decision record. That form requires an incident reference and `reliance_blocked: true`. The checker does not rewrite history or implement the correction workflow. Terminal-state transition guards, atomic serialization, fencing, cancellation races, event recovery and reconciliation need a real runtime and its evidence.

For test evidence, `pass`, `fail` and `inconclusive` require execution details and artifact references. `not-run` forbids execution details and artifacts. `blocked` requires a blocker reference; it may describe a run that started before blocking. `not-applicable` requires an explicit applicability rationale and no execution. A referenced artifact is not proof that the test ran or that the result is correct. The valid evidence example is deliberately `not-run`; this package does not invent runtime results.

## Validator scope and use

Run from any directory with Python 3.10 or newer and the dependency in `tools/requirements.txt` available:

```bash
python /path/to/trix_v0_2/tools/validate_package.py
```

The tool never installs dependencies, launches an executor, resolves opaque references or retrieves remote schemas. All schema references are local fragments. `--package-root` selects a package copy; `--report` selects the report path. By default it writes `validation/schema_validation_report.json`. Exit code `0` means every declared package check matched its expectation; `1` means a fixture outcome differed; `2` means the package, dependency or report operation could not be checked as configured. The checker limits each JSON file to 2 MiB; this is a tool limit, not a production artifact-size limit.

The checker performs strict UTF-8 JSON parsing, rejects duplicate keys and non-finite literals or parser overflow, checks the four schemas against Draft 2020-12, validates all indexed examples, and verifies that no JSON fixture is missing from the index. Expected negative cases must produce their specified rejection code; merely failing for an unrelated reason is insufficient. Format checking uses the standard Python calendar parser for the stated UTC subset.

Only the following additional local invariants are checked after a record passes its schema:

1. Encoded nonnegative Int64 quantities fit their exact bound.
2. Input/output names and effect identifiers are unique within their respective record collections, and requested completion outputs were declared.
3. Required features belong to the companion subset's explicitly empty supported set; `NEVER` retry permits one initial attempt.
4. `RUNNING` and `CANCELLING` snapshots contain a bound attempt.
5. A **current** terminal decision has no listed `UNKNOWN` effect.
6. A **current** cancellation claiming `EXECUTION_STOPPED` has a `STOPPED`/`CONFIRMED` attempt observation; `NO_DISPATCH` has no current attempt or a `NOT_STARTED`/`CONFIRMED` observation.

The schemas additionally enforce their conditional evidence and disposition fields. These checks do **not** implement the production semantic verifier in SIF-004 or LSP-018. The report records the actual tool/dependency versions, schema and fixture hashes, observed rejections and expectation matches. It explicitly records zero runtime tests and zero hardware qualifications. A successful package check must not be relabelled as language, security, authorization, runtime or hardware conformance.
