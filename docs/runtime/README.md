# TriX local agent runtime

Version: 0.2.0-alpha.1. Profile: single-user local, Node 24+, SQLite WAL, reviewed data-only CPU operations. This document describes implemented behavior; `implementation-status.json` records qualification limits.

## Start and authenticate

Run `node runtime/bin/trix.mjs serve --port 8787` from the repository. The local service serves the existing Environment Lab and the connected Agent workspace. Project/task API data requires an owner bearer token. The CLI records the generated token in a private file outside the project and prints only its location; an explicit `TRIX_TOKEN` overrides it. Use that token in the workspace password field or remote CLI process environment. Tokens/drafts stay in page memory, not localStorage.

The runtime state defaults to the user-owned `.local/state/trix` directory. Override with `TRIX_STATE_DIR` or `--state-dir`. Do not put state inside project snapshots except an excluded `.trix` directory. State, token files, SQLite journals and model credentials must never be committed. The server accepts only loopback and pins Host/Origin; deploy a separately qualified identity/TLS service before any remote use.

## End-to-end flow

1. Bind an existing root explicitly with `project bind`. The web server additionally restricts roots to its configured workspace root.
2. Provide the bounded payload and either typed operation/options or a natural-language objective with a configured model.
3. Review the plan, canonical digest, source revision and intended completion mode.
4. Submit a bundle-only or expressly authorized local-apply task. Each mutation has an idempotency identity; changed payloads conflict.
5. Observe persisted state/events. Acceptance does not mean completion. Closing a browser only detaches observation.
6. Apply a verified bundle through a linked new task. Only the two fixed integration files are created; existing files and source drift block application.
7. Verify the captured installed bytes, consumed configuration and callable output. Examine retained effects and evidence.
8. Recover only unchanged created files if required. This is a separate recorded action; the original effect history is preserved.

`text.normalize` supports LF normalization, optional trimming and upper/lower/preserved case. `json.transform` accepts a bounded object, explicit property selection and deterministic key ordering. No arbitrary source or shell interpreter is exposed. JSON parsing rejects duplicate keys, unsupported values and excessive size/depth. The first logical-plan profile is a bounded one-node transform, not a claim that the full general TriX DAG/compiler is implemented.

## Model routing

Set `TRIX_MODEL_URL`, `TRIX_MODEL`, and optionally `TRIX_MODEL_TOKEN` for an explicit compatible model service. A configured gateway key plus exact model can use the AI Gateway default endpoint. Credentials remain server-side. No provider has been connected, purchased or inferred from a consumer subscription. A missing model fails explicitly; the UI offers typed planning separately.

The adapter bounds request/input/output tokens, JSON size, timeout and options. External text cannot grant authority. Revoking the model persists in SQLite; deliberate reconfiguration is required to enable it again. Tests use clearly identified mock provider responses and do not qualify live language-model performance.

## API and protocols

The common HTTP namespace is `/api/v1`; JSON envelopes identify `trix.api/v1` and distinguish `accepted`, `ok` and `error`. The RPC route has an explicit method allowlist and positional schema. Invalid identities, roots, bodies, revisions and origins fail before effects. Artifact and evidence handles are authenticated; opacity is not authorization.

`trix mcp serve` uses the implemented modern 2026-07-28 stdio subset. Unsupported legacy handshakes are refused. `trix acp serve` uses a bounded ACP v1 planning bridge for an already-bound root. Neither stdio facade grants arbitrary local writes or installs editor-supplied commands. The language server is separate, uses LSP Content-Length framing and exposes diagnostics only. A native VS Code extension provides trust-aware commands, context snapshots, task observation and read-only diff review.

Configured outbound MCP calls use separate credentials, allowed tool names, validated/pinned network destinations, bounded JSON/SSE responses and current per-request metadata. Revocation is checked before requests. The generic external tool result is recorded as a response, not as proof that a destination effect was verified. Failures are not automatically retried.

## Recovery and remaining gates

SQLite transactions and guarded versions serialize dispatch and audit intent. Durable task identity is independent of a transport session. For an uncertain local write, readback can prove the prepared bytes were installed without replaying the write. Partial results remain `RECONCILING` if proof is unavailable. Cancellation, timeout, stopped execution and compensated effects remain distinct.

The local audit chain is not independently protected from the host administrator. Worker memory/time limits do not establish OS isolation. Intermediate project paths require a trusted stable directory tree. There is no multi-tenant hosted service, qualified accelerator/cluster, arbitrary build runner, production deployment adapter, marketplace release or universal rollback.

Before production: qualify OS isolation, independent audit and privileged credentials; choose real model/provider and destinations; adopt budgets, retention, SLO/RPO/RTO; test backup/restore and in-flight upgrades; run held-out model evaluations and physical hardware/editor/shell matrices. Do not claim the wider 10-phase conversion complete from the alpha's local tests.

## Optional GitHub draft delivery

The adapter is implemented and tested against labelled mock API fixtures. It has not published a live change during this implementation. Configure `TRIX_GITHUB_REPOSITORY`, `TRIX_GITHUB_PROJECT` and a narrowly scoped `TRIX_GITHUB_TOKEN` on the server; the project ID must match the task. Repository selection cannot come from a prompt or CLI repository flag.

Use `delivery preview --id TASK` to inspect the exact base SHA and two-file change set. `delivery submit --id TASK --expected-base-sha SHA` then persists intent, creates a bounded commit/branch and draft review, and independently reads back the expected tree and review. It never merges, deploys or claims CI passed. Repeated verified delivery reuses its receipt. An uncertain dispatch blocks new writes until `delivery reconcile --id TASK` proves the existing review; unreachable/partial objects remain explicitly unresolved. Every request checks current project/audit authority. Actual project publication still requires the user's applicable authorization.
