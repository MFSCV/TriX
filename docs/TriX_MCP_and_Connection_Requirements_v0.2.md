# TriX MCP and Connection Requirements

Document: TRIX-CONNECT-001 | Version: 0.2 | Date: 2026-10-22
Status: Proposed architecture; conditionally ready for interface prototyping.
Implementation, deployment and interoperability have not been verified.

## 1. Scope, authority and evidence

This increment specifies the connection plane for TriX: her interactive configurator, dialogue-driven agents, future compiler/runtime, hardware targets and external tools. It does not define language semantics or replace the language baseline. MUST means a proposed acceptance obligation in this document; SHOULD is a recommendation; MAY is optional. These engineering proposals are not recorded as user-approved architecture.

Source inventory:

| ID | Source and authority | Access and relevance |
|---|---|---|
| SRC-01 | Current user request, 2026-10-22 | Direct: investigate MCP server requirements and project connections |
| SRC-02 | Supplied TriX project conversation excerpts | Context: hardware/OS/cluster/backend portability, prompt-driven agents, English documentation, private deployment pending public approval; original files unavailable |
| SRC-03 | MCP 2026-07-28 specification, https://modelcontextprotocol.io/specification/2026-07-28 | Primary upstream; researched 2026-10-22 |
| SRC-04 | MCP transport overview, https://modelcontextprotocol.io/specification/2026-07-28/basic/transports | Primary upstream; researched 2026-10-22 |
| SRC-05 | MCP authorization, https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization | Primary upstream; researched 2026-10-22 |
| SRC-06 | MCP security guidance, https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices | Primary upstream; researched 2026-10-22 |
| SRC-07 | Release announcement, https://blog.modelcontextprotocol.io/posts/2026-07-28/ | Primary upstream; researched 2026-10-22 |

No current TriX source files were available in the workspace. Two Library discovery attempts returned no matches; this does not establish absence. No endpoint, repository, credentials, installed connector, provider entitlement or deployed agent was verified. The inventory below is a requirements map, not an inventory of operational connections. Other projects' integrations are not automatically TriX dependencies.

## 2. Architectural proposal

TriX needs both an MCP server and an MCP host/client capability. The server exposes TriX operations to approved external assistants and IDEs. The client capability lets her orchestrator invoke approved external MCP servers. Separate their credential stores, policies and audit identities even if packaged together initially.

Proposed flow: user interface → application API → orchestrator → policy enforcement → typed adapters → tools/workers. External MCP clients enter through a protected TriX MCP endpoint and call the same application services. The compiler and compatibility engine remain usable without a model or MCP connection.

MCP is the tool/context interface. It does not replace model inference APIs, cluster schedulers, language-server protocol, GPU runtimes or high-bandwidth data transfer. Large artifacts travel through controlled artifact storage; tools return scoped references and checksums.

Portable core: configuration schemas, deterministic validation, capability registry, job state, policy decisions and provenance. Platform adapters: OS probing, toolchains, model providers, scheduler submission and device/backend inspection. Start with a modular service and isolated workers; split services only when measured isolation or scaling requires it.

## 3. Complete connection map by purpose

All named technologies below are candidates, not verified support claims. “Core” means required capability; it does not mandate a particular vendor.

