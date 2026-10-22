# TriX Gap and Decision Register

## Purpose and status language

This register distinguishes specification progress from implementation and operational readiness. TriX has a defined design direction and proposed contracts; she is not a completed production runtime or compiler.

All documentation remains in English, with she/her used for TriX. Reference owners below are roles to assign, not named people or evidence of an existing team.

| Status | Meaning |
| --- | --- |
| Specified | A written proposed contract exists; adoption and implementation remain separate |
| Decision pending | A concrete choice, scope or parameter remains unresolved |
| Implementation pending | Executable behavior and applicable acceptance evidence have not been established |
| Verified within scope | A stated implementation revision passed stated tests on a stated configuration |
| Blocked | Progress depends on an identified unresolved decision, capability, permission or resource |

A topic may be specified while implementation remains pending. Closing a decision does not verify its implementation. Passing structural example checks verifies only those checks; it does not establish authorization, distributed safety, model quality or hardware support.

## What is now specified

The original specification establishes identity, profiles, vendor independence, task/effect boundaries, hierarchical authority, independent audit, data restrictions, compatibility, extension interfaces and release evidence.

The runtime additions specify guarded task transitions; separate execution, knowledge and effect status; fencing and lease behavior; durable effect identities; bounded retries; artifact publication and deletion; budget reservations; directional API/MCP integration; offline authority; and concrete failure tests.

These additions close explanatory gaps. They do not select every implementation mechanism, assign measured thresholds or prove that the resulting system satisfies the contracts.

## Consolidated implementation gaps

Every row below requires implementation evidence before its capability can be claimed as operational.

| Area and relevant requirements | Specification position | Remaining work | Reference owner |
| --- | --- | --- | --- |
| Profiles and adoption: NOR-001–005 | Specified | Select the first profile, map applicable requirements and record adoption | Specification steward |
| Language semantics: LNG and CON | Core direction specified; decisions pending | Fix grammar, type/ownership rules, dynamic boundaries and executable semantics for the chosen subset | Language owner |
| Full plan/IR: CON-005 | Version separation specified | Define complete semantic representation, validation, lowering and compatibility; package examples are narrower | Language/runtime owners |
| Task lifecycle: TAR and RUN-001–006 | Transition baseline specified | Implement durable records, guarded transitions, cancellation races and event replay | Runtime owner |
| Coordination: GOV-005–006, RUN-007–010 | Safety boundaries specified | Select persistence/serialization, epochs, fencing points and lease/clock assumptions | Runtime/security owners |
| Effects: TAR-005–006, RUN-011–013 | Retry and uncertainty contracts specified | Implement effect ledger, destination-specific deduplication and reconciliation | Runtime/provider owners |
| Workflow execution: CON-001, RUN-005 | Dependency and authority boundaries specified | Implement bounded fan-out, child ownership, failure propagation and streaming semantics | Runtime owner |
| Identity and tenancy: GOV, RUN-018–019 | Authority model specified | Choose credential lifecycle, enrollment, scopes and revocation enforcement | Security/identity owner |
| Scheduling: REC, RUN-020 | Eligibility and accounting specified | Implement concurrency-safe admission, priorities, fairness and preemption | Scheduling owner |
| Financial control: REC-007, RUN-021 | Budget semantics specified | Define units, price sources, exposure bounds, concurrent reservations and settlement | Scheduling/provider owners |
| Artifacts: DAD, RUN-014–017 | Lifecycle and deletion scope specified | Implement storage, publication, derivative inventory, retention and restore | Data/runtime owners |
| Models and multimodality: DAD-003–006 | Identity and compatibility principles specified | Select validated profiles, input limits, quality criteria and conversion evidence | Model/verification owners |
| Platform support: PLT | Per-feature qualification specified | Fix target versions and test actual dependencies and devices | Platform owners |
| Extensions: INT | Public contract responsibilities specified | Implement SDK, error/capability contracts and a third real integration | SDK/adapter owners |
| Local and remote execution: INT-007, RUN-022–024 | Direction and authority boundaries specified | Implement common control APIs, provider adapters and authentication | API/provider owners |
| MCP integration: RUN-023–024 | Revision-specific directional contract specified | Pin protocol revision, supported capabilities and security behavior | API/security owners |
| Mobile/offline: PLT-007, RUN-025–026 | Bounded availability and authority specified | Implement lifecycle handling, local allowance and reconnection reconciliation | Client/runtime owners |
| Isolation and audit: GOV-004, RUN-027–029 | Trust and independence requirements specified | Select enforceable isolation and audit outage behavior; verify attacks and gaps | Security/audit owners |
| Packaging and changes: VER and BLD | Integrity, compatibility and migration principles specified | Implement per-target builds, dependency inventory, signing and update/rollback paths | Release owner |
| Operational qualification: VAL, RUN-030 | Evidence categories specified | Measure recovery, progress loss, capacity, performance and workload limits | Verification/operator owners |
| Developer experience: DEV | Diagnostics and common-client semantics specified | Implement tooling, executable examples and accessible controls | Tooling/client owners |

## What remains before coding

“Before coding” means before implementing the relevant effectful runtime slice. Documentation, structural validators and disposable experiments can proceed while later-stage decisions remain open. Do not make an E1 prototype depend on the final language grammar or complete E5 platform coverage.

For the first slice, resolve and record these decisions:

