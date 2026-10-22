# TriX runtime and operations: consolidated additions

## Status and scope

This section proposes additional contracts for the next specification revision. It does not claim implementation, operational support, measured performance, or approval of a particular database, transport, cloud, or cluster manager. MUST, MUST NOT, SHOULD, and MAY acquire normative force only when this revision and its applicable profiles are adopted.

The existing human authority, hierarchical coordination, independent audit, heterogeneous infrastructure, and policy constraints remain applicable. These additions make their operational meaning testable. Implementers must identify the applicable profile for each requirement. Optional capabilities cannot be advertised without their corresponding contracts.

## Gap consolidation

| Existing coverage | Missing operational contract | Proposed closure |
| --- | --- | --- |
| TAR-003 and TAR-004 list states and completion rules | Legal transitions; execution versus knowledge; cancellation races | RUN-001–006 |
| GOV-005 and GOV-006 require revocation and consistent authority | Lease validity, controller epochs, enforcement boundaries | RUN-007–010 |
| TAR-005 and TAR-006 address retries | Durable intent, deduplication scope and expiry, unresolved effects | RUN-011–013 |
| DAD-001–010 cover classification and retention | Artifact publication, derivative inventories, deletion and restore | RUN-014–017 |
| GOV-002 and REC-001–007 cover projects and resources | Identity scopes, concurrent admission, uncertain financial exposure | RUN-018–021 |
| INT-002 and INT-007 cover integrations | Common asynchronous API; inbound versus outbound roles | RUN-022–024 |
| TAR-009 and PLT-007 cover disconnected/mobile operation | Bounded offline authority, stale observations, reconnect conflicts | RUN-025–026 |
| GOV-004 and GOV-009 require audit and trust assumptions | Threat boundaries, audit outage policy, recovery evidence | RUN-027–030 |

## Runtime records and state transitions

**RUN-001 Authoritative record.** Each task MUST have a durable record containing tenant, project, principal, workflow, task and attempt identities; plan and input revisions; authority and policy references; controller epoch; lifecycle state; cancellation intent; output references; and effect records. Updates MUST use an atomic version check or equivalent serialization. Duplicate and reordered messages MUST NOT overwrite newer accepted state.

**RUN-002 Separate status dimensions.** The runtime MUST expose the following dimensions independently. A connection failure MUST NOT become evidence that execution stopped or an effect did not occur.

| Dimension | Proposed baseline values | Meaning |
| --- | --- | --- |
| Task lifecycle | CREATED, VALIDATED, QUEUED, RUNNING, CANCELLING, RECONCILING, SUCCEEDED, FAILED, CANCELLED | The coordinator's durable workflow decision |
| Attempt execution | NOT_STARTED, STARTING, ACTIVE, STOP_REQUESTED, STOPPED | Last evidenced execution condition, with observation time and source |
| Observation knowledge | CONFIRMED, STALE, UNKNOWN, CONFLICTING | Confidence and freshness of the particular observation |
| Individual effect outcome | NOT_DISPATCHED, UNKNOWN, APPLIED, NOT_APPLIED | Evidence about an external action; compensation is a separate action |

CONFIRMED means supported by identified evidence within the relevant validity conditions. It does not imply continuous connectivity. A task can be RECONCILING while its last execution observation is ACTIVE and STALE. Effects already known to be APPLIED remain recorded after cancellation.

**RUN-003 Guarded transitions.** The baseline task lifecycle MUST follow the following transition contract. RUNNING includes an attempt durably authorized for dispatch; actual computation is represented separately. Reservations and suspension MAY extend the model only with documented transition guards and recovery behavior.

