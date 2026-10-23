# Live activation status and remaining prerequisites

23 October 2026 · Application 0.6.0.

## Activated and observed

- The existing owner-private application retains ChatGPT sign-in and the conversational UI. Source is public independently of hosting access.
- Supabase now supplies eleven RLS-protected application tables, three private buckets, Vault configuration, a durable pgmq queue, a one-minute Cron/pg_net dispatcher and the authenticated `trix-backend` Edge function. The [Supabase runtime](supabase-runtime.md) describes authority, configuration, test evidence and limits.
- Real hosted tests verified owner isolation, one winner in a concurrent CAS race, immutable UTF-8 file readback, authenticated bridge access, scheduled CPU output **50**, duplicate enqueue suppression, stop preservation, interrupted-lease recovery and unknown-effect reconciliation. Stale queue claims were rejected at completion and checkpoint writes. These are infrastructure tests, not model or external project acceptance.
- The official public OpenAI documentation MCP remains enrolled at `https://developers.openai.com/mcp`, granting only `search_openai_docs` and `fetch_openai_doc` as read operations for the nine specialist roles. Matching read-only enrollment is available to the background processor. [Earlier live MCP evidence](../reports/live-public-mcp-v0.5.0.json) records actual discovery/search/fetch from the development container; it is not a new hosted model-driven call.
- The bounded pure CPU source was previously exercised through the connected Desktop Commander on Windows with Node 24.22.0, result **50** and three operations. That observation remains historical, as recorded in the 0.5 release evidence; it does not qualify a general remote worker or accelerator.

No compute upgrade, public bucket, public Site audience, model credential, unrestricted database tool or general external code executor was introduced.

## Prerequisites still missing

| Capability | Observed state | Required next step |
| --- | --- | --- |
| Foreground model inference and delegation | Site model key and model selection are absent | Provision through the secure provider workflow; select a supported model and verify a real conversation |
| Background AI orchestration | Vault model key/name are absent; scheduler and CPU path are verified | Configure the processor model and matching scoped grants, explicitly enable a task and verify real delegated work |
| Target implementation/test/release | No project-bound executor enrolled | Connect a sandboxed executor with enforceable paths, limits, idempotency, revision-matched receipts and recovery |
| Independent audit | No separately controlled audit service enrolled | Connect an auditor able to evaluate the exact revision without writing it |
| General CLI/IDE and physical backends | Only the bounded CPU CLI/reference is implemented | Implement native adapters and cross-surface/hardware acceptance separately |

Installing a ChatGPT plugin does not automatically provision credentials or executable capabilities inside the hosted application. TriX uses versioned specialist instructions and operator-owned grants. Do not paste keys into chat, copy another service's credentials or infer access from an integration's name.

## Full-operation acceptance

After these prerequisites are available, run a real bounded project task: clarify acceptance → delegate → implement → test → audit → correct → retest/re-audit → deliver → verify at the destination. Inspect actual outputs and exact-revision provider receipts, measure timings, and test stop/recovery. Model settings, tool enrollment and the CPU infrastructure diagnostic cannot satisfy this gate by themselves.

The [release tracker](https://github.com/MFSCV/TriX/issues/1) records source and activation progress. Current status: **local planning, private Supabase persistence and bounded scheduled CPU processing verified; live model-driven implementation acceptance remains open**.
