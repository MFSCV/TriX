# 8 Task contracts and failure handling

**TAR-001 Contract.** Each task MUST declare inputs, outputs, permitted effects, requirements, completion criteria and unavailability behaviour. Models, tools and policies MUST have a version or an explicit resolution rule.

**TAR-002 Identity.** Workflows, tasks, attempts and external effects MUST have distinguishable identities. A new attempt MUST NOT erase history or create implicit new authority.

**TAR-003 States.** The system MUST distinguish at least created, validated, queued, running, cancelling, succeeded, failed, cancelled and awaiting reconciliation. Reserved, waiting or suspended states MAY be added with defined semantics. Transitions MUST be validated and recorded.

**TAR-004 Completion.** Success MUST require verification of the output contract and known effects. A missing response with an uncertain outcome MUST trigger reconciliation when the result cannot otherwise be determined.

**TAR-005 Retries.** Retry policy MUST distinguish repeatable computation, idempotent effects and effects requiring reconciliation. TriX MUST NOT promise exactly-once execution for arbitrary external effects.

**TAR-006 Deduplication.** Repeatable effects MUST use identification, deduplication or equivalent destination-appropriate mechanisms. Where these do not exist, the task MUST follow an explicit verification or intervention policy.

**TAR-007 Actual cancellation.** The executor MUST report whether cancellation is cooperative, stage-dependent or achieved by process interruption. Completed effects MUST remain recorded and MUST NOT be considered undone without confirmation.

**TAR-008 Checkpoints.** A checkpoint MUST identify content, versions, resumption unit and compatibility conditions. Logical session state MUST NOT be confused with transferable GPU, process-memory or KV-cache state.

**TAR-009 Offline continuity.** Each workflow MUST define loss-of-connectivity behaviour. Offline operation MUST NOT increase authority, export data through an alternative channel or create competing authority over shared resources.

**TAR-010 Provenance.** Execution MUST preserve enough evidence to identify code, policies, models, inputs, attempts and results. Recorded content MUST obey access and retention policies.

**TAR-011 Recovery.** Each operational profile MUST define recovery objectives, possible progress loss and reconciliation mechanisms. Unmeasured objectives MUST be labelled targets, not operational guarantees.

# 9 Data, models and memory

**DAD-001 Classification.** Data and artifacts MUST identify their project, permitted access, authorised destinations and retention policy. These properties MUST be checked during planning and actual access.

**DAD-002 Derived data.** Excerpts, summaries, embeddings, transcripts, extracted images and intermediate results MUST retain applicable source restrictions. Reclassification or export MUST be explicit and authorised. Transformation alone MUST NOT be described as automatic anonymisation.

**DAD-003 Model identity.** A model MUST be identified to the precision required by the task, including weight revision, tokenizer, format, quantisation, configuration, context and capabilities where relevant. A commercial name alone MUST NOT replace a more precise identity required for reproduction.

**DAD-004 Substitution.** Changes to model, quantisation, precision or implementation MUST respect authorised alternatives and quality criteria. Spare capacity or lower cost MUST NOT justify silent substitution.

**DAD-005 Multimodal data.** Multimodal inputs and outputs MUST declare relevant formats and limits, including dimensions, duration or volume where applicable. Conversions MUST retain provenance and disclose task-relevant losses.

**DAD-006 Memory accounting.** Admission MUST consider relevant weights, caches, buffers, temporaries and operational margin. Estimates MUST distinguish CPU memory, accelerator memory and memory actually shared through a unified architecture.

**DAD-007 Caches.** Cache reuse MUST respect model, configuration and data authorisation. Caches MUST NOT provide unauthorised access between projects.

**DAD-008 Distribution.** Artifact location, transfers and replicas MUST be explicit. Aggregated memory across nodes MUST NOT be presented as coherent memory available to any process.

**DAD-009 Consistency.** The specification MUST define consistency for shared project, artifact and metadata changes. Results under different revisions MUST remain distinguishable. Write conflicts MUST have a documented resolution rule.

**DAD-010 Retention and deletion.** The product MUST support retention and deletion policies. It MUST distinguish logical removal, access revocation and physical-erasure guarantees actually supported by the environment.

