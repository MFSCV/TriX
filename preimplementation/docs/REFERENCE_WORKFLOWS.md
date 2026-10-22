# Reference Workflows

These are proposed design walkthroughs awaiting implementation and qualification. They specify intended behaviour, not executable TriX grammar or successful test results. Each selected implementation needs an actual platform snapshot, an adopted contract, and applicable acceptance evidence.

All workflows assume authenticated components, a named project, scoped authorization, identifiable artifacts, and a declared policy revision. Delegation and results follow the authorized coordination hierarchy. Direct artifact transfers remain separately authorized technical operations. No workflow permits an undisclosed model, precision, destination, or provider fallback.

## WF-01 — Validate and transform data on a local CPU

**Setup and contract.** Select one CPU executor profile and a synthetic CSV fixture with a declared schema. Inputs are the source artifact, schema revision, and transformation specification. Outputs are validated JSON Lines and a provenance manifest containing row count and content digests. Allowed effects are reading the designated project input, writing designated project outputs, and submitting audit evidence. Network export is prohibited.

**Ordered flow.**

1. Validate the task plan and effect declarations; establish task and attempt identities.
2. Verify the executor's actual ISA, ABI, dependencies, available memory, and authorization.
3. Read and validate records against the schema. Reject invalid types, duplicate identifiers, and out-of-range values according to the specified rules.
4. Transform accepted records, compare output structure and counts with the independent fixture oracle, and stage the artifacts.
5. Publish outputs through the selected atomic publication mechanism; mark completion only after the output contract is verified.

**Failure, cancellation, and recovery.** Expected states cover validation, queueing, execution, and verified completion. Invalid input produces an identified failure without publishing partial output as final. Cancellation before publication removes or marks staging artifacts according to policy. A crash during publication requires checking the artifact identity and publication record before retry; uncertainty remains under reconciliation.

**Evidence and links.** Retain schema/fixture digests, platform snapshot, validation diagnostics, output comparisons, publication records, and absence of network effects. Requirements: LNG-003–LNG-005, TAR-001–TAR-006, QUA-006, QUA-013–QUA-014. Tests: CA-01, CA-11, QT-01, QT-03.

## WF-02 — Document processing across Mac and NVIDIA stages

**Setup and contract.** Register concrete Mac and NVIDIA executor profiles. A source document resides in approved Mac-side project storage. Policy explicitly permits its derived text to enter the named NVIDIA zone. Inputs include document identity, extraction configuration, and an authorized summarization-model revision. Outputs are normalized text, a structured summary, and their provenance. Effects include declared storage writes and transfers.

**Ordered flow.**

1. The Mac stage reads the source and extracts text using its selected, qualified adapter. Derived data retains the source restrictions.
2. Validate the normalized artifact. Authorize and transfer it from the Mac zone to the designated NVIDIA input store; verify identity and receipt.
3. The NVIDIA stage validates model compatibility, precision, context, buffers, and available resources, then performs the complete summarization operation.
4. Validate the summary's schema and task-quality criteria. Authorize its transfer back to Mac-side project storage and verify publication.
5. The terminal retrieves the approved result under its own read authorization.

**Failure, cancellation, and recovery.** Track each stage and transfer separately. An interrupted transfer cannot satisfy its dependency. A completed extraction can be reused only with matching identity, policy, and contract. Cancellation propagates to active stages while retaining truthful cancellation status. Failed NVIDIA execution does not silently invoke a remote API or substitute another model.

This is a workflow spanning vendors. It does not split one model across Apple and NVIDIA hardware or imply portable GPU memory or KV caches.

**Evidence and links.** Preserve transfer authorizations, artifact digests, receipts, stage states, resource checks, and quality results. Requirements: ARQ-004, DAD-002–DAD-004, TAR-008, INT-009, QUA-003–QUA-005. Tests: CA-07, CA-09, CA-13, CA-14, CA-20, QT-02.

## WF-03 — Authorized frontier-model API and local tool invocation

**Setup and contract.** Configure an approved model/API endpoint, exposed revision, region, data policy, and budget. The input is a fixture explicitly authorized for that provider. The model may propose creating a project note; authorization permits only the designated note location and schema. Outputs are the validated response, note identity, and effect receipt. API requests and local writes are separate declared effects.

