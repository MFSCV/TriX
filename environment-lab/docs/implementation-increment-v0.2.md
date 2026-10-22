> Historical record: applies to its stated release. Use the [current documentation index](README.md) for application 0.5.0, capabilities and verification limits.

# TriX implementation increment 0.2.0

Document ID: TRIX-INC-002  
Date: 22 October 2026  
Status: Implemented planning application and experimental pure CPU subset; normative adoption and physical qualification remain pending.  
Readiness: Conditionally ready for those bounded scopes. Production distributed execution and complete language conformance are blocked by the gates below.

## Authority and sources

| Source | Location | Authority and access |
| --- | --- | --- |
| SRC-001 | User's private-configurator request and subsequent “what is missing?” / “proceed” instructions | Authorizes the implementation increment and continued owner-only availability; public publication prohibited without approval. |
| SRC-002 | TriX Design and Implementation Standard v0.2, 22 October 2026 | Proposed normative language baseline; relevant chapters read. Numbered requirements and applicable schemas retain their precedence. This increment does not adopt or amend the full standard. |
| SRC-003 | Prior Site source commit 4b7f907eeb5cb36b9aded0b46179f3ceedece3bc | Read source, original rules and 32 tests. Identified inherited-key acceptance, inconsistent name bounds, persistence loss and group-only comparison scope. |
| SRC-004 | Latest private Site source commit 69ffd502e75326e33e6b3d1c519565a7bff302c0 | Merged over this parent to preserve the English UX, About page, themes, local commands, proposed agent workspace and six agent tests. |
| SRC-005 | Executed regression checks and browser acceptance in verification.md | Evidence for the exact bounded application and reference subset only; not physical qualification. |

The upstream vendor links retained by the application are discovery pointers. Their evolving version matrices were not re-qualified in this increment. Never infer upstream or TriX support from a nonempty version field.

## Architecture and canonical contracts

The browser uses pure ES modules with no third-party runtime dependencies. `compatibility.mjs` owns conservative platform rules. `model.mjs` owns v2 planning data, task placement, migrations, estimates and scenario diagnostics. `storage.mjs` owns browser-local save/recovery. `reference-plan.mjs` owns the experimental executable subset. The existing `agents.mjs` module remains a deterministic command interpreter, not an LLM agent runtime.

Three formats remain distinct:

| Contract | Purpose | Authority limit |
| --- | --- | --- |
| `trix.environment-planning/v2` | Target inventory, constraints, workflow placement and implementation handoff | Planning envelope, not a normative executable TriX plan. |
| `trix.implementation-binding/v0.1` | Explicit proposed relationship between environment groups and future execution | Does not bind or dispatch real model operations. |
| `trix.reference-plan/v0.1` | Experimental executable pure CPU graph | Bounded reference subset; no claim of complete TriX IR or source-language conformance. |
| `trix.adapter-profile/v0.1` | Declarative extension identity, operations, effects, version constraints and capability claims | Validation never loads adapter code, grants authority or promotes qualification. |
| `trix.qualification-checklist/v1` | Snapshot and operation-specific evidence requirements | Every generated verdict starts as not-run. It is not a qualification certificate. |

Structural JSON Schema files are under `dist/contracts/`; the generation source is `scripts/generate-contracts.mjs`. Semantic verification remains mandatory: structural JSON validity does not establish compatible hardware, acyclic graphs, correct reference types, current authority or runtime admission.

## Implemented requirements and acceptance mapping

These increment IDs are local delivery controls; they do not replace the standard's IDs.

