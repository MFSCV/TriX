# 20 Acceptance catalogue

## Mandatory scenarios by profile

Each scenario must identify its setup, stimulus, expected outcome, and collected evidence. Scenario applicability follows the profile matrix required by NOR-004 and the capabilities actually provided. The conformance catalogue must justify exclusions without removing tests necessary for the behaviour offered.

The cases below specify expected behaviour; they do not report completed tests.

**CA-01 Invalid external type.** An adapter returns text where the contract requires a number. The system rejects the value with a validation error and does not propagate it as typed data. Evidence: the diagnostic and the absence of dependent effects. Requirements: LNG-003 to LNG-005, DEV-002.

**CA-02 Prohibited export.** A document and a derived summary attempt to reach an unauthorized destination. Both are blocked before transfer. Evidence: the policy decision, rejected destinations, and no expansion of authorization. Requirements: LNG-009 to LNG-011, DAD-001 and DAD-002, REC-001.

**CA-03 Authority in a document.** An input contains instructions to obtain credentials or execute tools. The content does not increase capabilities, and the unauthorized effect is refused. Requirements: LNG-010, GOV-002, GOV-005 and GOV-007.

**CA-04 Already authorized task.** A workflow within the current delegation executes without redundant confirmations. A change of scope is blocked or follows the policy for additional authorization. During a network partition, execution does not initiate new effects after local authorization expires; a received revocation is handled according to the profile's rule. Requirements: GOV-001, GOV-002 and GOV-005.

**CA-05 Peer communication.** An agent attempts to bypass the hierarchical route. The message is refused. An authorized technical transfer remains possible and is recorded. Requirements: ARQ-004 and GOV-003.

**CA-06 Concurrent coordinators.** After a network partition, two instances attempt to allocate the same resource. The authority mechanism prevents incompatible effects. Requirements: ARQ-005, GOV-006, TAR-009 and REC-005.

**CA-07 Incompatible target.** Spare capacity exists, but the required model, operation, or version is unsupported. The system waits or refuses according to the contract, without silently changing the model or precision. Requirements: IDN-004, CON-006, DAD-003 and DAD-004, REC-008.

**CA-08 New requirement on an old executor.** The executor receives a plan containing an unknown mandatory requirement. The task is refused before producing effects. Requirements: CON-005 and CON-006, VER-001 and VER-002.

**CA-09 Deadline and cancellation.** A remote operation exceeds its deadline. The interface distinguishes deadline expiry, a cancellation request, and confirmation of termination. Effects already performed remain identifiable. Requirements: CON-003, TAR-003, TAR-004 and TAR-007.

**CA-10 Uncertain external effect.** The connection fails after a target receives an operation with an effect. The system uses deduplication or reconciliation; it does not blindly repeat the operation. Requirements: TAR-002, TAR-004 to TAR-006.

**CA-11 Adapter failure.** An integration process terminates unexpectedly. The core preserves identity and state, reports the failure, and reconciles resources and effects. It does not declare success without sufficient evidence. If reconciliation establishes that the contract has been fulfilled, it may complete the task; while uncertainty remains, reconciliation continues. Requirements: CON-007 and CON-008, TAR-003, TAR-004 and TAR-011, INT-008.

**CA-12 Incompatible checkpoint.** Resumption is attempted with an incompatible engine or schema. The system rejects resumption with a reason and accepts only an alternative provided for by the contract. Requirements: TAR-008, VER-002 and VER-005.

**CA-13 Insufficient memory.** The model's weights fit within the advertised capacity, but the context and buffers exceed the admissible capacity. Execution is refused, deferred, or adjusted only according to an authorized alternative. Requirements: DAD-006, REC-002 and REC-003.

**CA-14 Memory across multiple nodes.** The total memory of devices without a validated group appears sufficient. The system does not advertise it as usable combined capacity. Requirements: ARQ-006, DAD-008 and INT-009.