| ID | Connection and direction | Interface / authentication | Priority and boundary |
|---|---|---|---|
| C01 | Browser → application API | HTTPS; user session; CSRF controls where applicable | Core; no provider secrets in browser |
| C02 | Application → orchestrator | Typed internal calls initially; authenticated service API if split | Core for agent mode; preserve user/project identity |
| C03 | Approved external assistant/IDE → TriX MCP | Streamable HTTP; OAuth; stdio for local integration | Core MCP exposure; independently scoped per client |
| C04 | Orchestrator → external MCP servers | Streamable HTTP or isolated stdio subprocess | Extensibility; registry allowlist; explicit connection grants |
| C05 | Services → identity provider | OIDC for login; OAuth for delegated resource access | Core for remote private use; separate human and workload identity |
| C06 | Services → secret store | OS keychain locally or vault API remotely | Core wherever credentials exist; secret references only |
| C07 | Orchestrator → inference providers | Provider-specific inference APIs; local protected endpoint | Agent mode; at least one model adapter; multiple frontier providers optional |
| C08 | Services → project/configuration store | Embedded DB locally or authenticated SQL service | Core persistence; schema versions and migrations |
| C09 | Services/workers → artifact store | Filesystem sandbox locally; authenticated object API remotely | Core for builds; immutable hashes; short-lived access |
| C10 | Orchestrator → job service → workers | Durable queue or DB-backed jobs; workload identity | Required for long-running execution; quotas and deduplication |
| C11 | Worker → compiler/toolchain | Typed subprocess invocation or narrow RPC | Implementation phase; workspace isolation; no unrestricted shell tool |
| C12 | Worker → hardware/OS capability probe | Local privileged-minimized helper | Execution phase; separate configured target from detected host |
| C13 | Runtime adapter → GPU/accelerator backend | Native driver/runtime APIs | Conditional: CUDA, ROCm, Metal, CPU/other backends evaluated separately |
| C14 | Worker → cluster scheduler | Scheduler API/CLI through adapter | Conditional: Slurm, Kubernetes Jobs or another chosen scheduler |
| C15 | Runtime → distributed communication layer | Runtime-specific collectives/message passing | Conditional: MPI/NCCL/RCCL/other; not MCP traffic |
| C16 | Services → Git/CI | Git protocol and provider API; scoped app token | Recommended for source/provenance; writes separately gated |
| C17 | Worker → package/compiler/image registries | HTTPS; read-only credentials where possible | Conditional on toolchain; lockfiles, checksums and offline mirrors |
| C18 | Services → telemetry backend | Structured logs, metrics and traces; collector authentication | Core local audit; remote exporter optional; redact prompts/secrets |
| C19 | Policy service → skill/catalog registry | Versioned manifests and verified content retrieval | Agent mode; review before activation; no automatic privilege expansion |
| C20 | IDE → language server/debug adapter | LSP/DAP over supported local transport | Future language tooling; separate from MCP |
| C21 | Services → knowledge/document retrieval | Local indexed documents or approved retrieval API | Optional; source provenance and injection-resistant handling |
| C22 | Services → notifications/webhooks | Signed HTTPS events; email only if configured | Optional; no business messaging dependency for core TriX |
| C23 | Local worker → remote control plane | Outbound authenticated channel; short-lived enrollment | Conditional hybrid mode; no automatic inbound workstation exposure |
| C24 | Infrastructure → DNS/TLS/time/backups | Deployment-specific infrastructure interfaces | Remote operations; certificate renewal, clock accuracy, restore tests |

Do not make Wix, CRM, payments, clinical services, Ghidra, NVIDIA toolkits or paid crawling prerequisites for TriX. They require a TriX-specific use case and reviewed adapter before inclusion.

## 4. MCP server requirements and version strategy

The researched revision is 2026-07-28. Its core is stateless and no longer uses the older initialize/initialized session model. Requests carry protocol metadata; HTTP mirrors selected fields into headers. Implementations must reject inconsistent mirrored metadata. Do not combine old lifecycle code and new assumptions in one undocumented implementation.

Target 2026-07-28 as a proposed primary profile. Add 2025-11-25 compatibility only for identified clients that require it, with separate contract tests. Pin SDK version and dependency lockfile after verifying its support for the selected protocol profile. TypeScript or Python are practical prototype candidates; final language remains open. Rust is not mandatory merely because TriX may use it internally.

Use stdio for a local client-launched process and Streamable HTTP for remote access. Keep stdout protocol-only in stdio; diagnostic output goes to stderr. Remote endpoints require TLS and authenticated access for this project. Loopback-only development is a distinct profile. Legacy HTTP+SSE must not be confused with request-scoped SSE in Streamable HTTP.

Long-running builds are application jobs with persistent job IDs. MCP Tasks is an optional extension, not an assumed core capability. Where unavailable, return a job handle and expose status/cancel tools. Define cancellation separately from transport disconnect: a disconnected caller must not accidentally create a second build.

Resources: versioned schemas, target catalogs, compatibility evidence, configuration snapshots and job reports. Prompts: optional reviewed workflow templates. Tools: bounded operations listed below. Deprecation of roots/sampling/logging in the researched revision means new functionality should not depend on them. Workspace authorization is enforced by TriX itself.

## 5. Proposed tool contracts