Apple unified-memory execution, Core ML device selection and distributed GPU communication have different boundaries. A plan must qualify the engine and execution group actually used. No reference listed here makes one host's memory an automatically coherent extension of another host. [F09] [F10] [F20] [F21]

# 10 Resources, priorities and placement

**REC-001 Decision order.** Prohibited, incompatible or resource-ineligible destinations MUST be excluded before optimisation. Priority, price or performance MUST NOT compensate for a violated mandatory requirement.

**REC-002 Limit enforcement.** A limit MUST be described as enforced only when an appropriate mechanism has been verified. Accounting reservations or usage observations MUST NOT be described as physical isolation.

**REC-003 Admission.** Admission MUST account for quotas, ongoing work and usable capacity. Policies SHOULD protect interactive capacity and prevent indefinite starvation of eligible work.

**REC-004 Network and locality.** Planning MUST consider transfers, latency, bandwidth, data availability and setup costs relevant to the whole workflow.

**REC-005 Shared capacity.** Containers, virtual machines and subsystems exposing the same equipment MUST share a physical-resource identity or equivalent coordination to prevent double counting and over-reservation.

**REC-006 Mobility and power.** Terminals MUST advertise availability, power state and relevant system restrictions. Participation MUST respect user policy and actual ability to continue in the background.

**REC-007 External costs.** Remote operations MUST have a budget and admission policy. Estimates, confirmed charges and uncertain liabilities MUST be distinguishable. A provider's inability to impose a strict cap on an in-flight request MUST be disclosed.

**REC-008 Placement explanations.** The system MUST explain why it selected or excluded a destination without exposing secrets or other projects' data. No eligible destination MUST result in waiting, an error or a previously authorised alternative.

| Decision layer | Example checks |
| --- | --- |
| Authority and data | Project scope, destination permission, credential validity |
| Compatibility | Model operation, engine, precision, ABI and mandatory features |
| Admission | Memory, quotas, reservations, concurrency and available budget |
| Optimisation | End-to-end latency, cost, energy and local user preferences |

# 11 Platform identity and compatibility

CPU instruction set, vendor, operating system, ABI, accelerator and execution environment are separate dimensions. In this document, x86-64, x64 and AMD64 name the same 64-bit instruction-set family; x86-32 identifies its 32-bit predecessor. ARM64/AArch64 is a different family. Intel Arc is an accelerator product family, not a CPU instruction set. A vendor name alone is never a complete target identifier. [F04] [F05] [F06]

**PLT-001 Target identity.** Each package and executor MUST declare the relevant platform combination. Generic labels such as Linux, Windows, ARM or GPU MUST NOT constitute the final compatibility declaration.

**PLT-002 Observed architecture.** Inventory MUST distinguish physical architecture, process architecture and native, emulated or virtualised execution. Optional CPU extensions MUST be checked before use.

**PLT-003 Minimum versions.** Each release MUST distinguish client, local-execution and feature-specific minima. A compiler's minimum target MUST NOT automatically become the complete product's minimum.

**PLT-004 Dependencies.** Python environments and native libraries MUST have pinnable dependencies and compatibility declared by OS, architecture and ABI. Reproducible adapter-specific isolation is RECOMMENDED. [F23]

**PLT-005 Linux and subsystems.** Distributions, system libraries and environments such as WSL MUST have separate profiles where they affect execution or acceleration. A container image MUST NOT replace host-driver and resource verification. [F24]

**PLT-006 Client versus executor.** Interface support, remote control, local CPU execution, acceleration and distributed computation MUST be classified separately. A fully supported control client MAY lack general local execution.

**PLT-007 Mobile systems.** iOS, iPadOS and Android MUST have explicit lifecycle and availability profiles. An installed client MUST NOT be advertised as a permanent executor without supporting mechanisms and conditions. [F07] [F08]

**PLT-008 Physical validation.** Cross-compilation and emulation MAY validate parts of the core. Acceleration, energy and performance claims MUST be validated on representative physical hardware.

**PLT-009 New platforms.** New targets MUST be addable through platform interfaces and applicable adapters. The central grammar MUST NOT create incompatible vendor-specific dialects.