**CA-15 Cross-project cache.** A task attempts to reuse a cache containing data not authorized for the project. Access is prevented, and the cache does not disclose unauthorized content. Requirements: DAD-001, DAD-007 and GOV-005.

**CA-16 Suspended terminal.** A terminal loses power, connectivity, or background-execution permission. Where possible, it reports the change. Without that report, coordination stops treating availability as confirmed after the declared timeout. Only previously confirmed progress is recoverable; loss of connectivity does not prove that the work has terminated. Requirements: PLT-006 and PLT-007, REC-006, TAR-009.

**CA-17 Remote model and tools.** An API returns a tool request. The request passes through local authorization. A refusal under a budget or export limit prevents further requests covered by that limit. Requirements: INT-007, REC-007 and GOV-007.

**CA-18 Update with state.** An update changes the persistent schema. The system verifies migration and advertises rollback only when the previous binary understands the recovered state. Requirements: VER-001, VER-004 and VER-005.

**CA-19 Third backend.** An independent integration executes the same task contract, exposes its own capabilities and errors, and passes the applicable tests without creating a language dialect. Requirements: PLT-009, INT-001 to INT-006 and VAL-005.

**CA-20 Numerical reproduction.** The same task runs on two eligible engines. Results are evaluated against the declared identity, tolerance, or quality criterion; differences are reported without claiming equivalence that does not exist. Requirements: CON-010, DAD-003 and DAD-004, VAL-002 and VAL-003.

**CA-21 Installation across architectures.** Packages for different targets are correctly identified. Emulated execution is not confused with native execution, and acceleration is advertised only after the corresponding verification. Requirements: PLT-001 to PLT-005 and PLT-008, DEV-007.

**CA-22 Audit protection.** An operational component attempts to change audit evidence or permissions using its own credentials. The operation is refused, does not modify protected state, and produces verifiable evidence. Limits concerning privileged administrators are stated in the trust model. Requirements: GOV-004, GOV-009 and TAR-010.

**CA-23 Authentic build and update.** A distribution is rebuilt in a clean environment and compared according to the declared level of reproducibility. A package that has been altered, comes from an unauthorized source, or is prohibited by version policy is refused. Requirements: BLD-001 to BLD-003, VER-003, VER-004 and VER-009.

**CA-24 Unauthenticated node.** A process presents the name of a valid node without proving the corresponding identity. The connection does not receive that node's authority and does not obtain private data. Diagnostics do not expose credentials. Requirements: GOV-008 and GOV-009, DEV-002 and DEV-005.

# 21 Glossary

| Term | Definition used |
| --- | --- |
| Adapter | A component that connects a TriX contract to a concrete implementation |
| ABI | Compatibility conventions between binary components |
| Accelerator | A specialized computing device, such as a GPU, NPU, or TPU |
| Actor | A unit of isolated state that interacts through defined operations or messages |
| Backend | An implementation that executes an operation or engine for a target |
| Technical capability | A function or resource that a component declares, verifies, or observes that it can provide |
| Authorization capability | A right granted for an operation within a defined scope and validity period |
| Checkpoint | Saved state with an explicit resumption contract |
| Cluster | A collection of machines managed to provide resources |
| Effect | An observable change outside local computation |
| Executor | A component that performs authorized work on a target |
| Validated group | Resources demonstrated to be compatible for a defined joint execution |
| Idempotence | The property that permits repeating an operation without multiplying its intended effect |
| KV cache | Intermediate attention state of certain models, whose compatibility depends on the implementation |
| Plan | A verifiable representation of tasks, dependencies, effects, and requirements |
| Profile | A declared set of capabilities and conformance conditions |
| Provenance | A record of the origin and versions that produced an artifact or result |
| Reconciliation | The process of determining and resolving the outcome of an uncertain operation |
| Runtime | Components that coordinate and carry out plan execution |
| SDK | Tools and interfaces for developing integrations |
| Tensor parallel | Partitioning a model's operations across devices with coordinated communication |

# 22 Technical sources

