# 18 Contract schemas and public interfaces

The companion schemas use JSON Schema Draft 2020-12. They define bounded structural records for an initial task request, a capability manifest, a task observation and test evidence. They do not define the complete language IR, runtime authorisation algorithm or transport protocol. Their scope is intentionally narrower than the language contracts in this standard. [F27]

**SIF-001 Contract artefacts.** The adopted specification MUST publish schemas for public records, examples that validate against them, rejection cases, version rules and semantic invariants not expressible by the schemas. Structural validation MUST NOT be presented as proof of authority, graph correctness, provider behaviour or physical capability.

**SIF-002 Record boundaries.** Requests MUST distinguish project and task identities, operation reference, input and output contracts, requested effects, data policy, resource requirements, retry policy and completion criteria. Authority references MUST be opaque references to verifiable grants, never embedded provider credentials or self-issued authority.

**SIF-003 Structural encoding.** Revision 0.2 companion JSON records MUST reject duplicate keys, non-finite numeric literals, unknown top-level fields and malformed required values. Extensible metadata MUST use declared namespaced keys. Unknown mandatory features MUST be rejected by semantic admission even when their strings are structurally valid. Encoded 64-bit integers and exact decimals MUST avoid implicit conversion through binary floating-point.

**SIF-004 Semantic checks.** The production verifier MUST additionally check identifier uniqueness, resolved dependencies, acyclicity where required, type compatibility, operation/effect correspondence, quantity bounds, policy relationships and supported mandatory features. The package validator checks documentation records and selected discriminating fixtures only; it MUST NOT be advertised as that production verifier.

**SIF-005 API specification.** Before an inbound API is stable, the project MUST publish a machine-readable API definition covering authentication context, request/response schemas, errors, pagination, resource limits, idempotency, asynchronous states and event recovery. The API MUST expose an API version distinct from product and language versions. A client retry MUST reuse its submission identity for the same payload; changed payload under that identity MUST be rejected.

**SIF-006 Credential lifecycle.** API keys or other credentials MUST have an identified issuer, subject, project scope, permitted operations, creation, expiry, revocation and rotation rules. Secrets MUST be stored in an appropriate protected facility and shown only through authorised workflows. Long-lived provider credentials MUST remain on the authorised service or executor boundary rather than being copied into browser bundles, plans or general logs.

**SIF-007 Events and errors.** An API MUST distinguish durable acceptance from execution and verified completion. Event subscriptions MUST expose a resumable cursor or a documented snapshot-reconciliation mechanism, duplicate handling and retention limits. Errors MUST contain a stable code, category, correlation identifier and safe remediation; retryability MUST state conditions rather than promise that retry cannot duplicate an effect.

**SIF-008 MCP adapters.** The reference integration design MUST support both exposing an authorised subset of TriX through an MCP server and consuming external MCP servers through an MCP client. Each direction MUST have separate permissions and pinned protocol revisions. Capability availability MUST follow that revision's rules. Tool descriptions, resources and returned content MUST remain untrusted data. Local process launch, token audience, callback validation, endpoint redirects and outbound network access MUST follow the boundary threat model. [F25] [F26]

**SIF-009 Portability and exit.** Projects MUST be exportable with their logical definitions, dependency references, policies, allowed artifacts and provenance in documented formats. Export MUST enforce access and retention policies, identify omitted provider-owned or unavailable content, and exclude secret values by default. Import MUST revalidate identities, dependencies and authority; a successful export MUST NOT imply that a different infrastructure can execute every operation.

**SIF-010 Extension evolution.** Adapter SDKs MUST publish required and optional operations, error taxonomy, ownership, concurrency and shutdown contracts, supported API revisions and a conformance harness. A capability removal or changed effect summary MUST trigger compatibility review. An extension's integrity signature MUST NOT be treated as evidence that it is correct, safe or qualified.

## Initial public control operations

The operation names below are a proposed transport-neutral reference contract. Their concrete HTTP routes and message formats require API approval before E2. They do not define an already deployed endpoint.

| Operation | Required observable behaviour |
| --- | --- |
| Inspect capabilities | Return scoped capabilities, versions, observation freshness and evidence status |
| Validate or preview | Validate without task effects; report unresolved choices and estimated resources |
| Submit | Authenticate, deduplicate and durably accept or reject; return task identity and initial state |
| Observe | Return authorised state, evidence freshness, outputs and redacted reasons |
| Subscribe | Deliver ordered-per-contract events with duplicate and reconnect semantics |
| Cancel | Record intent and report disposition separately from the request acknowledgement |
| Reconcile | Investigate uncertain execution/effects under explicit authority; preserve evidence |
| Export | Produce authorised portable project data with dependency and limitation records |

## Conformance profile seed

This table is the initial applicability rule. The generated requirement register supplies proposed profile assignments. Before a qualification claim, NOR-004 requires a reviewed, explicit matrix for every exposed capability, including conditional requirements.

| Profile | Mandatory scope and dependency rule |
| --- | --- |
| CORE | Language/plan meaning, values, effects, verifier and diagnostics for the subset actually offered |
| COORD | CORE plus policy, task state, scheduling, budgeting, persistence and audit contracts exercised |
| EXEC | Operation validation, authority enforcement, lifecycle, errors, resource handling and task evidence |
| DIST | COORD and applicable EXEC contracts plus network failure, fencing, reconciliation and transfer semantics |
| REMOTE | Applicable COORD/EXEC contracts plus provider identity, data export, cost, rate and cancellation limits |
| CLIENT | Common control semantics, access boundaries, availability display, accessibility and localisation |
| SDK | Public extension contracts, versioning, examples, dependency identity and conformance harness |
| AUDIT | Reference governance, independent identities, protected evidence and stated outage behaviour |

