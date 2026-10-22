# TriX
## Design and Implementation Standard

Version 0.2 | 22 October 2026 | Proposed normative baseline

TriX is a language and a set of execution contracts for organising projects, tasks and distributed resources. She is designed to combine accessible expression, strong validation and integration with existing engines. Her initial reference installation uses a Mac cluster, an NVIDIA cluster and heterogeneous terminals; her architecture admits other configurations.

This consolidated edition governs language design, runtime behaviour, extension interfaces, platform qualification and implementation evidence. It is accompanied by an English implementation pack containing contract schemas, examples, requirement and test registers, decision templates and validation tools.

The name, feminine identity, English documentation policy and vendor openness reflect the project direction. Technical clauses are a proposed baseline for adoption. This edition specifies work to be implemented; it does not certify a compiler, runtime, platform or accelerator. The companion validation report measures the documentation package only.

# 1 Identity and purpose

The spelling TriX plays on the sound of the English word tricks and the idea of transforming a clear description of work into suitable execution. Her feminine identity and the name's appeal are part of the project's creative intent.

**IDN-001 Identity.** The language MUST be named TriX, preserving capital T and X. Pronouns referring to TriX MUST use the feminine forms she and her in English. This convention does not change the grammatical reference to a compiler, runtime component or artifact. Technical identifiers MAY use the normalisation required by their format.

**IDN-002 Purpose.** TriX MUST support describing, validating, planning, executing and observing distributed work, including AI models, tools and data processing. She MUST make authority, data location, compatibility and resource conditions explicit.

**IDN-003 Independence.** The language, central protocol and project data MUST NOT require one exclusive hardware vendor, operating system, model provider or cluster manager. A specialised extension MAY depend on a vendor if that dependency is declared.

**IDN-004 Project continuity.** Infrastructure changes MUST preserve programs and projects whose semantics and requirements remain satisfied. When a new installation cannot meet a requirement, TriX MUST explain the incompatibility before initiating the affected task's effects.

**IDN-005 Documentation language.** All authoritative project documentation, specifications, schemas, examples, comments intended for publication, diagnostics catalogues, decision records and implementer instructions MUST be maintained in English. Project documentation in another language requires an explicit later change to this instruction. User interfaces MAY be localised; their authoritative specifications and translation instructions remain in English.

# 2 Normative governance

Uppercase keywords have the meanings below. Explanations, examples and external references are informative unless a requirement explicitly incorporates them. This document describes project conformance, not regulatory certification.

| Keyword | Meaning |
| --- | --- |
| MUST | Mandatory within the adopted revision and applicable profile |
| MUST NOT | Prohibited within that scope |
| SHOULD or RECOMMENDED | Recommendation; an exception requires a recorded rationale |
| MAY | Optional capability subject to applicable contracts |
| Pending | Decision not yet fixed by this revision |
| Illustrative | Example that does not establish a final grammar or prove implementation |

**NOR-001 Adopted revision.** Each implementation MUST declare its specification revision and conformance profiles. The project authority MUST record adoption and subsequent changes. The existence of this document alone does not constitute formal adoption.

**NOR-002 Traceability.** Requirement identifiers MUST remain stable. Deliveries MUST connect applicable requirements to implementation, tests and limitations. Retired requirements MUST be marked superseded or withdrawn; their identifiers MUST NOT be reused.

**NOR-003 Decisions.** Changes affecting semantics, authority, compatibility or guarantees MUST have an architecture decision record, or ADR, covering motivation, alternatives, impact, migration and validation evidence.

**NOR-004 Profiles.** Conformance MUST distinguish the language core, coordination, local execution, distributed execution, remote access and control clients. Each profile MUST publish mandatory requirements, optional capabilities and profile dependencies before any conformance claim. An implementation MUST NOT exclude requirements needed by functionality it exposes.

**NOR-005 Exceptions.** Exceptions to recommendations MUST have recorded reasons. An implementation violating a mandatory requirement MUST NOT claim complete conformance for the affected profile. Pending decisions MUST be resolved before the associated capability becomes stable.

**NOR-006 Document precedence.** For revision 0.2, the numbered English requirements and explicit normative tables in this standard govern behaviour. Companion JSON Schemas govern the structural constraints they express. Examples, templates and generated registers do not override either. A contradiction MUST block the affected conformance claim until a versioned correction resolves it; an implementer MUST NOT silently choose the easier interpretation.

**NOR-007 Evidence status.** Every capability, decision and test record MUST distinguish proposed, implemented and verified status. A successful document-package check MUST NOT be reported as a TriX runtime, compiler, security or hardware test. Claims MUST identify what was actually executed and what remains untested.

# 3 Scope and design objectives

The initial product is a language for typed workflows and authorised distributed operations, with a pure expression subset. The first executable form is a versioned task plan generated by an SDK or controlled builder. A full surface language follows validated semantics.

Rust provides a reference for ownership and resource lifetimes; Python for accessible high-level programming and extension ecosystems; Swift for structured concurrency, actors and safe transfer between concurrency domains. These are design precedents, not a promise to merge their implementations or inherit every guarantee. [F01] [F02] [F03]

