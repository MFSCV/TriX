# Supabase persistence and background execution

Application 0.6.0 · Test infrastructure · 23 October 2026.

Supabase stores connected task state, private files and durable work. TriX still uses the existing private hosting policy and trusted ChatGPT identity. Supabase does not replace the model provider, a code execution sandbox or an independently controlled auditor.

## Resources and authority

| Resource | Implemented responsibility |
| --- | --- |
| `trix_projects`, `trix_project_members` | Server identity scope; optional operator-linked Supabase Auth readers |
| `trix_runs` | Complete versioned runtime checkpoint, messages, frames, stop flag, 100-second step lease, revision and receipts |
| `trix_run_events`, `trix_delegations`, `trix_effects` | Transactional projections of runtime evidence |
| `trix_artifacts` | Confirmed immutable private object metadata and SHA-256 |
| `trix_connections`, `trix_tool_grants`, `trix_audit_findings` | Protected schema for project enrollment and external audit ingestion; current runtime still consumes operator environment grants and checkpoint receipts |
| `trix_jobs`, `pgmq.trix_steps` | Durable per-run jobs, visibility timeout, retry count, fenced claims and retained results |
| Private Storage `context-files`, `artifacts`, `audit-reports` | Context copies and generated artifacts; audit-report ingestion is available through the trusted backend, not automatic independent audit enrollment |
| Vault | Bridge credential, backend URL and background processor model/MCP settings |
| Cron + pg_net + `trix-backend` Edge Function | One scheduled dispatch per minute while jobs are pending; each invocation executes one bounded runtime step |

All eleven application tables have RLS. Anonymous roles cannot read them. Authenticated database clients can read only explicitly linked project summaries/evidence; they cannot read complete checkpoints, owner subjects, connection configuration or tool grants, and cannot write runtime tables. Project membership is linked by an operator using the real Auth user ID. No self-service mapping or new Supabase login UI is enabled.

The Worker accepts the identity supplied by trusted hosting, scopes each request to that owner and calls an authenticated server bridge. The bridge uses its platform-injected service credential for narrowly defined RPC operations. The browser and model receive neither credential. The bridge deliberately implements its own bearer authentication; disabling gateway JWT validation does not make its operations anonymous. SQL definer functions use an empty search path, explicit ownership checks and service-only execution grants.

## Storage transition and files

With both `TRIX_SUPABASE_URL` and `TRIX_SUPABASE_BRIDGE_TOKEN` configured, Supabase is authoritative for new connected tasks. A partial or invalid configuration fails closed. Existing R2 tasks remain visible and continue to use R2; they are never silently copied or written to both stores. Existing browser-local planning history remains local.

Context text also stays in the versioned checkpoint. New connected context files and newly generated artifacts are copied to private Storage. Objects use `<run UUID>/<SHA-256>` paths, reject overwrite and undergo content readback verification before metadata is confirmed. Upload failure returns an explicit warning; it does not discard an already saved checkpoint. The background CPU diagnostic retries its artifact receipt through the queue. Generic artifact copy failures require operator retry using the retained task text. Names describe files; digests identify immutable content. Identical bytes within a run/bucket share an object.

The UI continues to download retained task artifacts through its existing controls. There is no public bucket, unrestricted upload endpoint, arbitrary object URL or broad database tool exposed to the model.

## Background operation

Open **Connections → Test background processing**. TriX queues a separate infrastructure check, then the page can be closed. A scheduled consumer executes `(6 × 7) + 8`, persists output **50**, uploads its artifact and records completion. Reopen the conversation or use **Refresh** to inspect evidence. This check uses no model and changes no external target. Start a new check to repeat it; completed diagnostics cannot be resumed as AI conversations.

AI tasks run in the foreground by default. When the background model is configured, an existing connected AI task can enable **Settings → Continue in background**. The model/tool authority remains the original task grant. Polling observes state; it does not execute background work.