| Target family | Initial qualification intention |
| --- | --- |
| macOS on Apple silicon | Native client and local executor; qualify each engine and machine |
| Linux x86-64 and ARM64 | Server and terminal executors; qualify distribution, ABI and drivers |
| Windows x86-64 and ARM64 | Client and executor profiles separately; distinguish emulation and WSL |
| iOS, iPadOS and Android | Control clients first; local execution subject to lifecycle and device policy |
| Browser | Web control client; local computation only through a separately qualified browser profile |
| x86-32, RISC-V, BSD and other targets | Extension candidates; no qualification claim in this edition |

These are planning categories. No row certifies a platform or sets a minimum operating-system version. Actual qualification records must pin a complete tested combination.

# 12 Accelerators, managers and remote providers

**INT-001 Separate interfaces.** The design MUST separate platform, accelerator discovery, execution engine, cluster manager and remote-provider interfaces. One extension MAY implement several interfaces while preserving their responsibilities.

**INT-002 Minimum execution contract.** Task-execution adapters MUST expose identity, capabilities, request validation, submission, observation, results and cancellation requests. Other interfaces MUST publish contracts appropriate to their responsibility. Semantics and limitations MUST be explicit; unavailable operations MUST NOT be advertised as supported.

**INT-003 Optional operations.** Reservation, suspension, checkpointing, resumption, state export, priorities and process groups MUST be negotiated. An absent capability MUST NOT be simulated by claiming a stronger guarantee than the implementation provides.

**INT-004 Third-party extensions.** Contract specifications, an SDK, examples and conformance tests MUST be available. A third party MUST be able to add an integration without changing central language semantics.

**INT-005 Origin and trust.** Extensions MUST identify maintainer, version, dependencies and required permissions. Installation and update MUST verify integrity and the defined trust policy for that origin.

**INT-006 Model validation.** Recognising a device or loading an engine MUST NOT qualify every model. Each advertised capability MUST identify its tested scope.

**INT-007 Remote models.** Model APIs MUST obey the same task, data-location, credential, cost and audit contracts. A model-proposed tool call MUST return through local authorisation before execution.

**INT-008 Isolation.** Adapters MUST operate within the authority of assigned work. Failure or restart MUST produce reconcilable errors and states. Separate processes and dependency environments SHOULD reduce interference between engines.

**INT-009 Joint computation.** Splitting one inference or training operation across vendors MUST have a specific backend and tests for operations, communication, precision and recovery. Independent task support MUST NOT be advertised as arbitrary-device tensor parallelism.

| Integration family | Candidate path and qualification boundary |
| --- | --- |
| Apple | MLX, Metal-facing engines or Core ML; qualify API, hardware and model [F09] [F10] |
| NVIDIA | CUDA-based engines; qualify host architecture, driver, engine and model [F11] |
| AMD | ROCm or other maintained engines; qualify the exact device and software matrix [F12] |
| Intel | OpenVINO and device-specific engines; Gaudi uses its own software stack [F13] [F14] |
| Qualcomm | QNN-compatible integrations; qualify OS, device, model and operator coverage [F17] |
| Other accelerators | TPU/JAX, AWS Neuron or future adapters under their own contracts [F18] [F19] |
| CPU | Native engine appropriate to the task; verify architecture and optional instructions |
| Remote providers | Versioned API adapter with declared residency, rate limits, cost and model identity |

Kubernetes and Slurm are resource managers rather than model engines. PJRT is an example of an extensible device interface, not a universal compatibility guarantee. TriX adapters must keep these layers distinct. [F15] [F16] [F22]

# 13 Versions, distribution and updates

**VER-001 Version axes.** Language, plan, protocol, extension API and persistent-state versions MUST be identifiable separately from the product release.

**VER-002 Negotiation.** Components MUST check applicable versions and capabilities before relevant execution. Unknown mandatory features MUST cause explicit refusal. Partial operation MAY occur only where its contract defines it.

**VER-003 Releases.** Each release MUST include target, dependency, integrity, origin and support manifests. Developer tools, clients, executors, adapters and models MUST be independently distributable where their contracts permit it.

**VER-004 Updates.** Updates MUST check compatibility, handle in-flight work and confirm operation before final activation. Gradual activation is RECOMMENDED for execution-affecting changes.