| Tool family | Operations | Side effects / scope |
|---|---|---|
| Catalog | target_list, backend_list, capability_describe | Read catalog; compatibility evidence included |
| Configuration | config_validate, config_compare, config_generate | Pure computation unless explicitly saved |
| Workspace | config_save, artifact_export | Write only within authorized project |
| Planning | plan_create, plan_inspect | Produces proposed actions; never authorizes execution |
| Execution | build_submit, test_submit, benchmark_submit | Starts isolated jobs; capability-specific grants |
| Jobs | job_status, job_cancel, job_result | Caller/project authorization on every handle |
| Governance | connection_status, audit_read | Filtered visibility; never return raw secrets |

These are TriX application tool names, not MCP protocol methods. Prefix/version them consistently in the implementation. Avoid generic execute_shell, arbitrary SQL and arbitrary URL fetch tools in the first release.

Every tool defines JSON input and output schemas, description, effect class, required permission, data classification, timeout, output limit, supported profile and version. The server derives principal and project authorization from trusted context, not caller-supplied identity fields.

Application contract fields: schema_version, request_id, project_id, config_revision, target_profile, dry_run; idempotency_key for mutations; expected_revision for updates. Responses contain status, structured diagnostics, evidence references, warnings and optional job/artifact handles. Fields belong in tool argument/result schemas, not invented MCP envelope fields.

Configuration validation separates syntax, semantic compatibility, missing evidence and unavailable execution capabilities. Support statuses: requested, documented upstream, adapter planned, implemented, tested. Unknown must never be reported as supported. A target profile includes ISA/CPU features, OS/ABI, accelerator model/count/memory, drivers, backend/toolchain versions, container/native mode, scheduler, interconnect and topology where relevant.

Error taxonomy: INVALID_ARGUMENT, INCOMPATIBLE_TARGET, EVIDENCE_MISSING, PERMISSION_DENIED, APPROVAL_REQUIRED, REVISION_CONFLICT, QUOTA_EXCEEDED, DEPENDENCY_UNAVAILABLE, JOB_FAILED and CANCELLED. Map these application errors into the selected MCP revision's actual error/result model. Retry only classified transient failures; use bounded exponential backoff. Never blindly replay an execution submission after timeout.

## 6. Identity, permissions and connection security

For protected remote MCP, implement the selected revision's OAuth discovery and authorization requirements, including Protected Resource Metadata and supported authorization-server discovery. Validate token issuer, audience, expiry and scopes using maintained libraries. Use PKCE for relevant interactive flows, exact redirect checks and issuer binding. Prefer current client metadata mechanisms; retain deprecated registration only when a verified client requires it.

TriX credentials and downstream provider credentials are separate. Never forward an incoming TriX access token as authorization to an unrelated service. Store downstream grants per principal/project/provider. For local stdio, minimize inherited environment and subprocess privileges; a local process is not inherently trusted.

Proposed scopes: catalog:read, config:read, config:write, plan:create, build:submit, test:submit, benchmark:submit, job:cancel, artifact:read, connection:manage and audit:read. Scope is necessary but insufficient: enforce project membership, target allowlist, resource quota and action-specific policy on each request.

Approval receipts bind principal, project, exact action/parameters, artifact/config hash, cost ceiling and expiry. Changed parameters invalidate the receipt. Existing user authorization may cover routine actions; do not demand a fresh approval for every read or validation. External spending, publication, privilege changes and destructive actions must match an explicit applicable grant.

Treat tool outputs, retrieved documents and skill instructions as untrusted data. They cannot elevate permissions. Restrict filesystem access against traversal and symlink escapes; isolate build containers; limit CPU/RAM/GPU/disk/network. Check external destinations after DNS resolution and redirects. Private cluster/local-model access uses explicit named private destinations, not a blanket private-address exception. Protect against DNS rebinding and cloud metadata access.

Validate browser origins and exposed local HTTP hosts; restrict CORS and bind development endpoints to loopback. Apply request/output limits, rate/concurrency quotas and cost budgets. Authorize every job/artifact handle; opacity alone is insufficient. Validate webhook signatures, freshness and replay identifiers. Namespace caches by authorization context. Audit connection creation, grant changes, invocation, policy decisions and effects without storing secrets.

## 7. Skills and model connections