| From | To | Required guard |
| --- | --- | --- |
| CREATED | VALIDATED | Plan, types, identities and requested authority pass validation |
| VALIDATED | QUEUED | Queue admission accepted; this alone does not reserve hardware |
| CREATED, VALIDATED, QUEUED | FAILED | Validation, admission or deadline failure; no unresolved dispatch |
| CREATED, VALIDATED, QUEUED | CANCELLED | Cancellation accepted; no current or unresolved dispatch; prior effects accounted for |
| QUEUED | RUNNING | Current admission and authority checked; attempt, allocations and dispatch intent durably recorded |
| RUNNING | QUEUED | Previous attempt settled or adequately fenced; retry remains safe, authorized and within budget |
| RUNNING | CANCELLING | Durable cancellation intent recorded before requesting executor cancellation |
| RUNNING, CANCELLING | RECONCILING | Execution or effect outcome cannot be established sufficiently |
| RECONCILING | RUNNING, CANCELLING | Evidence identifies the same active attempt; durable cancellation intent determines the destination |
| RECONCILING | QUEUED | Safe retry established; no cancellation intent; authority and admission revalidated |
| RUNNING, RECONCILING | SUCCEEDED | Output and effect obligations verified; unresolved conflicting attempts excluded |
| RUNNING, CANCELLING, RECONCILING | FAILED | Failure established, retry policy exhausted, relevant effects reconciled and any terminal-decision race resolved |
| CANCELLING, RECONCILING | CANCELLED | Cancellation disposition established; outstanding effects resolved and retained in the record |
| CANCELLING | SUCCEEDED | Verified completion won the explicitly serialized completion/cancellation race |

**RUN-004 Terminal decisions.** Completion and cancellation MUST have a documented serialization point. An acknowledgement that cancellation was requested MUST NOT promise that cancellation won. A deadline expiry MUST NOT imply remote termination. CANCELLED MUST identify the confirmed disposition: execution stopped, or an explicitly permitted alternative that blocks further managed effects while separately tracking ongoing execution and cost. It MUST NOT hide unresolved effects or imply reversal. Terminal decisions MUST preserve evidence and history; contradictory late evidence MUST create a visible correction and incident, prevent unsupported reliance on affected results, and never silently rewrite the past. Explicit follow-up work receives a linked task identity.

**RUN-005 Workflow boundaries.** Plans MUST define dependency success conditions, failure propagation, child-task ownership and permitted continuation after parent cancellation. Downstream tasks MUST NOT consume uncommitted results as final outputs. Progressive processing MUST declare its partial-result semantics. Fan-out, recursion, model/tool loops and spawned work MUST remain within explicit policy bounds. Agent delegation continues through the authorized hierarchy.

**RUN-006 Event evidence.** Transitions MUST retain event identity, task version, actor, authority epoch, causal references and evidence location. Wall-clock timestamps alone MUST NOT determine distributed event order. Observation freshness, event retention and replay behavior MUST be documented. Replayed notifications MUST NOT repeat task effects.

## Leases, fencing and recovery

**RUN-007 Allocation authority.** Every exclusive allocation MUST identify its resource scope, owner, validity and monotonically ordered authority epoch. Replicated controllers MUST obtain conflicting ownership decisions through one serialization authority. A single-controller deployment MUST preserve equivalent exclusivity across restart. Controller election alone MUST NOT be treated as proof that previous work can no longer affect resources.

**RUN-008 Enforcement of stale authority.** Effect gateways, writable resource boundaries and artifact publication MUST reject stale fencing epochs where fencing is claimed. Checking only the controller's view is insufficient. If a backend cannot fence an accepted operation, the runtime MUST retain that operation as potentially active until reconciled; it MUST NOT claim that a new controller or expired lease revoked the already accepted effect.

**RUN-009 Lease validity.** Profiles MUST specify renewal, expiry, allowed clock uncertainty and the behavior of disconnected executors. Uncertain or expired authority MUST block new effects requiring that authority. Local monotonic timers MAY support lease enforcement under declared assumptions. Loss of connectivity MUST NOT extend a lease. Independently authorized offline work MUST use its own bounded allocation and delegation.

**RUN-010 Controller recovery.** Recovery MUST reconstruct tasks, attempts, allocations, budget reservations and effects from durable evidence before issuing replacement work. Heartbeat expiry MAY make a resource unavailable for new assignments; it MUST NOT prove that its process stopped. During a partition, exclusivity requirements take precedence over making conflicting assignments available. Unresolved operations remain visible.

## Effects, retries and transaction boundaries

**RUN-011 Effect ledger.** Before an external request can escape, the runtime MUST persist an effect identity, intent, destination, payload identity and authorization, and mark its outcome potentially UNKNOWN. Repeated submissions of the same logical effect MUST preserve its deduplication identity across attempts. Reuse of that identity with a different payload MUST be rejected. The destination's deduplication scope, retention window and result-query behavior MUST be recorded.

