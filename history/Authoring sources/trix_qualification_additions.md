# Qualification and Operational Acceptance

## Purpose and remaining gap

The existing requirements define behaviour and representative acceptance scenarios. They do not yet establish a release qualification system: exact configurations, acceptance thresholds, test ownership, evidence packages, evaluation independence, or withdrawal of support claims. This section supplies that system without changing existing requirement identifiers or replacing CA-01 through CA-24.

All documentation, qualification records, test descriptions, and release reports MUST be maintained in English. These are proposed requirements. No hardware combination, measurement, implementation, or qualification result is asserted by this document.

## Qualification contract and support profiles

**QUA-001 Bounded claims.** Every qualification claim MUST identify the specification revision, component build, role, operation, platform profile, workload profile, and applicable requirements. Client control, CPU execution, accelerated execution, remote access, and joint distributed computation MUST be qualified separately. A successful benchmark MUST NOT establish conformance for untested operations.

**QUA-002 Lifecycle and ownership.** Profiles MUST carry a lifecycle state, accountable maintainer, execution role, limitations and applicable review triggers. A qualified claim MUST additionally identify its validating party, evidence reference and qualification date. Planned profiles MAY leave qualification-specific fields unset, explicitly indicating that qualification has not occurred. Lifecycle, execution role, validating party and limitations MUST remain separate fields, refining VER-008 rather than conflating these dimensions.

| State | Meaning and promotion condition |
| --- | --- |
| Planned | Intended integration; no execution or support claim. |
| Experimental | An implementation exists, with declared gaps; explicit opt-in and applicable authorization remain required. |
| Qualified | All mandatory gates pass for the named configuration and workload scope; limitations are published. |
| Deprecated | Withdrawal is scheduled or underway; retained qualification, expiry, maintenance, and migration terms are explicit. |
| Unsupported | No current support commitment; a former successful result cannot establish present eligibility. |

Qualification expires or requires reassessment when a declared trigger occurs. A changed driver, model, compiler, policy mechanism, or dependency MUST receive an impact assessment; only justified unaffected evidence may be reused.

**QUA-003 Measured environment.** Qualification MUST record an actual hardware and software snapshot. Minimum OS versions for the application, local execution, and individual features MUST be declared separately. Missing measurements MUST remain unknown, never inferred from a vendor name. Provider-managed hardware may be undisclosed; the resulting claim MUST be bounded to the observed service contract and revision.

### Candidate profile families

Every family below starts as **planned** until an actual configuration and evidence package are registered. Integration paths are candidates, not compatibility promises.

| Family | Snapshot and qualification boundary |
| --- | --- |
| CPU baseline | Exact CPU, ISA extensions, OS, ABI, runtime, libraries, and workload; x86_64 and AArch64 require separate records. |
| Apple | Exact device and OS; selected MLX, Metal, or Core ML path; model representation and observed compute units. CPU/GPU results do not establish Neural Engine support. |
| NVIDIA | GPU model/count, host architecture, driver, CUDA dependencies, engine, model, and precision; collective communication and multi-node topology require additional evidence. |
| AMD | Exact GPU, OS, driver, ROCm-related dependencies where used, engine, and supported operations; qualify each selected combination. |
| Intel CPU/GPU/NPU | Separate records per device class and execution path, including the relevant OpenVINO or other dependencies where selected. |
| Intel Gaudi | Separate accelerator, software, model, and communication profile; qualification is not inherited from Intel CPU/GPU profiles. |
| Qualcomm | Exact SoC, OS, driver/provider, selected QNN or other path, compiled model, and lifecycle restrictions. |
| TPU / AWS Neuron | Separate provider, resource generation, runtime/compiler, model artifact, region, and distributed execution contracts. |
| Remote model/API | Provider, endpoint class, region, exposed revision, request/response schema, capabilities, data conditions, quotas, and cancellation limitations. |
| Browser/mobile clients | Browser/app version, OS, device, permissions, foreground/background conditions, and role; local acceleration needs its own profile. |