A skill is a reviewed instruction package, not automatically an executable MCP capability. Its manifest should record package identity/version/hash, provenance/license, compatible TriX version, required tools/scopes, network/data permissions, resource limits, approval policy and evaluation evidence. Installation, review and activation are distinct states; updates require diff review and regression evaluation.

Model adapters declare model identity, tool/structured-output support, context limits, streaming, data handling policy, availability and accounting. Route by task, privacy, capability and configured budget. Provider failure may trigger a permitted fallback but must not silently send restricted data to a cloud model. API access and billing eligibility require verification; consumer subscriptions do not establish API access. No provider keys enter generated configurations or traces.

## 8. Deployment and capacity

Profiles: local-only (stdio, local store and workers); private remote (TLS endpoint, identity service and persistent stores); hybrid (remote control plane with enrolled local workers); cluster (chosen scheduler and runtime adapters). Maintain the existing private-publication constraint.

MCP control-plane serving does not itself require a GPU. Inference, compilation and benchmarking have separate capacity profiles. CPU/RAM/storage sizing, latency objectives, concurrency, cost limits, RPO and RTO remain unmeasured and must be set against a representative workload. Do not select hardware or promise throughput from protocol requirements alone.

Operational controls: health/readiness checks, graceful draining, worker leases and heartbeats, orphan-job reconciliation, bounded retention, encrypted backups where appropriate, tested restore, dependency updates and rollback. A stateless protocol does not eliminate persistent application state or job recovery requirements.

## 9. Traceable proposed requirements and acceptance

All rows are proposed. Source SRC-01 establishes investigation scope; SRC-02 informs project scope; upstream sources constrain protocol behavior. No tests below have been executed.

| REQ | Requirement / canonical section | Source | Acceptance ID and pass condition | Phase |
|---|---|---|---|---|
| R01 | Separate MCP server/client responsibilities (§2) | 01,02 | A01: ingress and egress credentials/policy independently configured | P1 |
| R02 | Explicit version profiles and transport conformance (§4) | 03,04,07 | A02: chosen SDK/client matrix passes supported versions; mismatches rejected | P1 |
| R03 | Protected remote access (§6) | 02,05 | A03: expired, wrong issuer/audience/scope and invalid redirect tests all denied | P1 |
| R04 | Typed and bounded tools (§5) | 01,03 | A04: malformed/oversized inputs rejected without effects | P1 |
| R05 | Deterministic compatibility and evidence states (§5) | 02 | A05: incompatible fixtures fail; unknown fixtures remain unknown; repeat results match | P1 |
| R06 | Project/handle isolation (§6) | 06 | A06: cross-project job/artifact/config access denied for every operation | P1 |
| R07 | Durable idempotent jobs (§4,5,8) | 01,02 | A07: timeout/retry submits one job; restart preserves status; cancellation reconciled | P2 |
| R08 | Isolated toolchain/backend adapters (§2,3,6) | 02,06 | A08: traversal, symlink and resource-exhaustion fixtures contained | P2 |
| R09 | Separate downstream credentials (§6) | 05,06 | A09: token passthrough refused; logs contain no seeded secrets | P1 |
| R10 | Controlled outbound connections (§6) | 06 | A10: redirect/rebinding/metadata attacks blocked; approved private target works | P1 |
| R11 | Action-bound grants and audit (§6) | 02,06 | A11: stale/modified approval rejected; permitted routine action proceeds; audit correlated | P2 |
| R12 | Governed skills and model routing (§7) | 02 | A12: malicious skill cannot expand grants; prohibited cloud fallback blocked | P2 |
| R13 | Recovery and observability (§8) | 01 | A13: restore drill and orphan-job reconciliation meet subsequently approved objectives | P2 |
| R14 | Capability-specific cluster and runtime adapters (§3,5) | 02 | A14: selected scheduler/device/version fixtures pass; unavailable target fails clearly | P3 |
| R15 | Private deployment and English artifacts (§1,8) | 02 | A15: unauthenticated access denied; public publishing disabled; exported prose English | P1 |

AI evaluations complement deterministic checks: use versioned synthetic prompts for tool-output injection, inappropriate permission requests, incompatible target recommendations, privacy-sensitive fallback and ambiguous hardware descriptions. Record model/prompt versions, expected policy action and reviewer rubric. Proposed gate: zero unauthorized actions or restricted data transfers in the fixed critical suite; report sample size and limitations. Passing this suite is not proof of universal safety.