**ESC-001 Initial subset.** The first implementation MUST support task contracts, dependencies, policies and execution through adapters. The project SHOULD validate this subset through an SDK, verifiable plans and executors before investing in a general-purpose compiler.

**ESC-002 Separation of responsibilities.** The specification MUST separate language semantics, plan representation, runtime, adapters and developer tools. A graphical-interface decision MUST NOT change a program's meaning.

**ESC-003 Reference implementation.** A Rust coordination and execution core, isolated Python integration adapters and Swift clients on Apple platforms are RECOMMENDED. This composition MUST remain an implementation choice; extensions MUST NOT be required to use these languages solely to participate.

**ESC-004 Reuse.** Existing engines, compilers and distribution mechanisms SHOULD be reused where they satisfy the contracts. A new low-level backend or custom kernel MUST justify its benefit and maintenance cost with evidence.

**ESC-005 Scope limits.** The initial release MUST NOT claim universal compilation of arbitrary libraries, uniform accelerator access, coherent global memory or instantaneous state migration across vendors. Such capabilities require their own specification and validation.

The initial scope excludes an operating system, a replacement GPU driver stack, a universal numerical kernel language and a promise that any Python package runs on every terminal. Existing engines perform model execution through qualified adapters. General-purpose systems programming can be considered through later ADRs.

# 4 Logical and physical architecture

The trinitarian concept describes three logical roles. Their placement is configurable; a deployment may contain several nodes of each kind, and an authorised machine may host several roles.

| Role | Responsibility |
| --- | --- |
| Interaction | Human interfaces, project inspection, submission and results |
| Coordination | Policy, planning, scheduling, delegation and durable task state |
| Execution | Authorised operations on local, cluster or remote resources |

**ARQ-001 Resource cardinality.** Configuration MUST admit lists of nodes, execution groups, clusters and providers. It MUST NOT require either a Mac cluster or an NVIDIA cluster as a structural prerequisite. A deployment MAY contain zero instances of either family.

**ARQ-002 Independent roles.** A machine MAY exercise several authorised roles. Its brand or CPU architecture MUST NOT automatically determine its authority, trust or responsibility for a project.

**ARQ-003 Technical capabilities.** Resource selection MUST distinguish declared, verified and observed technical capabilities. A detected resource MUST NOT be represented as qualified for every model. Technical capability does not grant permission to use it.

**ARQ-004 Control and data paths.** Coordination MUST control authorisation and track operations without requiring all files, tensors or results to pass through the coordinator. Direct transfers MUST have their own authorisation and traceability.

**ARQ-005 Resource managers.** The system MUST support a standalone executor. It MAY integrate managers such as Kubernetes or Slurm through separate contracts. Authority over local reservations MUST be explicit to prevent incompatible allocation of the same resource. [F15] [F16]

**ARQ-006 Execution groups.** Resources used together for one inference or training operation MUST belong to a group validated for that execution mode. The availability of several destinations for independent tasks MUST NOT prove compatibility for joint computation.

Independent workflow stages can be placed on different vendors when their input and output contracts match. Splitting one model across those vendors requires a specifically qualified distributed engine. Control-plane portability and numerical-engine portability are separate claims.

# 5 Core language contracts

**LNG-001 Specification.** TriX MUST have a versioned specification for types, effects, errors, concurrency and distributed execution. The reference implementation MUST be testable against it.

**LNG-002 Syntax.** The approved grammar MUST define lexical rules, precedence, associativity and name resolution. Until approval, syntax examples MUST be labelled illustrative. A program MUST NOT change meaning merely because its hardware vendor or operating system changes.

**LNG-003 Verification.** The verified core MUST check types before execution. Local type inference MAY be used. Public interfaces MUST expose unambiguous types and contracts. Dynamic operations MUST cross an identifiable boundary.

**LNG-004 External values.** Values from models, files, external formats or extensions MUST be validated before use as typed values. Failed conversion MUST produce an identifiable error.

**LNG-005 Absence and failure.** The language MUST distinguish a present value, absence and failure. A remote failure MUST NOT implicitly become an empty successful result.

**LNG-006 Mutability.** Values SHOULD be immutable by default. Mutation MUST be explicit and follow documented ownership, isolation or synchronisation rules.

**LNG-007 Resources.** The language MUST define who controls resource lifetime, when resources may be copied, moved or shared, and how they are released. The final borrowing, reference-counting or other mechanism remains a bounded design decision.

**LNG-008 Remote memory.** A local address MUST NOT cross a process or network boundary as a still-valid reference. Transfers MUST use serialisable values or resource identifiers with verifiable validity and authorisation.

**LNG-009 Effects.** File, network, process, tool, model and remote-resource operations MUST declare relevant effects. The specification MUST identify static checks and checks performed at access time.

**LNG-010 Authority capabilities.** A declaration in a program or extension MUST NOT grant authority by itself. Effect execution MUST depend on capabilities granted and checked by the runtime's authorisation system.

**LNG-011 Policy propagation.** Data restrictions MUST survive functions, collections and task boundaries. Reducing restrictions MUST require an explicit, authorised and audited operation.