| ID | Implemented behavior | Standard anchors | Acceptance evidence |
| --- | --- | --- | --- |
| INC-001 | Reject inherited/nonexistent catalogue entries before import or generation | SIF-004, CON-006 | 16 inherited-key rejection cases, legacy checks and browser rejected import |
| INC-002 | One 120-character group-name bound across UI, export, import and persistence | IDN-004, SIF-009 | Boundaries 1/100/101/120, overlong rejection; 120-character browser reimport/reload |
| INC-003 | Preserve recoverable raw data, restore a valid prior environment and isolate damaged comparisons | IDN-004, SIF-009 | Corrupt-current, prior-state, independent-comparison, quota and later-save recovery tests |
| INC-004 | Display local and whole-scenario outcomes separately for backend candidates | ARQ-006, INT-009 | Mixed-vendor tensor scenario remains globally blocked even for a locally eligible CUDA candidate |
| INC-005 | Represent physical/process ISA, execution mode, per-device counts and memory reservations separately | PLT-001–005, LNG-012 | Native ISA conflict, emulation condition and capacity-after-reservation tests |
| INC-006 | Give each workflow task its own placement, operation, model, memory and input/output contracts | RUN-005, INT-006 | Mixed inference/training, placement, contract, cycle, missing-reference and per-task memory checks |
| INC-007 | Reject unknown schema/specification/rule-set revisions; migrate known v1 inputs | NOR-002, VER-005 | Legacy scenario/comparison migration and three future-revision rejection cases |
| INC-008 | Keep unmeasured versions, cost, energy and memory visibly declared/estimated/unknown | NOR-007, QUA-003–005 | Unknown estimates, independent analytical oracles and non-qualification assertions |
| INC-009 | Verify the reference graph before any operation, reject effects and unregistered operations | ESC-001, LSP-018/020 | Positive example, references/types, cycles, unknown fields, bounds, overflow and no-effect traces |
| INC-010 | Execute six pure CPU operations and expose ordered outcomes | ESC-001, QUA-006 | Browser result 50, numeric-array/text oracles, reordered-input graph, cancellation and overflow checks |
| INC-011 | Provide opt-in CLI checkpoints with completed-result revalidation and plan identity checks | Limited RUN-010/014 analogue | Temporary-directory CLI tests; different plan and tampered output refused. Not production runtime conformance. |
| INC-012 | Preserve English UX, themes, local command proposal review and existing agent boundaries | IDN-005, SRC-004 | Six retained agent tests plus merged browser acceptance |

## Planning semantics

A group denotes identical nodes with declared physical and process profiles. Host memory, per-device memory and devices-per-node are separate. Extra devices never imply pooled memory or collective support. Effective capacity subtracts the declared reservation in the relevant domain. Physical topology fields record data; they do not probe PCIe/NUMA or validate an actual fabric.

Task-specific mode supports independent workflow stages. Dependencies must exist, be acyclic and have matching declared output/input contract labels. Labels do not validate tensor shapes or actual artifacts. Type conversion, transport, artifact access and effect authority still require runtime contracts. Joint tensor/data-parallel model placement remains a separately qualified scope.

The analytical model-weight estimate converts parameter count and declared precision into GiB, then adds user-supplied cache and overhead. Metadata, activations and runtime variation are not inferred. The aggregate for independent replicas is a resource-demand estimate, not one coherent allocation. Cost is a declared whole-node hourly rate times nodes. Energy uses declared whole-node watts, 24 hours and the chosen utilization fraction, excluding unlisted cooling/network equipment. There are no market prices or performance projections.

## Reference CPU subset

The verifier accepts at most 64 tasks, 100 KB of serialized input, bounded numeric arrays and bounded text. Each task has an explicit whitelisted operation and exact argument contract. References must identify existing compatible outputs. The verifier rejects unknown fields, cycles, unsupported revisions, effects and executable-plugin requests before execution.

The experimental `ReferencePlanBuilder` SDK adds operations only after type/reference validation and returns detached plan data. SDK host code is not a sandbox; no authority is gained by authoring a valid plan.

Operations: `number.constant`, `number.add`, `number.multiply`, `numbers.sum`, `text.constant`, `text.uppercase`. Values are finite JavaScript binary64 numbers, bounded arrays of those numbers and text; overflow to a non-finite result fails. This experimental `number` type does not implement the standard's complete integer/decimal/quantity semantics. No source-language conformance is claimed. A future normative bridge must resolve that mapping through an explicit profile/ADR and corpus rather than silently treating these formats as equivalent.