## 10. Decisions, gaps and implementation handoff

| ID | Open item | Severity / blocked scope | Proposed closure / owner |
|---|---|---|---|
| G01 | Current TriX repository and authoritative language/configurator baseline unavailable | Blocking existing-system integration | Project owner identifies source; implementer reads it before patches |
| G02 | Required external MCP clients and supported revisions unknown | Blocking interoperability promise | Owner selects clients; implementer records exact tested builds |
| G03 | Private hosting, identity provider and domain undecided | Blocking remote rollout | Owner chooses deployment profile; retain local prototype option |
| G04 | Toolchains, runtime backends and first real hardware targets unselected | Blocking execution adapters | Owner ranks one local target and one expansion target |
| G05 | Provider credentials, data rules and spend limits unset | Blocking paid/cloud execution | Owner configures grants and budgets; mocks remain available |
| G06 | Workload/SLO/RPO/RTO and retention unset | Blocking production readiness | Owner and operator agree measurable workload and recovery gates |
| G07 | Concrete skill packages for TriX not inventoried | Important; blocks activation | Review package manifests and applicability before enablement |

ADR-01 (proposed): expose one narrow TriX MCP facade backed by shared application services; keep outbound MCP adapters separate. Alternative: independent per-domain servers. Tradeoff: simpler initial governance versus later isolation/scaling needs.

ADR-02 (proposed): target 2026-07-28; add a legacy profile only where client evidence demands it. Tradeoff: current design versus migration/testing effort. Do not assume universal interoperability.

ASM-01: the configurator can operate deterministically without a model. Validate against the source baseline before integration; false assumption changes R05 and P1. Owner: implementer, assignment needed.

No established source conflict was resolved: the original implementation was not accessible. Version 0.2 supersedes the undelivered 0.1 draft and adds the user-required outbound implementation plane (§11). This is a connection-specific increment, not a replacement master specification.

P0: locate baseline, verify current architecture and record source versions. Exit: G01 resolved, existing requirement IDs reconciled.

P1: implement schemas/compatibility fixtures, mock-backed read/validate tools, selected protocol profiles, identity/policy and private access. Exit: A01–A06, A09–A10 and A15 pass for implemented scope.

P2: add one real isolated worker, durable jobs, authorized model adapter, reviewed skill and recovery/audit. Exit: A07–A08, A11–A13 pass with agreed operating objectives.

P3: add second hardware/backend combination and selected scheduler; verify A14, then consider IDE and further external integrations. Do not treat breadth of catalog entries as tested portability.

Implementer reading order: scope/evidence → architecture/map → protocol/contracts → security → acceptance → gaps/phases. Implement accepted work only after reconciling proposals with owner decisions and the current baseline. Report changed files, covered REQs, executed and unexecuted tests, protocol/client versions, evidence and remaining gaps. Do not deploy publicly, connect accounts, purchase services or enable arbitrary external skills under this investigation request.

Readiness: conditionally ready for review and mock interface prototyping; blocked for production execution and remote interoperability claims by G01–G06 and the outbound-specific gaps in §11. Verification performed: primary-source research and document traceability review. No live connection tests, code audit, benchmark, deployment or security certification was performed.

## 11. Outbound implementation plane — applying TriX results to user projects

### 11.1 Authority and scope

SRC-08: direct user clarification, 2026-10-22: connections must include outbound delivery that enables implementation of TriX results in user projects. This product capability is accepted in scope. The detailed design below remains proposed. The clarification does not authorize modifications to an unspecified external project during this research task.

SRC-09: GitHub REST pull request documentation, https://docs.github.com/en/rest/pulls/pulls, researched 2026-10-22. This establishes an available integration route, not configured TriX access.

SRC-10: SLSA provenance, https://slsa.dev/spec/v1.2/provenance, researched 2026-10-22, and official artifact verification source https://github.com/slsa-framework/slsa/blob/main/spec/verifying-artifacts.md. Used to inform artifact identity and verification; no SLSA level is claimed.

The implementation plane connects generated source, configuration, packages and executables to the user's existing project. A successful export is not a successful installation, and a successful deployment API response is not proof of application health. Each stage records independent evidence.

### 11.2 Destination adapters

