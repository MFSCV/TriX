# TriX 0.6.0 — Supabase implementation and verification report

23 October 2026 · Experimental test release. This report supplements the historical [0.5 audit](release-audit-v0.5.0.md); it does not rewrite earlier evidence.

## Result

TriX now has real Supabase persistence and scheduled background infrastructure. The private application keeps ChatGPT sign-in; new connected tasks use transactional Postgres checkpoints, while legacy R2 conversations remain in their original store. Local planning remains available in the browser. Connections exposes a separate background CPU check that works without a model and returns 50 after a scheduled dispatch.

The resource set is eleven RLS-protected application tables, three private Storage buckets, four versioned migrations, Vault-held bridge/configuration secrets, pgmq, Cron, pg_net and one authenticated Edge function. Realtime and pgvector were not needed. Model inference, live specialist delegation, project implementation and independent external audit remain unconfigured or unqualified.

## Actual hosted observations

| Check | Observed result | Measurement scope |
| --- | --- | --- |
| Bridge authentication | Missing/invalid tokens refused; valid server token accepted | Actual Edge requests |
| Ownership | Another synthetic owner could neither read nor overwrite a run or read its artifact | Actual server-scoped Postgres/Storage requests |
| RLS | Two explicitly mapped authenticated claim identities saw one run each; an unmapped identity saw zero | Transactional SQL role/JWT-claim test, rolled back; not a complete Auth login journey |
| CAS concurrency | Exactly one of two writes using the same prior version succeeded | Real concurrent bridge requests |
| Immutable file | UTF-8 bytes and SHA-256 matched after private upload/readback; repeat upload retained the same object | Actual private Storage, metadata after verified readback |
| Scheduled execution | CPU output 50, one runtime step, no browser or manual dispatcher trigger | Actual Cron → pg_net → Edge → runtime CAS |
| Deduplication | Re-enqueue of a completed diagnostic caused no new runtime step or version change | Actual queue/run state |
| Recovery | Stop remained STOPPED; expired runtime lease became PAUSED; uncertain effect became RECONCILING with no CPU execution | Actual queue/Worker path; recovery dispatch also invoked explicitly |
| Stale worker | Old completion rejected; expired checkpoint claim fenced, state version unchanged | Transactional hosted SQL tests |

The final recorded scheduled check was detected after **35.702 seconds**, including queue wait, processing and observation polling. This is one test observation, not a service latency percentile. The earlier persistence probe recorded 5.514 seconds for initial health, 1.720 seconds for create-plus-read, 5.285 seconds for the CAS race/check sequence and 8.306 seconds for the multi-request immutable file sequence. Each combines the operations described in its evidence; none is a standalone database execution latency or production SLO.

Machine-readable evidence: [persistence](../reports/supabase-v0.6.0.json), [queue](../reports/queue-v0.6.0.json), [regression/build](../reports/test-results-v0.6.0.json), [deterministic benchmark](../reports/benchmark-v0.6.0.json), [advisor/review record](../reports/audit-v0.6.0.json), [browser check](../reports/browser-v0.6.0.json). The containing Git commit and [release manifest](../version.json) bind source and evidence hashes.

## Findings and corrections

- Preserved trusted hosting identity and isolated backend credentials from browser/model inputs. The Edge bridge authenticates its own bearer credential before parsing operations; service-only SQL functions have fixed search paths and explicit owner checks.
- Added per-owner transactional CAS, retained the existing shared runtime lease/stop controls and atomically enqueued running background checkpoints. Every queue-origin checkpoint and completion validates its claim token, closing the stale-worker write path.
- Added private, immutable content-addressed file storage with readback verification before metadata receipts. A failed copy is surfaced as a warning while retained checkpoint text remains available.
- Corrected ten missing foreign-key indexes reported by the Supabase performance advisor. Security advisors returned zero alerts. New unused indexes and the fixed ten-connection Auth allocation remain informational observations; scaling was not performed.
- Preserved R2 history without dual writes or silent migration. Added a regression proving legacy reads/stops retain their original store even when Supabase is configured.
- Clarified current docs/UI so scheduled infrastructure, model setup, external implementation and independent audit evidence are separate capabilities.
- Automatic approval review blocked CLI telemetry to an unrelated analytics endpoint. Migrations/function deployment continued through the native Supabase connector; no telemetry approval was requested or bypassed.

## Fresh source review and corrections