Suggested support-matrix CSV columns:

~~~csv
profile_id,profile_revision,release_id,lifecycle,role,operation,workload_profile_id,snapshot_id,application_os_min,executor_os_min,feature_os_min,limitations,maintainer,validating_party,evidence_manifest,qualified_at,review_trigger,withdrawal_plan
~~~

Each immutable snapshot SHOULD include physical/process architecture; CPU features; device identifiers and counts; memory domains; OS build, kernel and ABI/libc; native/emulated/virtualized mode; firmware and drivers; compiler/SDK/runtime/plugin/engine versions; dependency lock digests; model/tokenizer/transformation digests; precision; topology; power mode; and measurement-tool versions. Sensitive machine identifiers require protected references. Not-applicable fields require a reason.

## Acceptance profiles and evaluation methodology

**QUA-004 Predetermined gates.** Each workload profile MUST define its metrics, units, thresholds, sampling method, observation window, failure denominator, and decision rule before acceptance measurements begin. Unset thresholds MUST block qualification for the affected claim. Targets MUST be labelled as targets until measured; no default numerical targets are established here.

| Dimension | Acceptance definition required |
| --- | --- |
| Language/runtime correctness | Applicable deterministic assertions and forbidden transitions; mandatory conformance failures block promotion. |
| Numerical correctness | Reference implementation, absolute/relative or problem-specific error criteria, exceptional values, precision, and reduction behaviour. |
| Task quality | Task-specific rubric or objective benchmark; dataset slices, baseline, uncertainty, and unacceptable outcome categories. |
| Latency/SLO | Request boundaries, queueing, first useful result where relevant, completion, selected quantiles, load, and observation window. |
| Capacity | Useful accepted work per unit time, offered load, concurrency, input/output sizes, and failed or rejected work. |
| Resources | Peak host/accelerator memory, measured overhead, energy scope where available, and thermal/power conditions. |
| Cost | Currency, accounting interval, accepted-work denominator, measured versus estimated charges, and unconfirmed external costs. |
| Recovery | Recovery-time and recovery-point objectives, protected state, failure model, measurement boundaries, and permitted loss of progress. |

Policy rejections, invalid requests, system failures, and abandoned requests MUST be reported separately. Denominator choices MUST NOT conceal failed accepted work. Throughput comparisons require equivalent quality and authorized model/precision choices.

**QUA-005 Experimental discipline.** Evaluations MUST fix workload revisions, configuration, preparation, repetition and sampling rules. Development, evaluator calibration, and held-out acceptance sets MUST be separated. Cold startup, model loading, compilation, cache effects, and warm execution MUST be reported separately. Seeds, sample counts, variation, exclusions, and measurement uncertainty MUST be retained. Insufficient evidence produces an inconclusive result rather than a pass.

**QUA-006 Non-AI conformance.** Compiler, interpreter, planner, and runtime correctness MUST have machine-checkable oracles independent of language-model opinion. Tests MUST cover the adopted grammar or plan schema, name/type/effect rules, serialization, resource lifetime, error propagation, concurrency, cancellation, stream ordering, backpressure, and state transitions. Differential or metamorphic testing SHOULD supplement independently specified expected behaviour. Unspecified semantics MUST be resolved before the affected conformance claim.

For the SDK-first MVP, the executable plan schema is the conformance boundary. A later compiler adds parsing, diagnostics, lowering, and source-to-plan equivalence tests; successful AI outputs cannot substitute for these checks.

### AI-assisted qualitative evaluation

**QUA-007 Limited evaluator authority.** An AI judge MAY assist task-quality assessment where objective checks are insufficient. It MUST NOT override type checks, numerical gates, authorization, confidentiality, state invariants, or evidence integrity. Evaluator inputs MUST follow the same data-location and access policies as the tested workload.

