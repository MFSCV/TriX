# TriX Implementer Guide

## Purpose and limits

This guide turns the specification into a repeatable implementation workflow. TriX is referred to as she/her. Her proposed contracts describe intended behavior; they do not establish that a runtime, compiler, security boundary or hardware integration already exists.

Use this guide with the requirement catalogue and the gap and decision register. It introduces no additional normative requirement identifiers. If guidance conflicts with an adopted requirement, record the inconsistency and correct the guidance through review.

The JSON schemas in this package constrain illustrative admission, capability, task-record and evidence documents. They are not a complete language intermediate representation, authorization engine, scheduler or distributed state machine. Structural validation can reject malformed examples; it cannot prove correct execution, safe delegation or successful recovery.

## 1. Establish accountable ownership

Assign people or teams to the following roles in the project records. The roles below are reference responsibilities, not an invented staffing roster.

| Reference role | Responsibility |
| --- | --- |
| Human administrator | Own scope, policy, delegation and final decisions requiring human authority |
| Specification steward | Maintain semantics, applicability, requirement stability and architecture decisions |
| Integration owner | Coordinate shared interfaces, dependencies, merge readiness and release evidence |
| Runtime owner | Implement tasks, attempts, persistence, effects, allocation and recovery |
| Security and identity owner | Define trust boundaries, credentials, policy enforcement and isolation |
| Adapter owner | Own one platform, accelerator, engine, cluster-manager or provider contract |
| Client/API owner | Preserve common semantics across web, native and automation interfaces |
| Verification owner | Maintain independent acceptance criteria, fixtures and evidence review |
| Audit custodian | Maintain independently protected audit identities, records and access |
| Release/operator owner | Own packaging, support declarations, rollout, recovery and handoff |

One contributor may hold several implementation roles. That does not remove the required separation of operational and audit permissions. Project work follows the established Orchestrator/SubOrchestrator hierarchy; auditors report through their independent line.

Within a valid delegation, continue authorized work without repeated permission requests. Escalate a material change in scope, authority or an action requiring additional authorization. Present the concrete change, consequences and available evidence when escalation is necessary.

## 2. Follow the E0–E5 dependency order

The stages establish evidence dependencies, not dates or a promise that every platform will be supported.

| Stage | Work and dependencies | Exit evidence |
| --- | --- | --- |
| E0: contracts | Select the initial profile, resolve decisions needed by its first slice, assign owners and define acceptance outcomes | Traceable requirements, decisions, representative examples and failure scenarios |
| E1: minimal execution | Build a small local path for validation, admission, execution, observation and cancellation using the E0 contracts | One complete flow, rejected inputs, durable state, bounded errors and repeatable local tests |
| E2: distributed reference | Integrate the selected Mac and NVIDIA configurations independently; add authority, data and recovery boundaries | Real platform evidence, partition/crash tests, effect reconciliation and truthful support entries |
| E3: extensibility | Implement a third real integration through the public extension contracts | Applicable conformance results without a vendor-specific language dialect |
| E4: language frontend | Implement agreed grammar, types and lowering against validated runtime semantics | Source-to-plan agreement, diagnostics and compatibility/migration evidence |
| E5: qualified expansion | Add selected systems, accelerators, clients and optimizations | Per-feature qualification on representative hardware and a maintained support matrix |

A CPU executor can establish E1 semantics before accelerator integration. Early grammar experiments and independent platform investigations may run in parallel, but their results remain provisional until their dependencies are satisfied. E2 does not establish arbitrary cross-vendor tensor parallelism. E5 does not require a Cartesian product of every device, operating system and engine.

## 3. Define a small vertical slice

Start with a concrete task and a constrained model or tool contract. Identify its inputs, permitted effects, authority, data destinations, output checks, cancellation disposition and unavailable-resource behavior.

Choose a narrow execution target and explicit failure cases. A useful first slice includes a successful task, invalid input, forbidden access, a lost response and a restart. Avoid making the first milestone depend on an entire compiler, every graphical client or every accelerator.

Write the expected outcomes before implementing the behavior. Examples are fixtures, not implicit permission to execute their described effects. An intentionally invalid fixture passes its test only when rejection matches the declared reason.

## 4. Organize parallel work around contracts

The integration owner publishes the interface revision, examples, error vocabulary, ownership boundaries and acceptance tests shared by parallel tasks. Each assignment names its input contract, output artifact, affected paths, dependencies, resource limits and stopping condition.

Prefer separate modules or isolated branches for concurrent changes. Assign one integration owner to each shared schema or protocol change. Adapter teams can work against a documented test double, but simulated success remains separate from real-device qualification.

Preserve the established control hierarchy. Technical exchanges between executors or shared artifacts remain authorized data transfers; they do not introduce independent peer-agent authority.

Resolve interface mismatches explicitly. Do not silently patch a consumer to accept a producer's incompatible behavior. Update the contract and relevant evidence together when a reviewed design decision changes the intended behavior.

## 5. Make small, reviewed changes

Create a focused branch or isolated checkout for each coherent change. State the problem, affected requirement identifiers, proposed behavior and validation plan. Keep generated fixtures and intentional schema changes distinguishable from unrelated edits.

