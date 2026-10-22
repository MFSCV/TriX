# Current implementation baseline

Document TRIX-IMPL-001 · Application 0.5.0 · Experimental implementation, conditionally ready for local planning use.

## Architecture and evidence boundary

The browser hosts the conversational UI and local planning tools. A single ESM Worker serves assets and authenticated task APIs. The server owns task grants, specialist dispatch, model requests, MCP enrollment, release gates and conditional task persistence. The browser advances one checkpointed step at a time; closing it does not install an unattended scheduler. A separate external worker must enforce its own sandbox, project paths, idempotency, resource limits and receipts.

| Component | Responsibility |
| --- | --- |
| `public/product-info.mjs`, `public/local-intent.mjs` | Shared explanations and explicit deterministic request routing |
| `public/chat.mjs`, `public/conversation-store.mjs` | Conversation, contextual panels, local history validation and local response observations |
| `public/model.mjs`, `compatibility.mjs`, `reference-plan.mjs` | Existing planning domain, compatibility and bounded execution |
| `runtime/policy.mjs` | Specialist purpose, task grant, target/revision checks and receipt gates |
| `runtime/orchestrator.mjs`, `local-tools.mjs`, `mcp.mjs` | Bounded model loop, specialist contexts, built-ins and outbound MCP |
| `worker/index.js` | Identity/origin enforcement, input validation, per-user records, leases and CAS checkpoints |
| `public/release.mjs` | Canonical application release identity, separate from planning/schema versions |
| `scripts/build.mjs`, `validate-artifact.mjs` | Dependency-free Worker build and artifact validation |

## In-scope requirements and acceptance

MUST describes this release's accepted obligations; it does not adopt the complete proposed language standard.

| ID | Requirement | Implementation / acceptance |
| --- | --- | --- |
| REV-REQ-001 | The opening screen MUST explain purpose, available work and a concrete first request | Opening copy and browser acceptance |
| REV-REQ-002 | Every current contextual screen MUST explain input, output and next step | Shared guide catalogue; surface coverage test and browser checks |
| REV-REQ-003 | Configuration, observed execution and qualification MUST remain distinct | Status vocabulary; connection labels; exact receipt gates |
| REV-REQ-004 | Local routing MUST refuse unsupported goals instead of returning unrelated artifacts | Fixed 28-request corpus; negative generation/validation/CPU cases |
| REV-REQ-005 | Local and server CPU results MUST retain real output, execution location and digest | Independent numeric oracle, serialized trace and native SHA-256 comparison |
| REV-REQ-006 | Invalid API/context/history input MUST fail without corrupting accepted work | Null/array/malformed context and environment, duplicate names, UTF-8 quota and recovery tests |
| REV-REQ-007 | Existing planning schemas, imports, compatibility and CLI reference MUST remain usable | Preserved domain, workflow, migration and CLI regression suite |
| REV-REQ-008 | Measurements MUST state scope, sample size and unmeasured dependencies | Benchmark metadata, local/server events and release audit |
| REV-REQ-009 | Documentation MUST identify current, proposed and historical authority | Documentation index, source inventory and historical notices |
| REV-REQ-010 | GitHub MUST receive reviewed source, version evidence and a release tracker | Public export, source/evidence hashes, checked commit and tracker issue |
| REV-REQ-011 | Hosted access MUST remain owner-private | Sites deployment access boundary; publication does not change audience |
| REV-REQ-012 | Private hosting identity, credentials and user task data MUST be excluded from public export | Explicit export allowlist and content scan; generic hosting template only |

## Decisions and conflicts resolved

| ID | Decision / resolution | Basis |
| --- | --- | --- |
| REV-DEC-001 | Keep the conversational shell; add concise context and progressive help | Latest user instruction, including opening-screen clarification |
| REV-DEC-002 | Preserve the proposed standard and its versioned pack; clarify applicability in a current index | Stable IDs, retained hashes and earlier governance |
| REV-DEC-003 | Keep model-configured status separate from live verification | Source inspection found configuration booleans presented as “connected” |
| REV-DEC-004 | Keep the existing dependency-free domain and Worker architecture | This task is a product/documentation review, not a framework migration |
| REV-DEC-005 | Synchronize the current application under `environment-lab/` in the existing public repository | Existing repository structure and explicit user request for commit/push |
| REV-CON-001 | Earlier docs say “static site, no server”; current runtime contains a Worker and R2 | Earlier records now labelled historical; integration document revised |
| REV-CON-002 | Connection proposal targets MCP 2026-07-28; implementation supports 2025-11-25 | Record both scopes; do not claim universal or latest-protocol interoperability |
| REV-CON-003 | Earlier design uses a persistent dashboard/workbench | Later explicit chatbot-first instruction supersedes that layout |

## Remaining gaps and operational limits

| ID | State / blocked scope | Required evidence or decision |
| --- | --- | --- |
| REV-GAP-001 | Open: live AI and external execution acceptance | Configure an authorized model and MCP workers; run real tasks and verify output at its destination |
| REV-GAP-002 | Open: unattended execution and full shared CLI/IDE operation | Durable scheduler/executor, native clients and cross-surface acceptance |
| REV-GAP-003 | Open: production effect reconciliation and audit independence | Enforced destination fencing/idempotency, operation-specific recovery and separately controlled audit identity |
| REV-GAP-004 | Open: complete language and physical backend qualification | Adopted profile, compiler/IR conformance and exact hardware/version tests |
| REV-GAP-005 | Open: production SLOs, retention/deletion, capacity and billing caps | Representative load/recovery campaigns and owner-selected objectives; current token limit is an observed stop threshold |
| REV-GAP-006 | Open: complete independent security/accessibility audit | Separately scoped independent verification; this release review is product QA and regression testing |

Each task has up to 64 steps, 12 assignments, three implementation iterations and 15 minutes. The 24,000-token stop threshold can be crossed by an in-flight response and is not a billing reservation. R2 checkpoint pacing adds latency and is excluded from pure-function benchmarks. Local history detects sequential stale writes but is not an atomic cross-tab database. Server tasks remain limited to 40 with no delete API. An uncertain effect stays blocked until operator reconciliation; no automatic success assertion is provided.

## Implementer procedure

Read the documentation index, product guide, this baseline and runtime contract before changing interfaces. Preserve original standard IDs and historical packs. Use explicit version migrations, add an independent behavioural regression for a defect, run `npm run check`, then `npm run benchmark` when measurement inputs change. Record failed attempts and unmeasured paths. Build and publish the checked source state; synchronize only the public export allowlist. Do not convert local planning evidence or a model transcript into production approval.