**QUA-008 Calibration.** Before a judge affects acceptance, its rubric, prompt, model/revision, sampling settings, and tools MUST be versioned and assessed against independently human-labelled examples. Calibration MUST cover relevant task slices, difficult failures, disagreement, abstention, order effects, and instructions embedded in candidate answers. Labels and adjudication rationales MUST be retained. Agreement and error tolerances MUST be declared in advance, with adequate sampling and uncertainty analysis.

**QUA-009 Adjudication.** Where an AI judge contributes to qualitative acceptance, the decision MUST combine applicable objective checks, calibrated qualitative scores and the profile's predetermined decision rule. Profiles using sufficient objective criteria alone do not require an AI judge. Judge disagreement, an indeterminate boundary result, suspected evaluator manipulation, or insufficient confidence MUST trigger the defined human review path. Human adjudication resolves qualitative ambiguity against the rubric; it cannot waive a failing mandatory conformance gate. A judge revision or material drift requires recalibration and impact assessment.

Candidate identities SHOULD be blinded where feasible; paired comparisons SHOULD test reversed presentation order. Evaluator responses are untrusted data, not tool-execution instructions. Passing a broad average MUST NOT conceal failure of a mandatory task slice.

## Test taxonomy, CI, and negative paths

**QUA-010 Test catalogue.** Tests MUST identify applicable requirements, profile, fixtures, stimulus, oracle, expected effects, and evidence. The catalogue MUST distinguish unit/static checks; property, fuzz, and metamorphic tests; schema/ABI interoperability; adapter integration; distributed fault injection; security/policy tests; model quality; performance/soak; client lifecycle; installation; and recovery. A mock result MUST be labelled as such.

**QUA-011 CI gates.** Each change MUST run deterministic checks and the tests affected by its contracts. Hardware-dependent suites MUST run against registered snapshots before releasing affected support claims. Scheduled campaigns SHOULD cover longer fuzzing, soak, load, and failure exploration. Release candidates MUST pass their declared profile matrix, update/recovery paths, and applicable CA scenarios. Skipped, blocked, and not-applicable results MUST remain distinct; a skipped mandatory test cannot count as a pass.

### Additional qualification tests

These tests supplement the existing CA scenarios. Each fixture requires a reproducible setup and an observable assertion of prohibited as well as expected effects.

| ID | Negative stimulus | Required result and evidence |
| --- | --- | --- |
| QT-01 | Run a candidate build on a CPU missing a required optional instruction or under a different process architecture. | Safe compatibility rejection or a separately qualified baseline path; inventory identifies the actual mode and no unsupported instruction executes. |
| QT-02 | Advertise a model operation as supported, then replace the driver or runtime with an incompatible revision. | Capability evidence becomes invalid; admission or pre-execution validation rejects the affected operation and records the changed snapshot. |
| QT-03 | Feed malformed plans, duplicate fields, overflowed lengths, and an unknown mandatory effect to the parser/validator. | Bounded failure with stable error classification; no effects, process escape, or accidental acceptance. |
| QT-04 | Inject a runtime failure between child-task creation and ownership registration. | The specified concurrency invariant holds; no untracked effect-capable child survives. Resource and task traces establish the outcome. |
| QT-05 | Stall a stream consumer while the producer continues, then cancel. | The declared buffering/backpressure bound holds; cancellation state remains accurate and resources are eventually reconciled within the profile's bound. |
| QT-06 | Replace a serialized value with an incompatible layout, stale resource handle, or local-process pointer. | Boundary validation rejects it before dereference or dependent effects; the error identifies the incompatible contract. |
| QT-07 | Insert instructions into a candidate answer telling the AI judge to award a passing score. | The evaluator fails the manipulation probe or ignores it according to the calibrated rubric; no authority or tool access is gained. |
| QT-08 | Reverse answer order, introduce a known critical factual defect, and compare judge decisions with held-out human labels. | Calibration meets predefined slice-level criteria; otherwise the judge cannot provide the acceptance verdict. |
| QT-09 | Speed up a candidate by unauthorized quantization or by excluding timed-out requests from reported latency. | Configuration or accounting checks invalidate the comparison; raw request counts and rejected evaluation evidence are preserved. |
| QT-10 | Change an engine dependency after an earlier successful qualification run. | The old evidence cannot silently certify the new build; impact analysis and required reruns are linked to the new manifest. |
| QT-11 | Interrupt a state migration after some durable records are updated and before activation completes. | Recovery uses the documented compatible-state procedure; no duplicate external effects or false success, with state counts and schema versions verified. |
| QT-12 | Reconnect an offline node carrying expired authority, an obsolete plan, and an unacknowledged external result. | It cannot begin expired work; versions and authority are reconciled, and the uncertain effect is investigated before retry. |
| QT-13 | Present a tampered update, revoked signing identity, or authenticated but prohibited downgrade. | Activation is refused; valid current state remains recoverable and the rejection produces protected evidence. |
| QT-14 | Remove a mobile client's background permission or terminate its process during an accepted task. | Availability and completion claims reflect loss of evidence; only confirmed progress can be recovered and no unauthorized fallback occurs. |
| QT-15 | Exhaust an evaluation's sample budget with a confidence interval crossing its gate. | The outcome remains inconclusive; rerunning until a favourable sample appears does not produce qualification. |