| Decision | Minimum answer needed | Decision owner |
| --- | --- | --- |
| Initial conformance profile | Offered capabilities, required contracts and explicit exclusions | Specification steward |
| Reference workload | Inputs, outputs, permitted effects and expected failure outcomes | Runtime/model owners |
| State ownership | Authoritative task record, atomic update boundary and restart behavior | Runtime owner |
| Authority boundary | Identities, allowed actions, delegation validity and first enforced checks | Security/identity owner |
| Effect classes | Which operations are replayable, deduplicated or reconciled manually | Runtime/provider owners |
| Artifact boundary | Publication, access, staging cleanup and retention for the first data class | Data owner |
| Interface contract | Chosen request/response envelope and error behavior for the prototype | Integration owner |
| Test oracle | Positive/negative fixtures and expected outcomes independent of implementation | Verification owner |
| Experiment allowance | Permitted data, resource/spending limits, stop conditions and cleanup | Project authority |
| Initial target | Exact development environment and the scope of any hardware claims | Platform owner |

The four supplied schemas provide constrained structural contracts for illustrative admission and record examples. Decide how a prototype uses them without silently treating them as the full language IR, capability-security system or operational wire protocol.

A task request accepted by a schema still needs semantic validation, authorization, admission and runtime enforcement. A capability manifest that validates structurally still needs provenance and platform/model qualification. A task record is evidence only when produced and protected by an implemented state-management contract.

## Decisions that can be staged

The following choices need deadlines tied to the capability that depends on them, rather than arbitrary dates:

| Choice | Resolve before |
| --- | --- |
| Final grammar, keywords, module system and file extension | Stabilizing the E4 frontend |
| Ownership, borrowing/reference handling and dynamic-value guarantees | Implementing and promising the affected language guarantees |
| Complete IR and extension compatibility policy | Publishing stable compiler/runtime interoperability |
| Transport, identity enrollment and key rotation | Accepting real distributed clients or nodes |
| Serialization/consensus mechanism and clock uncertainty bounds | Claiming replicated coordination or bounded offline authority |
| Provider deduplication windows and financial exposure rules | Accepting effectful external work |
| Model substitutions and quality thresholds | Automatically selecting among candidate models |
| Storage retention, backup expiry and deletion evidence | Processing data under those policies |
| Audit buffering/fail-closed policy | Executing operations requiring independent audit |
| Package registry, trust roots and component licenses | Distributing extensions or public releases |
| Supported-version windows and deprecation policy | Making stable compatibility commitments |
| Operational targets and workload limits | Accepting the corresponding operational release |

Suggested technologies remain proposals until an architecture decision records selection and rationale. Rust, Python and Swift are an implementation direction, not a mandatory dependency for every extension. A fixed N/N-1 support window, universal lease duration or automatic cross-provider model substitution is not established by this register.

## What remains before an operational release

An operational release is assessed against its declared profile. It need not implement every future feature, but it cannot exclude requirements necessary for features it actually exposes.

**Execution and recovery.** Provide observed evidence for state transitions, concurrent admission, cancellation races, duplicate delivery, process/node failure, partitions and restart. Preserve task and effect identity. Reconcile uncertain outcomes instead of declaring fabricated success or repeating unsafe effects.

**Authority and isolation.** Verify enrollment, credentials, project boundaries, revocation, stale-controller fencing, hostile input and adapter isolation. Document host administrator powers and external-provider trust. Independence of audit needs an implemented permission and evidence boundary.

**Data lifecycle.** Demonstrate partial-upload handling, authorized publication, derivative restrictions, cache isolation and deletion across declared storage domains. Restore a backup and verify that stale access or deleted content does not become accessible before current policy is reconciled.

**Budgets and scheduling.** Test simultaneous requests against scarce capacity and the last available budget. Account for retries, transfers, tools and uncertain provider charges. Measure fairness and preemption against declared policy. Distinguish enforceable limits from estimates and objectives.

**Hardware and models.** Qualify actual operating-system, CPU/ABI, accelerator, driver, engine and model combinations. Separate client support from local execution and acceleration. Demonstrate the third integration before claiming the corresponding operational vendor independence.

**Packaging and operation.** Verify dependency inventories, authenticity, installation, upgrades, persistent-state migration and supported rollback. Provide diagnostics, operator instructions, incident procedures, known limitations and a responsible role for each operational boundary.

**Acceptance evidence.** Applicable mandatory tests need passing results tied to the release revision. Failed or blocked gates remain explicit. A security repair cannot close a defect by weakening the acceptance oracle. Performance and recovery claims require measurements, workload descriptions and clearly bounded scope.

## Record decisions and defects in the package

Use templates/decisions.csv to record a decision identifier, affected requirements, scope, status, owner role, alternatives, rationale, acceptance implications and milestone dependency. Preserve superseded decisions rather than deleting their history.

Use templates/requirements.csv and templates/test_catalogue.csv to maintain coverage. Record actual runs in templates/test_results.csv and reproducible problems in templates/defects.csv. Reference retained logs and environment details rather than copying secrets or private data into a spreadsheet.

Use templates/support_matrix.csv for per-feature qualification. “Compiles,” “schema-valid,” “device detected,” “engine loaded” and “model qualified” represent different evidence. A broad platform label does not replace a tested combination.

The package validator at tools/validate_package.py checks its documented structural and consistency scope. The examples/ directory and schemas/test-evidence.schema.json help organize evidence; neither establishes a full runtime or independently verifies the truth of every recorded claim.

## Closing criteria and remaining uncertainty

Close a decision when the authorized owner adopts a recorded choice. Close an implementation gap when code, applicable tests and evidence satisfy the adopted contract. Close an operational qualification gap only for the versions, workload, hardware and failure conditions actually tested.

Keep status precise when progress stops: decision pending, implementation pending, failed test or blocked dependency. Record what is known, what remains uncertain, the next concrete step and its owner role. Continue independent authorized work without repeatedly seeking approval for unchanged scope.

The main remaining deliverable is an executable, measured implementation of the contracts. The documentation package prepares that work and makes its acceptance reviewable; it does not substitute for it.