Build, authenticity, documentation, evidence and English-language obligations apply across claimed profiles. A client-only release does not claim local accelerator execution. A runtime without a source frontend claims plan conformance for its implemented subset, not a stable source language.

# 19 Implementation programme and decisions

The programme advances through evidence-based exit gates. Stages are not time or budget estimates. Each stage should deliver an end-to-end slice that is usable within its declared scope.

| Stage | Deliverable | Exit gate |
| --- | --- | --- |
| E0 Specification | Adopted scope, profile map, bounded contracts, fixtures, decisions and owners | Conflicts affecting the first slice resolved; requirements linked to planned verification |
| E1 Local execution | SDK/builder, verifier, one CPU executor, durable task record and diagnostics | Local success, policy refusal, failure, cancellation and restart paths demonstrated |
| E2 Distributed reference | Named Apple and NVIDIA configurations, coordination, client API and data paths | Authorised cross-destination workflow and partition/recovery evidence |
| E3 Extension proof | Independent third real backend using the published SDK | Applicable CA-19 and conformance gates pass without a vendor dialect |
| E4 Source language | Grammar, frontend, formatter/editor support and migration | Source-to-plan semantics, corpus and diagnostics qualify |
| E5 Expansion | More platforms, scale, mobile/browser execution and optimisations | Each additional claim has a qualified profile and maintained evidence |

**EVO-001 Vertical delivery.** From E1 onward, every implementation stage MUST deliver at least one usable end-to-end flow with observable errors and limitations. E0 MUST produce complete specified scenarios traceable to requirements. Later stages MUST NOT depend on capabilities announced as stable without evidence.

**EVO-002 Later grammar.** The source grammar and tools MUST preserve validated prototype contracts or document migration. Syntax creation MUST NOT conceal semantic changes.

**EVO-003 Pending decisions.** Each pending decision MUST have an accountable role, resolution gate and decision record. User- or extension-affecting choices MUST stabilise before public compatibility promises.

**DEL-001 Implementer handoff.** Each work item MUST name its applicable requirements, acceptance cases, dependencies, owner role, artifacts and completion evidence. Parallel work MUST use an agreed contract revision and an identified integration owner. A merge MUST NOT silently change another team's contract.

**DEL-002 Controlled iteration.** Implementers MUST preserve failed observations, diagnose the violated contract, add a discriminating regression where needed, implement a correction and rerun affected gates. They MUST NOT change expected outcomes, reduce scope invisibly or delete failures merely to produce a pass. Experiments MUST have a resource budget and stopping rule; exhausted or blocked work MUST report the concrete blocker and evidence.

**DEL-003 Release evidence.** Each release candidate MUST provide requirement coverage, complete applicable test results, unresolved defects, dependency inventory, qualified profiles, migration/recovery procedures and an accountable review. Missing evidence MUST remain distinguishable from a passing result.

**DEL-004 Operational ownership.** Before operational acceptance, each deployed component MUST have an owner role, monitoring and incident route, credential/revocation procedure, backup/recovery procedure and maintenance policy. The operating model MUST state who can stop, restore or re-enable affected capabilities under existing delegation.

**DEL-005 Extension and licence governance.** Before public distribution, the project MUST record licences for the specification, reference code, SDK, examples and contributed extensions; contribution and vulnerability-reporting procedures; release authority; and package-name/ownership rules. Third-party model and SDK conditions MUST be identified for the particular distributed artifact. This requirement does not select a licence or imply rights not yet granted.

**DEL-006 Documentation maintenance.** Specification, schemas, registries, examples and generated documents MUST identify the same release baseline or an explicit compatibility relationship. Published changes MUST update the change log and migration notes. All released documentation MUST follow IDN-005. Outdated documents and examples MUST identify their superseded status.

## Decision gates

| Decision group | Accountable role | Required by |
| --- | --- | --- |
| Specification adoption and CORE subset | Project authority and language lead | Before treating this baseline as binding |
| Complete IR, canonical encoding and semantic digest | Language/compiler lead | Before E1 plan identity and verifier conformance |
| Local state store and atomicity model | Runtime lead | Before E1 durable execution |
| Storage, tenancy, authentication and trust boundary | Runtime/security leads | Before protected or shared workloads |
| Reference hardware and full software snapshots | Platform lead | Before E2 qualification |
| Transport/API and MCP revision support | Integration lead | Before E2 external integration |
| Distributed coordination and fencing model | Runtime lead | Before replicated or failover authority claims |
| Workload, quality, SLO and recovery thresholds | Product and validation leads | Before the relevant acceptance campaign |
| Third vendor/backend | Platform lead | Before E3 implementation |
| Surface grammar, extension and resource ergonomics | Language lead | Before E4 stability |
| Licence, contributions and supported-version window | Project authority and release lead | Before public stable distribution |
| Retention, deletion, audit and recovery policies | Data/security and operations leads | Before real protected data is admitted |

The implementation pack provides templates for these decisions and logs. The project authority assigns people to the named roles. Placeholder or pending fields are not approvals, measurements or qualifications.