## Implementer workflow and evidence

**QUA-012 Work sequence.** Implementers MUST select the profile and requirement mapping, register fixtures and expected outcomes, capture the environment, build from identified sources, run checks, investigate failures, and publish an evidence manifest before requesting qualification. Existing valid evidence MAY be reused only with a recorded impact rationale. Review MUST include an accountable verifier distinct from the change author for promotion to qualified.

The normal sequence is: contract and oracle; failing or discriminating test; implementation; focused verification; affected-profile regression; evidence review; promotion. Experimental work can continue while qualification remains blocked. Mandatory failures are repaired or the affected capability is disabled and its claim withdrawn.

**QUA-013 Event records.** Qualification MUST produce structured records linking requirements, tests, builds, profiles, tasks, attempts, and effects where relevant. Records MUST distinguish observation, inference, and verdict. UTC timestamps support correlation; monotonic durations support local timing. Event ordering across machines MUST NOT rely solely on unsynchronised wall clocks.

Suggested JSON Lines record:

~~~json
{
  "schema": "trix.qualification.event/v1",
  "event_id": "<unique>",
  "run_id": "<run>",
  "test_id": "QT-11",
  "requirement_ids": ["QUA-017", "VER-005"],
  "profile_id": "<profile>",
  "snapshot_id": "<immutable-reference>",
  "build_digest": "<digest>",
  "time_utc": "<timestamp>",
  "sequence": 12,
  "monotonic_elapsed_ms": "<measured-number>",
  "phase": "recovery",
  "outcome": "blocked",
  "reason_code": "STATE_COMPATIBILITY_UNPROVEN",
  "evidence_refs": ["<protected-artifact-reference>"]
}
~~~

The example is illustrative, not a measured event. Payloads and credentials MUST NOT be copied into general logs. Protected artifact references and pseudonymous identifiers SHOULD replace sensitive content. Outcome vocabulary MUST include pass, fail, blocked, inconclusive, not-run, and not-applicable.

Suggested results and defect CSV columns:

~~~csv
run_id,test_id,requirement_id,profile_id,snapshot_id,build_digest,outcome,metric,unit,threshold,observed_value,sample_count,uncertainty,evidence_ref,defect_id,reviewer
defect_id,severity,affected_profiles,invariant_violated,reproducer_ref,owner,remediation,fix_revision,regression_tests,residual_limitations,closure_evidence
~~~