**RUN-012 Retry admissibility.** Retry policies MUST bound attempts, elapsed time and resource or financial exposure. Each retry MUST revalidate authority and compatibility. Automatic retry of an uncertain effect is permitted only when the destination's semantics or reconciliation evidence make repetition safe. Switching providers MUST NOT silently convert an uncertain old effect into a fresh independent effect. Exhaustion of a deduplication window requires renewed reconciliation.

**RUN-013 Qualified guarantees.** Any exactly-once claim MUST name the transaction domain, failure model and enforcement mechanism. A durable local transaction or outbox alone MUST NOT be presented as exactly-once execution at an arbitrary external destination. Compensation MUST be a separately authorized, identifiable action with its own possible failure and uncertain outcome; compensation does not erase the original effect or establish complete rollback.

## Data and artifact lifecycle

**RUN-014 Publication contract.** Artifacts MUST distinguish STAGED, VERIFIED, COMMITTED, TOMBSTONED, PURGE_PENDING and PURGED. Normal publication follows STAGED → VERIFIED → COMMITTED. COMMITTED requires validated content identity and atomic visibility of the output reference. Readers MUST reject incomplete or unauthorized artifacts. Abandoned staging data MUST have a cleanup policy. Content integrity alone MUST NOT confer access authority.

**RUN-015 Retention inventory.** Each artifact MUST carry ownership, classification, provenance, storage locations, authorized readers, retention policy and applicable holds. The inventory MUST cover replicas, checkpoints, caches, indexes, embeddings, transcripts, thumbnails and other derivatives. Shared storage MUST distinguish a project's reference from shared bytes still legitimately retained for another authorized owner. In-flight readers and references MUST be considered before reclamation.

**RUN-016 Deletion semantics.** Deletion MUST distinguish denial of future access, tombstoning, physical purge requests and verified completion within each storage domain. The runtime MUST report inaccessible or disconnected copies and external-provider limitations. It MUST NOT claim recall of bytes already disclosed to an authorized recipient. Retention expiry or deletion MUST prevent prohibited new reuse, including regeneration from retained derivatives, according to the effective policy and revocation window.

**RUN-017 Backups and restore.** Backups MUST declare coverage, encryption/key authority, retention, recovery compatibility and possible data loss. Restore MUST reconcile deletion, revocation and policy records before restored data becomes accessible. A recovery environment unable to establish current policy MUST remain restricted. Backup expiry, cryptographic erasure and physical deletion MUST be described separately, with their actual scope and evidence. Restore drills MUST include artifact content and metadata consistency.

## Identity, tenancy, admission and budgets

**RUN-018 Identity boundaries.** Tenant, project, human, service, agent, device and workload identities MUST remain distinguishable. A single-user installation MAY have one tenant but MUST still define its isolation boundary. Task identifiers, artifact digests and node names MUST NOT function as credentials. Authorization MUST bind subject, action, resource, project, delegation scope and validity at each relevant access boundary.

**RUN-019 Policy context.** An admitted task MUST retain the policy version used for its decision and obey the documented effect of later revocation or policy changes. Delegated credentials MUST grant only the applicable workload scope; model outputs and external services MUST NOT enlarge it. Audit identities and permissions MUST remain separate from supervised operational identities. Cross-project sharing requires an explicit policy decision.

**RUN-020 Scheduling contract.** Admission MUST account for current allocations, queue bounds and relevant CPU, accelerator, memory, storage, transfer and concurrency demands. Policies MUST distinguish eligibility, priority, fairness, preemption and deadlines. Preemption MUST declare whether it loses work, requires a checkpoint or can only terminate a process. Accounting reservations MUST NOT be advertised as physical isolation or guaranteed completion time.

**RUN-021 Budget ledger.** Before dispatch, concurrent requests MUST atomically reserve their permitted exposure against the relevant shared budget. The ledger MUST distinguish reserved, incurred, settled and uncertain charges; retries, transfers and external tools must be included where chargeable. Uncertain charges MUST NOT be refunded merely because a response timed out. Strict ceilings require enforceable bounds; otherwise the runtime MUST reject that strict policy or use an explicitly authorized estimated-budget policy.