| ID | Destination / output | Required capability | Validation boundary |
|---|---|---|---|
| C25 | Authorized local project folder | Sandboxed change sets, workspace snapshot, atomic file replacement where supported | Detect uncommitted work and file revision conflicts; preserve user edits |
| C26 | Git repository: GitHub, GitLab, Bitbucket or self-hosted | Clone/read baseline, create branch, commit patch, open review request | Provider-specific adapter and permissions; never assume PR rights imply merge rights |
| C27 | Existing project build system | Generate/integrate build definitions and dependency changes | Respect existing scripts and lockfiles; validate selected compiler/ABI/runtime |
| C28 | Package and binary consumers | Versioned library/package, native binary, generated bindings or supported portable output | Only outputs implemented by the chosen TriX backend; no universal language/ABI promise |
| C29 | Package/artifact/container registry | Publish immutable version and provenance; scoped registry credentials | Separate staging/private publishing from public publishing; handle version conflicts |
| C30 | CI/CD runner | Submit authorized workflow and retrieve checks/artifacts | Pin source revision; pipeline creation/edit has a separate grant from execution |
| C31 | Remote host, VM or edge device | Enrolled deployment agent, or restricted SSH/SFTP adapter | Pinned host identity; destination paths; least privilege; no arbitrary shell exposure |
| C32 | Containers and clusters | Deploy selected image/manifest through chosen scheduler API | Namespace/environment restrictions; digest pinning; rollout status |
| C33 | Hosting/cloud control plane | Provider-specific deployment adapter | Account/project/environment binding; costs and public exposure checked |
| C34 | Website/CMS or application extension | Platform SDK/API, plugin package or backend endpoint | Native executable support differs from hosted extension support; verify each platform |
| C35 | Database/configuration infrastructure | Versioned migrations and infrastructure plans where needed by delivered software | Separate data/schema/infrastructure grants; backup and recovery plan |
| C36 | Deployed application → TriX verification | Health/version checks, smoke-test evidence, rollout events | Authenticated, minimal telemetry; no unbounded access to production data |

Platform names describe adapter families. Their current APIs, limits, supported packaging formats and credentials must be researched before implementing a concrete adapter. No provider-specific endpoint schema is specified or guessed here. Optional CMS and cloud adapters are destinations for user projects, not dependencies of the TriX language core.

### 11.3 Project binding and delivery contract

Each project binding records binding_id, owner/project identity, destination kind, repository or local root, permitted path prefixes, base revision, branch policy, build/test entrypoints, target profile, toolchain constraints, output format, dependency/runtime requirements, environment, allowed operations, credential references, resource budget, verification criteria and recovery policy. Development, staging and production are distinct bindings with distinct grants.

Adapters implement a capability contract: discover, inspect, plan, validate, apply, status, verify and recover. Capability discovery explicitly reports unsupported operations, including inability to roll back. These are application adapter operations; exposing them through MCP is optional. Approved MCP tools, native APIs and local agents can implement the same contract.

An ImplementationBundle contains a manifest with bundle_id/schema_version; source/config hashes; base revision; target hardware/OS/ABI; toolchain/backend/runtime versions; generated files and patch; dependency lockfile; build/install instructions; artifact hashes and provenance; licenses/SBOM where applicable; test results; required permissions; migration plan; recovery instructions and known limitations. Do not claim reproducible builds unless demonstrated under declared conditions. Bind artifact verification to a trusted producer and expected source/config, not just a checksum supplied beside an untrusted artifact.

Direct project integration must distinguish: source generation, source-to-source transformation, native library/FFI integration, standalone service integration, CLI integration and deployment of compiled applications. Which of these TriX actually implements remains a language/backend decision. Do not promise every form in the first release.

### 11.4 Delivery state machine and failure handling

States: draft → planned → validated → authorized → applying → applied → verifying → verified. Additional states: blocked, failed, cancelled, recovery_required and recovered. “Verified” requires destination-specific evidence, not merely the agent's assertion.

Before applying: inspect destination and revision; calculate exact diff and dependency changes; validate output compatibility; run isolated build/tests; obtain the grant required by the configured policy; recheck that source, target and grant are unchanged. A drifted base revision invalidates the previous plan. Apply only to the bound destination.