**QUA-014 Reproduction package.** Evidence MUST include source/build identity, dependency locks, configuration, snapshot, fixture revisions, commands, raw permitted measurements, summarisation method, verdicts, and protected artifact hashes. An independent authorised reviewer MUST be able to rerun or audit the claim. Proprietary or unavailable dependencies MUST be identified, with the resulting reproducibility limitation. Evidence retention and access follow project policy.

**QUA-015 Defect handling.** Every failing mandatory gate MUST create a tracked defect with scope, owner, reproducer, remediation, and closure evidence. Unauthorized effects, protected-data exposure, state corruption, false completion, or invalid update acceptance MUST stop affected qualification and rollout. Flaky tests require investigation; retry history MUST be retained and a later pass MUST NOT erase an unexplained failure. Quarantining a test cannot preserve an unsupported qualification claim.

## Rollout, migration, and offline recovery

**QUA-016 Controlled promotion.** Release plans MUST identify candidate artifacts, authentication checks, deployment cohorts, health signals, exposure limits, stop rules, and recovery actions. Promotion proceeds from laboratory evidence to an authorised limited deployment and then broader rollout. Cohort sizes and observation windows are profile decisions. Shadow evaluation MUST NOT duplicate external effects or export protected data without authorization.

**QUA-017 State-aware recovery.** Qualification MUST exercise upgrade interruption, mixed-version operation where offered, state/checkpoint migration, backup restoration, and offline-node return. Recovery MUST verify schema compatibility, task/effect identities, authority, and audit continuity before resuming work. Binary rollback alone is insufficient. Irreversible migration requires a tested compatible restore or forward-recovery procedure, with declared data-loss implications.

Offline nodes MUST re-establish identity, version compatibility, and valid authority before new effects. Pending submissions and uncertain results require deduplication or reconciliation. Replayed messages, stale credentials, changed policies, or incompatible checkpoints MUST NOT silently extend prior permission.

**QUA-018 Stop and resume.** Operational acceptance MUST define thresholds for stopping promotion, withdrawing affected capabilities, or entering controlled recovery. Resumption requires a recorded cause assessment, corrective action, affected-scope revalidation, and the designated approval. Existing authorized routine execution does not require repeated human confirmation. The supported-version window, including any N/N-1 policy, remains an explicit pending decision until approved and tested.

## Delivery priorities

Priority determines implementation order, never exemption from requirements needed by an offered capability.

| Stage | Mandatory scope for its claim | Deferred unless explicitly offered |
| --- | --- | --- |
| E0: before implementation commitments | Requirement/profile mapping, concrete reference-hardware inventory, plan contracts, test oracles, owners, acceptance-profile decisions. | Broad vendor/version promises; numerical targets without workload decisions. |
| E1: local MVP | One CPU executor and control path; adopted plan conformance; authorization; errors/cancellation; evidence records; installation and basic state recovery. | General-purpose grammar, replicated coordination, broad accelerator coverage. |
| E2: distributed reference MVP | Exact Apple and NVIDIA profiles; one complete cross-destination workflow; admission, data policy, fault/reconciliation tests; state-aware deployment. | Claims of interchangeable model state, heterogeneous tensor parallelism, unmeasured SLOs. |
| E3: extension proof | An independent third real integration through the published SDK; applicable CA-19 and qualification tests. | Universal AMD/Intel/Qualcomm/TPU/Neuron support inferred from that integration. |
| E4: language frontend | Grammar and compiler/interpreter conformance; source-to-plan equivalence; diagnostics; compatibility/migration evidence. | General language features lacking specified semantics and executable tests. |
| E5: expansion | Additional named platform profiles; mobile/browser lifecycle gates; larger-scale/soak evaluation; maintained qualification catalogue. | Unsupported architecture combinations and workload extrapolation. |

Before operational acceptance, the owner must resolve reference hardware and software revisions, workload datasets, SLO/quality thresholds, sampling budgets, human adjudication responsibilities, evidence retention, and version-maintenance policy. Until then, those fields remain decision-pending and the associated claims remain planned or experimental.