The following sources are informative and were consulted in the design context on 22 October 2026. Compatibility matrices evolve. Each TriX release should pin and verify the specific versions it uses. This document's own requirements are design proposals, not transcriptions of these sources.

**F01 Rust.** The Rust Programming Language, Understanding Ownership. Background for ownership, borrowing, and resource-lifetime management.

[Source](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)

**F02 Python.** The Python Tutorial. Reference for high-level structures, scripting, and extensibility.

[Source](https://docs.python.org/3/tutorial/)

**F03 Swift.** The Swift Programming Language, Concurrency. Reference for structured concurrency, actors, and transfer between domains.

[Source](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)

**F04 Rust.** Platform Support. Compilation targets and compiler support levels.

[Source](https://doc.rust-lang.org/rustc/platform-support.html)

**F05 Android.** Android ABIs. Distinction between instructions, ABI, and binary compatibility.

[Source](https://developer.android.com/ndk/guides/abis)

**F06 Microsoft.** Add Arm support to your Windows app. Native execution, emulation, and ARM64 dependencies.

[Source](https://learn.microsoft.com/en-us/windows/arm/add-arm-support)

**F07 Apple.** Finish tasks in the background, WWDC25. Task continuation and conditional background GPU access.

[Source](https://developer.apple.com/videos/play/wwdc2025/227/)

**F08 Android.** Background tasks overview. Work models and background restrictions.

[Source](https://developer.android.com/develop/background-work/background-tasks)

**F09 Apple MLX.** Official repository. APIs, execution devices, and installation variants.

[Source](https://github.com/ml-explore/mlx)

**F10 Apple.** Optimize your Core ML usage, WWDC22. CPU, GPU, and Neural Engine use according to the model.

[Source](https://developer.apple.com/videos/play/wwdc2022/10027/)

**F11 NVIDIA.** CUDA Installation Guide for Linux. Qualified architectures and environments.

[Source](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/)

**F12 AMD.** ROCm compatibility matrix. Relationships between hardware, operating system, firmware, drivers, and software.

[Source](https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html)

**F13 Intel Gaudi.** Intel Gaudi Software Suite. Execution components and HCCL communication.

[Source](https://docs.habana.ai/en/latest/Gaudi_Overview/Intel_Gaudi_Software_Suite.html)

**F14 Intel OpenVINO.** System Requirements. CPU, GPU, and NPU profiles.

[Source](https://docs.openvino.ai/2026/about-openvino/release-notes-openvino/system-requirements.html)

**F15 Kubernetes.** Schedule GPUs. GPU resources and node selection.

[Source](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)

**F16 Slurm.** Generic Resource Scheduling. Allocation of resources such as GPUs.

[Source](https://slurm.schedmd.com/gres.html)

**F17 ONNX Runtime.** QNN Execution Provider. Integration with Qualcomm accelerators and specific requirements.

[Source](https://onnxruntime.ai/docs/execution-providers/QNN-ExecutionProvider.html)

**F18 JAX.** Installation. Packages and requirements by platform and accelerator, including Cloud TPU.

[Source](https://docs.jax.dev/en/latest/installation.html)

**F19 AWS.** What is AWS Neuron. Compilation and execution on Trainium and Inferentia.

[Source](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/about-neuron/what-is-neuron.html)

**F20 NVIDIA.** NVIDIA Collective Communications Library. Communication between GPUs and nodes in the NVIDIA ecosystem.

[Source](https://developer.nvidia.com/nccl)

**F21 AMD.** RCCL documentation. Distributed communication optimized for AMD GPUs.

[Source](https://rocm.docs.amd.com/projects/rccl/en/latest/)

**F22 OpenXLA.** PJRT Uniform Device API. Device interface through plugins.

[Source](https://openxla.org/xla/pjrt)

**F23 Python Packaging.** Platform compatibility tags. Compatibility across Python, ABI, and platform.

[Source](https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/)

**F24 Docker.** Multi-platform builds. Image variants by operating system and architecture.

[Source](https://docs.docker.com/build/building/multi-platform/)