## Clients, APIs and directional integration

**RUN-022 Common control contract.** Web applications, native clients and automation interfaces MUST share task identity, validation, submission, observation and cancellation semantics. Submission MUST distinguish durable acceptance from execution and completion. Client retries MUST support deduplication; event streams MUST define sequence, reconnect and replay behavior. A transport connection MUST NOT be the sole owner of durable task state.

| Integration direction | TriX responsibility | Authority boundary |
| --- | --- | --- |
| Web or native client → TriX | Receive authorized commands and expose permitted observations | Client identity and project policy |
| External API consumer → TriX API | Expose selected runtime operations | Explicit inbound service permissions |
| TriX → external API | Invoke a provider or application | Outbound credentials, data policy and budget |
| External MCP client → TriX MCP server | Expose a declared subset of TriX capabilities | Authorized inbound operations |
| TriX MCP client → external MCP server | Consume declared external capabilities | Authorized outbound operations |
| Provider callback → TriX | Reconcile an existing request or event | Authenticated event binding; no new authority |

**RUN-023 Directional capability contracts.** Each integration MUST declare inbound and outbound roles separately. An exposed service does not imply authority to invoke external services, and a callback does not grant a new command channel. MCP adapters MUST pin a protocol revision and negotiate or detect capabilities according to that revision; they MUST NOT assume one universal session or handshake model. Bidirectional communication MUST preserve governance and does not authorize autonomous peer-agent communication.

**RUN-024 Client and transport safety.** Browser and native clients MUST use an explicit credential and origin trust model. Provider secrets MUST NOT be exposed to a client merely to support remote execution. Inbound credentials MUST NOT be passed through to unrelated downstream services. Callbacks, reconnects and duplicate notifications MUST be authenticated, scoped and replay-safe. Endpoint selection and redirects MUST respect network and data policy.

## Offline operation and mobile terminals

**RUN-025 Availability contract.** Terminal capabilities MUST carry observation time, validity and relevant lifecycle constraints. Suspension, loss of energy or an unreachable device MUST invalidate unsupported availability assumptions. The runtime MUST distinguish best-effort notification, confirmed checkpoint and confirmed stop. Only previously committed state can be relied upon after abrupt loss; a client-only installation MUST NOT be scheduled as a persistent executor.

**RUN-026 Disconnected operation.** Each task profile MUST choose among pause, fail, finish already authorized local work, or queue intentions for later admission. Offline execution MUST use bounded local authority, resources and spending allowance established before disconnection. Reconnection MUST preserve identities, reconcile effects and budgets, apply current policy, and resolve conflicting edits without silently overwriting authoritative state. Queued offline intentions are not evidence that remote execution occurred.

## Threat boundaries and operational evidence

**RUN-027 Declared threat model.** Each operational profile MUST identify trusted control/state components, independently protected audit components, worker and adapter trust, host administrator powers, and external-provider boundaries. It MUST distinguish accidental failure from malicious behavior. Isolation claims MUST name their mechanism and limits, including shared hosts and accelerators. Untrusted code or data MUST NOT acquire execution authority through deserialization, model instructions or artifact loading.

**RUN-028 Least-privilege execution.** Workers and adapters MUST receive only the required artifact handles, secret references, network destinations and operations. A process boundary alone MUST NOT be advertised as an adequate sandbox for hostile code. Unsupported isolation requirements MUST make a destination ineligible. Diagnostics, traces and metrics MUST apply project access rules and avoid exposing credentials or private content through identifiers and error messages.

**RUN-029 Audit availability.** Profiles MUST define whether an operation requires durable independent audit acceptance before proceeding. When that condition applies, an audit outage MUST block the operation. Any permitted buffered mode MUST bound its backlog, protect records under the audit trust model and expose delayed or missing evidence. The runtime MUST NOT claim complete independent auditing while required evidence is unavailable.

**RUN-030 Operational objectives.** Each release profile MUST declare its recovery-time and recovery-point objectives, authority-staleness bounds, maximum supported queue and artifact sizes, reconciliation policy and capacity assumptions. Numerical values remain design decisions until measured on representative workloads and failure scenarios. No default latency, throughput, lease duration, checkpoint interval or retention period is established by this proposal.