**LNG-012 Resource declarations.** The language MUST distinguish requirements, reservations, enforceable limits, objectives and preferences. Estimates MUST be labelled, and final selection MUST consider observed destination capacity.

# 6 Concurrency and interoperability

**CON-001 Concurrency scopes.** Concurrent constructs MUST define parent-child relationships, scope completion and propagation of failure and cancellation. Work surviving its original scope MUST require an explicit durable-execution operation.

**CON-002 Shared state.** The verified subset MUST specify safe sharing. Actors and messages MAY be used. Messages MUST obey types, authority and data-circulation rules.

**CON-003 Cancellation.** The language MUST distinguish cancellation requested, accepted and actually completed. An expired deadline MUST NOT prove that remote execution stopped.

**CON-004 Streams.** Result streams MUST define ordering, completion, failure and backpressure. Partial output MUST be distinguishable from accepted final output.

**CON-005 Intermediate representation.** Compilation or interpretation MUST produce a verifiable plan containing tasks, dependencies, types, effects and requirements. Its schema MUST be versioned independently of platform binaries.

**CON-006 Unknown requirements.** An executor unable to understand a mandatory requirement MUST reject the task before effects begin. An optional feature MAY be omitted only when the contract permits that alternative.

**CON-007 Foreign languages.** Rust, Python, Swift and other integrations MUST define representations, ownership, object lifetimes, errors, concurrency and cancellation. Process isolation SHOULD be used when extension failure could compromise the core.

**CON-008 Guarantee boundary.** Foreign code, native libraries and binary interfaces MUST NOT implicitly inherit verified-core guarantees. Direct interfaces MUST identify their ABI or protocol and compatible version combinations.

**CON-009 Dependencies.** Modules and extensions MUST have unambiguous identities, versions and dependencies. Installation MUST permit pinning the exact artifacts used. Importing a module MUST NOT increase authority.

**CON-010 Reproducibility.** Tasks MUST be able to declare exact identity, numerical tolerance or quality criteria as their reproduction objective. Relevant versions, configuration and seeds MUST be recorded. Those records alone MUST NOT be represented as proof of identical output.

# 7 Authority, security and audit

The reference governance profile preserves human authority and an independent audit line. Operational delegation runs from the human authority to the global Orchestrator, then to a project's SubOrchestrator and its agents. Project Auditors report to the Global Auditor, which reports to the human authority. This routing constrains autonomous agent decisions; authorised infrastructure transfers remain possible.

**GOV-001 Human authority.** TriX MUST recognise final human authority over policies, delegation and revocation. Work within current authorisation MUST be able to proceed autonomously without redundant confirmation requests.

**GOV-002 Context and hierarchy.** Each task MUST identify its project, issuing authority, scope and policy version. Delegation MUST remain within those bounds. In the reference profile, each project MUST have a SubOrchestrator reporting to the global Orchestrator and a Project Auditor reporting to the Global Auditor, which reports to the human administrator. Coordination MUST NOT subordinate the audit line.

**GOV-003 Agent channels.** In the reference governance profile, agents and subagents below the Orchestrator MUST NOT establish autonomous peer-to-peer communication. Delegations and results MUST follow authorised routes. Technical transfers between executors MAY occur without creating autonomous agent channels.

**GOV-004 Independent audit.** Auditor identities and permissions MUST be separate from supervised components. Operational credentials MUST NOT authorise modification or deletion of audit evidence or auditor permissions. Authorised administrative changes MUST follow a separate procedure and create verifiable evidence under the published trust model.

**GOV-005 Enforced policy.** Authority MUST be checked at relevant access boundaries. Each profile MUST define revocation propagation, cached-authorisation validity and offline behaviour. A received, validated revocation MUST block new affected effects and trigger handling of ongoing work. Offline execution MUST NOT extend previously granted scope or validity.

**GOV-006 Replicated coordination.** Replication MUST prevent competing coordinators from causing incompatible accepted allocations or effects over the same resource. Commands carrying stale authority MUST be rejected at the identified enforcement boundary. Recovery MUST preserve work identity and authority.

**GOV-007 Untrusted content.** Instructions in documents, model responses and tool outputs MUST NOT become executable policy by themselves. Received content and granted authority MUST remain distinct.

**GOV-008 Component identity.** Nodes, coordinators, clients and providers MUST be authenticated on relevant connections. Transport MUST protect integrity and confidentiality under the stated trust model. A node name or task identifier MUST NOT act as an access credential.

**GOV-009 Secrets and trust.** Credentials MUST remain outside programs, plans and records not authorised to contain them. The specification MUST publish trust assumptions, including administrator power and isolation limitations.

**GOV-010 Assurance boundaries.** The trusted computing base MUST be identified for each assurance claim, including the verifier, enforcement and state components relied upon and relevant host, transport and compilation dependencies. Structural plan verification MUST NOT be treated as proof of source-to-plan semantic preservation. A compromised privileged host may defeat local isolation; the trust model MUST identify which independently controlled audit systems remain trustworthy in that case.