Local/Git initial workflow: inspect project → generate bundle → stage changes in an isolated worktree/branch → build and test → produce reviewable diff → open authorized review request → merge only under a distinct applicable grant and branch policy → invoke permitted pipeline → verify installed revision/health. A completed PR is a valid delivery outcome when deployment is outside scope.

For hybrid deployment, prefer an enrolled worker that pulls a signed/scoped job over an outbound connection. Do not require an inbound public port on the user's device. Enforce revocation and job expiry at the worker.

Recovery must be destination-specific: restore saved file revisions, revert a commit, redeploy a prior immutable artifact or perform a planned database recovery. Cross-service deployment is not assumed transactional. Record completed steps, stop dependent steps on failure and reconcile actual state before retrying. Database data loss and externally visible irreversible actions cannot be solved by promising generic rollback.

Repeated apply requests with the same idempotency key and plan hash must not duplicate commits, releases, deployments or migrations. Cancellation after a committed effect requires reconciliation or recovery, not a false claim that nothing happened. Retain receipts for source revision, patch hash, destination, effect IDs, artifact digest, pipeline run, observed version, tests and recovery result.

### 11.5 Permissions and user experience

Extend scopes with project:inspect, project:patch, repository:branch, repository:commit, repository:review-request, repository:merge, pipeline:run, pipeline:edit, package:publish, deploy:staging, deploy:production, migration:apply and recovery:execute. These are conceptual TriX permissions; map them to actual provider scopes without inventing equivalence. Prefer scoped installations/workload identities over unrestricted personal tokens where supported.

The UI must expose destination, environment, exact changes, tests, predicted effects/cost limits, grant status, implementation progress and evidence. Let users select export-only, local apply, review-request delivery or deployment according to enabled capabilities. Autonomous execution may use a prior explicit policy grant within its bounds. Show one concrete review point where approval is necessary, rather than repeatedly requesting permission for already authorized work.

The orchestrator owns the end-to-end plan and delegates only bounded operations to adapters/workers. Model output never grants write permission. Connection removal revokes or disables future jobs and reports any running operations requiring reconciliation.

### 11.6 Added requirements and acceptance

| REQ | State / source | Canonical specification | Acceptance / phase |
|---|---|---|---|
| R16 | Accepted capability scope, SRC-08 | Outbound implementation in user projects (§11.1) | A16: one chosen project receives a TriX-generated result and passes declared integration checks; P2 |
| R17 | Proposed, SRC-08 | Project binding and permissions (§11.3,11.5) | A17: wrong repo/path/environment rejected; revoked grants stop new effects; P2 |
| R18 | Proposed, SRC-08,09 | Conflict-safe review delivery (§11.4) | A18: dirty-worktree and base-drift fixtures preserve edits; review request points to tested revision; P2 |
| R19 | Proposed, SRC-08,10 | Versioned bundle and verification (§11.3) | A19: changed digest/untrusted provenance rejected; target ABI mismatch fails before install; P2 |
| R20 | Proposed, SRC-08 | Idempotent apply and recovery (§11.4) | A20: duplicate/restart/disconnect fixtures do not duplicate effects; partial failure reconciles; recovery restores declared state or reports manual recovery; P2 |
| R21 | Proposed, SRC-08 | Deployment outcome verification (§11.4) | A21: unhealthy/wrong-version rollout cannot become verified; test staging before production; P3 |
| R22 | Proposed, SRC-08 | Destination extensibility (§11.2,11.3) | A22: second adapter passes the same capability contract; unsupported operation returns explicit capability error; P3 |

G08: first user project/destination and required output form unselected. Owner: project owner; blocks real A16 execution. Proposed first vertical slice: isolated project binding + Git branch/review request + existing CI tests. This delivers implementation without requiring a production deployment adapter.

G09: TriX source/output/FFI/runtime contracts unverified. Owner: language implementer, assignment needed; blocks claims of binary/package compatibility. G10: production environment, grant policy and recovery requirements undefined. Owner: project owner/operator; blocks production delivery, not export or mock-backed development.

Change CHG-02: version 0.2 adds C25–C36, R16–R22, A16–A22 and G08–G10 from SRC-08. P2 now includes the first real outbound implementation slice; P3 includes deployment adapters and post-deployment verification. Definition of done extends through the selected delivery mode: do not mark a task complete merely because TriX generated an answer.