## Concrete runtime acceptance tests

All tests MUST record versions, configuration, injected failure, ordered evidence, observed outcomes and cleanup. Applicable tests are determined by the advertised profile; exclusion cannot remove a contract for a capability the implementation offers.

**RT-01 Reordered observations.** Deliver an old ACTIVE event after a verified terminal result, followed by duplicate notifications. The terminal history remains intact, stale evidence is identified, and no downstream effect repeats. Verify the three status dimensions. Requirements: RUN-001–006.

**RT-02 Completion/cancellation race.** Execute both orders around the declared serialization point. One run completes; the other reaches the documented cancellation disposition. A cancellation-request acknowledgement never substitutes for confirmed cancellation. Requirements: RUN-003–004.

**RT-03 Partition and stale controller.** Isolate the previous controller, establish a newer epoch and submit conflicting writes from both. The enforced boundary rejects stale writes. Repeat with lost renewal and clock uncertainty beyond the declared bound: new protected effects stop. A non-fenceable external request already accepted remains unresolved until reconciled. Requirements: RUN-007–010.

**RT-04 Crash around external dispatch.** Crash before dispatch, after dispatch and after the destination applies the effect but before acknowledgement. Restore the ledger, retry under the same effect identity and verify the documented deduplication behavior. Repeat beyond the destination's deduplication window: no blind retry is permitted. Requirements: RUN-011–013.

**RT-05 Partial artifact publication.** Interrupt upload, corrupt content and race readers against commit. Unverified data never appears as a final result; authorized readers see either a committed artifact or a defined absence/error. Requirements: RUN-014–015.

**RT-06 Deletion followed by restore.** Delete an input with a replica, cache, embedding and backup; leave one storage domain disconnected. Verify scoped completion reporting. Restore the backup: policy reconciliation prevents renewed prohibited access before the environment serves requests. Requirements: RUN-015–017.

**RT-07 Cross-project isolation.** Use a valid principal from another project to retrieve an artifact, query a task, reuse a cache and inspect detailed logs. Unauthorized access fails without revealing protected content or granting authority through guessed identifiers. Requirements: RUN-018–019, RUN-027–028.

**RT-08 Last-budget race.** Submit concurrent requests whose combined exposure exceeds the remaining budget, then lose the accepted provider's response. Admission never reserves the same allowance twice; uncertain expenditure remains charged against available exposure until reconciled. Requirements: RUN-020–021.

**RT-09 Integration direction and replay.** Invoke an exposed TriX operation, then attempt an unauthorized outbound action and replay a provider callback. The inbound grant does not authorize outbound work; callback replay does not duplicate effects. Test MCP capabilities using the declared revision. Requirements: RUN-022–024.

**RT-10 Abrupt mobile suspension.** Suspend or power off a terminal without a final heartbeat. New assignment stops after the declared availability window; execution knowledge becomes stale or unknown without asserting process termination. Reconnect with an expired delegation and verify no new effect starts under it. Requirements: RUN-025–026.

**RT-11 Audit outage and hostile adapter.** Interrupt independent audit storage while an adapter attempts prohibited artifact access and credential disclosure. Required auditable operations block or follow the explicitly permitted bounded mode; access controls remain effective and missing evidence is visible. Requirements: RUN-027–029.

**RT-12 Recovery and resource pressure.** Restart coordination with queued work, active attempts, reservations and uncertain charges; impose resource pressure and an authorized preemption. Recovery preserves identity and accounting, reconciles uncertain effects, and reports measured recovery/progress loss against declared objectives. Requirements: RUN-005, RUN-010, RUN-020–021, RUN-030.

## Decisions required before operational acceptance

The proposed baseline favors durable task records, explicit effect ledgers, scoped authority, fenced publication, immutable committed artifacts and bounded offline work. It does not select a storage engine, consensus implementation, transport, authentication provider, currency, pricing source or universal sandbox.

Before accepting each operational profile, its owners must fix the authority and clock assumptions; allowed effect/retry classes; isolation strength; exact API schemas; artifact and backup policy; audit outage behavior; budget units and uncertainty treatment; and measurable workload-specific thresholds. Those choices require recorded decisions and test evidence. A successful demonstration cannot establish support for untested providers, hardware combinations or failure modes.