**VER-005 Rollback.** Rollback MUST account for persistent state and checkpoints. Reinstalling an old binary MUST NOT be presented as valid recovery if it cannot interpret the recovered state.

**VER-006 Support window.** Concurrent-version support MUST be explicit and tested. A rule such as current and previous version MAY be claimed only after specifying which components, versions and features it covers.

**VER-007 Stability.** Breaking changes MUST identify impact, migration and treatment of existing programs. Target deprecation MUST state consequences and available alternatives without silently changing task requirements.

**VER-008 Support labels.** The product MUST distinguish project-qualified, maintainer-qualified, qualified with limitations, experimental, remote-client-only and unsupported combinations. Labels MUST apply to specific features and version combinations.

**VER-009 Update authenticity.** Published packages MUST use signatures or equivalent channel-appropriate authenticity. Verification MUST respect authorised keys, revocation and version policy. A valid signature on an old package MUST NOT alone authorise downgrade.

**BLD-001 Build process.** Each supported target MUST have a documented, automatable build process identifying tools, SDKs and prerequisites. Restrictions preventing independent reconstruction MUST be documented.

**BLD-002 Component inventory.** Distributions MUST preserve an inventory of components, versions, hashes and licences. OS, architecture or ABI variants MUST NOT implicitly share the same binary-dependency set.

**BLD-003 Artifact reproduction.** The project MUST check reconstruction in a clean environment. Where byte identity cannot be guaranteed, it MUST declare the verified equivalence level and retain artifact provenance.

Build provenance and artifact verification should be designed together. The SLSA specification provides a reference vocabulary; citing it does not establish that TriX achieves a SLSA level. [F29]

# 14 Developer tools and user experience

**DEV-001 Essential tools.** The first usable toolset MUST validate programs or plans, inspect capabilities, run work, observe progress, request cancellation and explain errors. Consistent formatting and editor integration are RECOMMENDED.

**DEV-002 Diagnostics.** Errors MUST identify the operation, source location when available, violated requirement and known cause. They MUST distinguish program errors, policy refusal, incompatibility, unavailability and execution failure.

**DEV-003 Preview.** The platform MUST inspect a plan without performing its external effects. Preview MUST expose relevant requirements and uncertainties and MUST NOT describe unallocated resources as reserved.

**DEV-004 Documentation.** Every stable feature MUST have semantic documentation, executable examples, relevant errors and support conditions. User-facing executable examples MUST be checked against their stated versions.

**DEV-005 Observability.** The product MUST expose states, attempts, timings and resource usage. Telemetry and logs MUST minimise private data and respect project permissions.

**DEV-006 Shared interface contract.** Clients on different platforms MUST share task, action and state contracts. Visual implementations MAY be platform-specific. Keyboard access, readable messages and status indications independent of colour are RECOMMENDED.

**DEV-007 Inspectable dependencies.** Tools MUST expose effective execution versions and permissions. Installation diagnostics SHOULD distinguish installed package, detected device, usable engine and qualified model.

**DEV-008 Complete examples.** Documentation MUST include local, cluster and authorised remote-provider workflows and a policy-refusal case. Examples MUST show unavailability and failure behaviour.

**UXD-001 Web and native access.** The product design MUST provide a web control application and permit native clients using the same versioned service contracts. A browser client MUST NOT silently obtain native filesystem, process or accelerator authority; any companion bridge MUST be explicitly enrolled and restricted.

**UXD-002 Accessibility and localisation.** User interfaces MUST publish an accessibility target and test keyboard operation, focus, screen-reader names and errors. The web reference profile SHOULD target WCAG 2.2 AA. Interface translations MUST preserve operation meanings, units and authority prompts; diagnostic codes MUST remain stable. [F30]

**UXD-003 Explainable autonomy.** A client MUST show active delegation scope, relevant limits and task state. Previously granted authority MUST remain usable without repeated prompts. A change requiring more authority MUST identify the concrete new action and reason before requesting it.

**UXD-004 Decision traces.** Placement and policy traces MUST record considered constraints and a redacted reason for each decision. Telemetry exports MUST use a declared schema mapping and minimise sensitive payloads. OpenTelemetry conventions MAY be used with pinned versions or commits; changing upstream conventions MUST NOT silently alter TriX evidence fields. [F28]
