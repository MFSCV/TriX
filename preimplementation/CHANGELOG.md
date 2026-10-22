# Change log

## Version 0.2 - 22 October 2026

Consolidates and supersedes the Portuguese version 0.1 as the proposed documentation baseline. Formal project adoption remains governed by NOR-001.

- Converted the complete standard to English and established English as the ongoing documentation language. Preserved TriX's name and feminine pronouns.
- Retained all 127 original requirement identifiers and all 24 original acceptance-case identifiers. Added 101 requirements and 43 acceptance cases: 228 requirements and 67 cases in total.
- Specified a bounded initial language scope, value and numeric contracts, policy propagation, compiler trust boundaries, plan verification, dependency resolution and locked builds.
- Added a guarded task state machine, separate execution/knowledge/effect dimensions, effect ledgers, controller epochs, fencing, cancellation races and bounded retries.
- Expanded data publication, derived-data tracking, deletion, backup/restore, identity isolation and concurrent budget reservations.
- Added web/native boundaries, inbound/outbound API and MCP roles, credential lifecycle, event recovery, export/import and extension evolution.
- Added platform qualification lifecycles, environment snapshots, independent conformance checks, quality evaluation, AI-judge calibration, evidence records and release gates.
- Added implementer handoff, parallel integration responsibilities, bounded correction loops, operational ownership and public-distribution decisions.
- Added four structural JSON Schemas, illustrative records, rejection fixtures, validation tooling and structured registers.

The new contracts are specification work. Compiler, runtime, hardware, performance and operational conformance remain unverified until their implementation campaigns are executed. Documentation validation reports must not be used as such evidence.

## Compatibility and migration

Existing identifiers remain valid references; their authoritative text for this proposed revision is English. IDN-001 clarifies she/her usage; IDN-005 makes the user's English documentation instruction explicit. ARQ-001 preserves the absence of any mandatory Mac or NVIDIA prerequisite. GOV-010 makes assurance-specific trust boundaries explicit.

Version 0.2 adds requirements and clarifies observable behaviour. It does not claim that an implementation conforming to version 0.1 automatically conforms to version 0.2. Implementers must review new clauses, schema scope, profile applicability and the expanded acceptance catalogue. No binary, persistent-state or API migration has been executed by this documentation release.