Disabling background processing revokes queued work before lease acquisition and again before external dispatch. Intermediate checkpoints preserve concurrent enable/disable requests; an already dispatched request may still complete and retain its receipt.

The queue grants a 120-second visibility window and a fresh claim token. Every queue-origin checkpoint and completion validates that token and lease. Browser and queue execution use the same task CAS and 100-second runtime lease. Saving a running background checkpoint also enqueues atomically. Delivery errors retry with a delay of 10–50 seconds, observed by the next one-minute dispatch; after five unsuccessful claims the job requires operator review. A sanitized queue summary accompanies each task read. Terminal delivery failure is shown separately from the last runtime checkpoint, including a successful CPU result whose artifact receipt could not be confirmed; polling stops on terminal queue states. A completed diagnostic is deduplicated by run and kind.

Stop requests are retained even if a dispatched effect later returns. An expired runtime lease pauses execution for review; an unknown external effect enters `RECONCILING`. Neither case automatically repeats the external action. An uncertain database write is resolved by rereading the checkpoint, never by assuming failure means nothing happened.

The current scheduler processes at most one step per minute. The existing task budget remains 64 steps, 12 assignments, three implementation iterations, a 24,000-token stop threshold and 15 minutes from task creation. Queue waiting consumes this wall-clock budget; long queued workflows may pause before exhausting the step budget. This is a conservative test deployment, not a throughput or production availability commitment.

## Configuration and deployment

Apply the versioned files under `supabase/migrations/` in order. The checked-in timestamps match the native project's recorded migration history. Deploy `trix-backend` using the `dist/edge/index.ts` and `dist/edge/runtime.mjs` produced by `node scripts/build-edge.mjs`; source modules are shared with Worker tests. Use the native Supabase migration/function tools when CLI telemetry is disallowed. No account access token is committed.

Provision a cryptographically random bridge token in Vault as `trix_bridge_token`, and the project API origin as `trix_backend_url`. Store the same bridge token in the private Site runtime secret `TRIX_SUPABASE_BRIDGE_TOKEN`; set `TRIX_SUPABASE_URL` to the exact project origin. Preserve other environment keys. Rotate the token in both places together and redeploy the Site environment. The Edge function's service credential is injected by Supabase; it is never copied into Site settings.

The foreground model still uses Site secrets `OPENAI_API_KEY`, `TRIX_MODEL` and operator-owned `TRIX_MCP_SERVERS`. The background consumer reads Vault names `trix_model_key`, `trix_model_name`, `trix_mcp_servers`. Configure matching model/grants deliberately; settings do not automatically copy between services. No background model credential or model name was provisioned in this test increment. The public documentation MCP grant was provisioned for both runtime paths. Credentialed MCP adapters need an explicitly supported secret binding before background enrollment; arbitrary Vault secrets are not exported into the model context.

Do not use the bridge token in browser JavaScript, a publishable API key as a job credential, `user_metadata` for authorization, or a general database administrator MCP tool as an agent capability. Realtime and pgvector remain disabled because polling and the current scoped context do not require them.

## Verification and operational limits

[Hosted persistence evidence](../reports/supabase-v0.6.0.json) records actual bridge/DB/Storage operations. [Queue evidence](../reports/queue-v0.6.0.json) records real scheduled execution, deduplication and stop/recovery. RLS was additionally tested transactionally under two synthetic authenticated claim identities: one visible run each; an unmapped identity saw zero. Those fixtures were rolled back and do not establish a complete Supabase Auth sign-in journey. Stale completion and checkpoint claims were refused, preserving state.

Security advisors returned no alerts. The performance advisor's ten missing foreign-key index findings were corrected. Informational unused-index notices are expected on newly provisioned tables and remain under observation; Auth's fixed ten-connection allocation should be reviewed before scaling. No compute/plan upgrade was made.

Production load, outage SLOs, backup restoration, retention/deletion, token rotation under load, independent immutable audit storage and multi-client CLI/IDE operation remain unqualified. The test scheduler and synthetic records are intentional test resources; they should be reviewed before production adoption.