**Ordered flow.**

1. Validate the input's export permission, endpoint eligibility, request schema, remaining budget, and current delegation.
2. Send the authorized payload. Record request identity, exposed model revision, and measured or pending charges.
3. Treat the response and proposed tool arguments as untrusted data. Validate their structure and reject embedded attempts to change policy.
4. Recheck local authorization for the specific note write. Execute only within its permitted scope, using the declared effect identity and deduplication mechanism.
5. Verify the note and receipt. Any follow-up request to the model requires a separate check of its outbound contents and remaining authorization.

**Failure, cancellation, and recovery.** Rate limits, malformed responses, and denied tools produce distinct diagnostics. A tool refusal does not become permission to choose another tool. A timeout does not prove remote cancellation. After a lost tool receipt, inspect the effect record before retrying. Uncertain provider charges remain identified; unconfirmed operations do not become successful completion.

**Evidence and links.** Retain protected request references, policy decisions, validated tool arguments, effect receipts, budget accounting, and cancellation status. Provider-hidden internals remain unknown. Requirements: GOV-005–GOV-009, INT-007, REC-007, QUA-007, QUA-013. Tests: CA-03, CA-09, CA-10, CA-17, CA-24.

## WF-04 — Policy refusal and absence of an eligible destination

**Setup and contract.** Use a restricted document and a task requiring a specific model profile. The only currently available compatible engine is an external API prohibited by the document's location policy. Local engines lack the required capability. The admission contract chooses refusal when no destination is eligible. No content-transfer or model-execution effect is authorized.

**Ordered flow.**

1. Validate the task independently of resource availability.
2. Evaluate each candidate against authority, data location, compatibility, and resources.
3. Exclude the external API for policy reasons and local engines for incompatibility.
4. Report no eligible destination with an authorized diagnostic identifying these categories. Do not disclose protected contents or another project's resources.

**Failure, cancellation, and recovery.** The task never enters execution. Neither a faster provider nor an available lower-precision model overrides the contract. No automatic redaction or claimed anonymization permits export. A separate contract may explicitly allow waiting; cancellation then removes queued work and releases reservations without creating effects. If a compatible local executor later becomes available, a new admission decision checks the current policy and authorization before execution.

**Evidence and links.** Record candidate exclusions, policy/model revisions, final admission outcome, and verification that no payload left the authorized zone. Requirements: LNG-010–LNG-011, DAD-001–DAD-002, REC-001, REC-008, QUA-010. Tests: CA-02, CA-04, CA-07.

## WF-05 — Qualify a third-vendor replacement stage

**Setup and contract.** Propose replacing WF-02's NVIDIA stage with one concrete AMD integration through the published SDK. The proposed profile starts experimental. Preserve task inputs, outputs, effects, and quality requirements. Any different model representation or precision requires an explicitly authorized variant.

**Ordered flow.**

1. Capture actual hardware, OS, driver, engine, plugin, model, and dependency identities.
2. Validate discovery, capability reporting, version negotiation, output validation, cancellation, errors, and authorization boundaries.
3. Execute the same stage contract against fixed fixtures and an independent reference, then measure the declared quality and performance criteria.
4. Exercise incompatible operations, driver changes, memory exhaustion, interrupted transfers, and process failure.
5. Submit reproducible evidence, defects, and limitations for review. Promote only the tested profile when its mandatory gates pass; then use the controlled rollout procedure.

**Failure, cancellation, and recovery.** Failed gates retain experimental status. Numerical differences use the declared tolerance or quality criterion; they are not assumed equivalent. Cancellation and restored work must preserve effect identity and current authority. An unsuccessful replacement never silently reinstates another backend.

**Evidence and links.** Preserve SDK conformance results, comparisons, fault traces, and the exact support claim. This does not qualify every AMD device or establish cross-vendor tensor parallelism. Requirements: PLT-009, INT-001–INT-006, VAL-005, QUA-001–QUA-005, QUA-012–QUA-018. Tests: CA-19, CA-20, QT-02, QT-09–QT-13.