Review behavior, error paths and compatibility before merging. Shared-state, authorization, financial and security changes need review from the corresponding owner. Merge operational behavior when its applicable mandatory gates pass. Incomplete work may be integrated as an isolated prototype or disabled feature with recorded limitations; a failed mandatory gate remains failed.

Do not overwrite another contributor's work or resolve conflicts by dropping unfamiliar changes. Use the agreed contract to resolve the conflict and rerun the affected integration checks. Preserve the prior working revision and any state migration needed for recovery.

## 6. Maintain the evidence chain

Use the package records consistently:

| Artifact | Purpose |
| --- | --- |
| schemas/task-request.schema.json | Constrained structural example of a requested task |
| schemas/capability-manifest.schema.json | Constrained structural example of advertised capabilities |
| schemas/task-record.schema.json | Constrained structural example of recorded task state |
| schemas/test-evidence.schema.json | Structure for evidence records within its declared scope |
| examples/ | Positive and negative illustrative fixtures |
| templates/requirements.csv | Requirement identity, profile applicability and traceability |
| templates/test_catalogue.csv | Test setup, stimulus, expected result and requirement references |
| templates/test_results.csv | Actual execution outcomes and evidence locations |
| templates/defects.csv | Reproducible failures, impact, ownership and disposition |
| templates/support_matrix.csv | Qualified feature/platform combinations and limitations |
| templates/decisions.csv | Proposed, adopted, rejected and superseded decisions |
| tools/validate_package.py | Package checks within the validator's documented scope |

The chain is: requirement → acceptance test → implementation revision → observed result → retained evidence. A code comment or check mark is not a substitute for a result.

Record the exact software revision, configuration, relevant hardware, test identity, timestamps, observed outcome and evidence location. Preserve failed and blocked attempts when a later run succeeds. Use the outcome vocabulary defined by the package; distinguish passed, failed, blocked and not run.

Run the package validator using its documented interface and capture its exit status and output. Its success supports only the checks it performs. Record runtime, security, hardware and recovery tests separately.

## 7. Use bounded experiments and defect iteration

Before an experiment, define the hypothesis, success criterion, permitted data, spending/resource allowance, maximum attempts and cleanup. Prefer disposable fixtures and environments for destructive failure injection.

When a test fails, preserve evidence, identify a bounded hypothesis, make the smallest relevant change and rerun the affected test. Broaden regression checks only to address a concrete impact or required gate. Continue until mandatory gates pass or an honest blocked state is reached.

Stop a loop when it repeats the same failure without new evidence, exceeds its allowance, destroys required evidence, risks unauthorized data or requires a capability the environment lacks. Capture the last safe state, unresolved cause and next dependency. Continue unaffected authorized work.

A blocked record names the missing permission, decision, dependency, hardware or reproducible condition. It does not disguise failure as success or imply a completed production feature.

## 8. Preserve the acceptance oracle

The expected outcome is the acceptance oracle: the independent criterion used to judge behavior. A security fix does not succeed by weakening this criterion, removing the failing test, suppressing the error or relabeling unauthorized access as allowed.

When a test is itself incorrect, document the specification mismatch and review the correction independently of the implementation change. Preserve the original failure and explain why the corrected expectation follows the adopted contract.

Apply the same discipline to timing and performance checks. Change a threshold only through the applicable decision process and supporting measurements. An exhausted retry budget, missing hardware or uncertain external effect remains visible.

## 9. Release and handoff gate

Before an operational release, review the following evidence for its declared profile:

1. Applicable requirements and exclusions are recorded; exclusions do not hide offered capabilities.
2. Mandatory tests pass on the released revision; defects and blocked tests have explicit dispositions.
3. Real hardware evidence supports acceleration and performance claims.
4. Identity, policy, tenant isolation, revocation and independent audit behavior are verified.
5. Recovery preserves task/effect identity, reconciles uncertainty and respects budgets.
6. Artifact retention, deletion and backup restore behave as declared.
7. Packages identify dependencies, integrity/authenticity, compatibility and migration requirements.
8. Update and rollback claims match persistent-state compatibility.
9. Support entries state actual feature/platform limits and version coverage.
10. Operators receive installation, diagnostics, incident, recovery and known-limitation instructions.

Include the release revision, requirement/test coverage, unresolved risks, support matrix, deployment procedure and recovery procedure in the handoff. Do not describe the specification package or structural example validation as production readiness.

Publication, deployment and other consequential actions follow the current authorization policy. Complete the reviewable release package before seeking any genuinely necessary final approval. Preserve existing authorization for routine work inside its valid scope.

## 10. Keep documentation authoritative

Maintain all documentation, examples and diagnostic explanations in English. Use TriX and she/her consistently. Keep implemented behavior, proposed design, experimental behavior and unsupported combinations visibly distinct.

Update the decision register whenever a choice affects semantics, authority, compatibility or operational guarantees. Update tests and evidence when the implementation changes. A future contributor should be able to determine what TriX is intended to do, what she actually does on a stated configuration, and what remains unverified.