Execution is sequential in dependency order. Cancellation is checked between bounded operations. Browser execution is synchronous and is not a preemptive task service. The plan cannot issue external effects. The CLI alone reads the explicitly named input file and, when requested, writes a state file plus sibling lock/temp files. Checkpoints use exclusive access and atomic replacement, but are not fsync-based power-loss durability, encrypted storage, multi-controller consensus, fenced distributed allocation or model checkpoints. A completed checkpoint is deterministically revalidated before reuse. Stale locks require reconciliation. Pure execution may be recomputed after interruption; this does not repeat an external effect.

## Migration and persistence

Known v1 envelopes migrate into v2 by adding explicitly defaulted topology, workflow and estimate fields. Unknown old fields are rejected. Imports retain user inputs and re-run current validation; imported claims of qualification do not establish authority or support. Exports replace derived diagnostics with the current rule set.

v2 browser keys are separate from v1. A valid current environment falls back to a valid previous snapshot when necessary. Damaged entries are retained in recovery data; comparison entries are recovered independently. Recovery bytes are archived before subsequent saves. Storage failures are visible and do not make the last saved environment a claim that new edits were saved. Local storage is not cloud synchronization, a multi-record database transaction or a backup guarantee. Use JSON exports for portable copies.

## Decisions and remaining gates

| ID | State | Decision / gap | Owner and blocked scope |
| --- | --- | --- | --- |
| DEC-INC-01 | Implemented bounded choice | Keep the existing static architecture and add a pure JS CPU reference subset, without changing normative language semantics | Project authority must adopt a future normative implementation profile |
| DEC-INC-02 | Implemented bounded choice | Merge the increment over SRC-004, retaining owner-only hosting and current UI features | Site owner; no public access authorized |
| GAP-INC-01 | Open, blocking qualification | Exact supported hardware/driver/runtime/model tuples and real accelerator adapters | Platform implementer; all GPU/NPU/distributed support claims blocked |
| GAP-INC-02 | Open, blocking complete E1 | Complete normative logical-plan encoding, SDK mapping, numeric/resource semantics and independent conformance corpus | Language implementer + project authority; full language conformance blocked |
| GAP-INC-03 | Open, blocking production execution | Identity, capability grants, secrets, sandbox enforcement, durable effect ledger, admission and fencing | Runtime/security implementer; effect-capable execution blocked |
| GAP-INC-04 | Open, blocking performance claims | Workload-specific numerical/quality/SLO/cost/recovery thresholds and hardware measurements | Evaluation owner assignment needed |
| GAP-INC-05 | Open, blocking extension qualification | Real loadable adapter SDK, isolated execution, independent third backend and ABI/protocol conformance | Extension implementer |
| GAP-INC-06 | Open | Source grammar/compiler, modules/packages, source-to-plan equivalence, stable diagnostics and maintenance/licensing decisions | Language/release owners assignment needed |
| GAP-INC-07 | Verification limit | Managed browser confirmed JSON download; subsequent YAML/Markdown download notifications were not confirmed | Client verification; rendered/copied content and independent YAML parse are the fallback evidence |

## Next implementer work

1. Read the standard, this increment, the JSON schemas and verification limits. Select an adopted profile; resolve semantic conflicts explicitly.
2. Define the complete logical-plan encoding and normative value/resource semantics for the first CPU profile. Preserve this experimental format as a separate migration boundary.
3. Build the typed SDK and a real local executor with durable task identity, scoped authority, resource admission and refusal paths. Resolve GAP-INC-02/03 before claiming complete E1.
4. Run positive, negative, malformed-input, authorization, cancellation, crash/restart and restore tests with independent oracles. Record commands, snapshots, failures and reviewers.
5. Add one real model adapter, then a third independent backend. Qualify exact tuples and invalidation triggers. Distributed collectives require their own topology and failure evidence.

Do not interpret the existing local command vocabulary, an agent role card, a schema pass or a generated checklist as an installed autonomous agent, granted capability or qualified runtime. Continue independent implementation tasks when a gate blocks another scope. Preserve owner-only hosting unless the user explicitly authorizes publication to a broader audience.