A separate read-only source reviewer examined the complete increment at commit `8f16431` and reran 181 regression tests. The reviewer found no Critical findings and three Important issues. Each was reproduced before its correction:

1. Revoked background tasks could execute an already queued step. Queue-origin lease acquisition and pre-dispatch checkpoints now enforce current opt-in. Tests cover opt-out before claim and after claim/before dispatch, with zero external requests.
2. An intermediate checkpoint could overwrite a concurrent background toggle. Every checkpoint now merges the latest preference; both toggle directions are covered across actual checkpoint/finalization paths.
3. Exhausted deliveries could remain presented as running, including failed artifact copies after a valid CPU result. Owned task reads now include sanitized queue status, the UI shows terminal failure/operator review, and polling follows delivery state. A hosted transactional regression failed before the queue-summary migration and passed afterward; adapter and UI-state regressions cover the same contract.

The review also identified a Minor evidence defect: the missing-model live test had reached a diagnostic-type restriction instead of the model guard. This was reclassified as Important evidence coverage because the report asserted the wrong observation. The corrected live check creates an ordinary runtime task, asserts the specific missing-model rejection and verifies unchanged opt-in. It is rerun against the final consumer rather than retained as an unverified claim.

No second source review was commissioned. Corrections are verified by failing-then-passing regressions and the full suite; this source review is not an independent security certification.

## Review decisions and remaining boundaries

| Decision | Why it stands | Cost if the assumption is wrong |
| --- | --- | --- |
| Execute inline in the existing clean Site checkout | The approved design and Site workflow already identify it | Less isolation than a separate worktree |
| Continue native migrations after blocked CLI telemetry | Required database work can proceed without unrelated analytics | CLI-only checks are not claimed |
| Trust the hosting identity boundary | Existing private hosting supplies the authenticated subject | An upstream identity-boundary defect could invalidate owner scoping; header stripping was not independently qualified |
| Limit RLS evidence to transactional role/JWT-claim fixtures | This increment preserves ChatGPT sign-in | A complete new Supabase Auth sign-in flow remains unqualified |
| Accept hosted evidence within its recorded scope | The reviewer inspected code/reports; the author ran actual hosted checks | Source review does not independently reproduce provider observations |
| Leave live model, external execution and independent auditor enrollment open | Credentials and qualified project-bound services are absent | Full project implementation acceptance remains blocked |
| Configure foreground/background services separately | Prevent silent credential or authority copying | Operator configuration can drift; matching grants need explicit verification |
| Keep connection/grant/audit tables as protected schema | Current runtime still consumes environment grants and checkpoint receipts | General enrollment/audit-ingestion automation remains future work |
| Keep one-minute dispatch and the 15-minute wall-clock budget | Conservative test limits are explicit | Queued multi-step AI work may exhaust wall time before step count |
| Retain generic file-copy text and warn on copy failure | The checkpoint preserves the artifact; automatic generic retry is not promised | Operators may need to retry a private copy; queue-specific failure is now visible |
| Leave restore/retention/scaling/rotation/CLI-IDE qualification open | Those production/native-client capabilities exceed this test increment | No production or cross-client reliability guarantee follows |
| Preserve historical MCP/Windows evidence with original dates | It remains useful but is not a fresh hosted acceptance test | No current broader integration qualification follows |
| Verify final exports/builds/deployments separately | The reviewer did not mutate artifacts or external repositories | The author's final tree/deployment checks carry that verification, not the source review |
| Align migration timestamps with native history | Prevent local/hosted migration identity drift | A later manual alteration would require explicit reconciliation |
| Correct the model-gating evidence defect in this increment | An asserted verification must exercise its stated guard | Additional live test effort; no extra production authority is granted |

## Verification limits

Source regression/build checks, hosted synthetic infrastructure tests and UI smoke checks cover their recorded cases. Provider model/MCP responses in the core orchestration regression remain simulated. Earlier real public documentation MCP checks retain their original date and scope. An empty Supabase security-advisor result is not an independent penetration test or certification.

One minute dispatch, one step per invocation and the existing 15-minute task wall-clock budget intentionally limit this test deployment. Queue waiting counts against that budget. Production concurrency/load, outages, backup restore, deletion/retention, credential rotation under load and complete accessibility conformance remain unqualified. General external code execution, separately controlled audit identity and native IDE/CLI integration require further adapters and real acceptance.

See the [Supabase runtime contract](supabase-runtime.md) and [activation status](activation-status.md) for exact setup and remaining prerequisites.
