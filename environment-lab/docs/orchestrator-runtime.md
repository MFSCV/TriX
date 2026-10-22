# TriX conversational orchestration · 0.5.0

This runtime record is part of the [current documentation index](README.md). The conversational interface supersedes the earlier dashboard-led UI. The conversation is the primary interface. Specialists, existing environment tools, reports and release evidence appear through typed contextual surfaces. The old task workspace remains reachable only for previous local history.

## Implemented behavior

- A single message composer, collapsible conversation history, attachments, task scope, Stop and contextual results. Light, dark and system appearance; responsive layouts; keyboard access and native modal focus containment.
- Nine specialist definitions in `public/specialists.mjs`: requirements, architecture, MCP integration, implementation, tests, security, project audit, release and documentation. Each has a purpose, expected output and action boundary.
- A server-side Responses API loop with separate specialist contexts. Only the orchestrator delegates. Specialists return reports to their parent; no peer channels or recursive delegation are exposed.
- Server-owned MCP enrollment, live tool discovery, schema validation, fixed target arguments, role/purpose checks and per-task action grants. This adapter explicitly supports Streamable HTTP protocol **2025-11-25**; other versions fail closed. It supports JSON and bounded SSE responses, session headers, protocol errors, notification initialization and session cleanup. It does not implement OAuth enrollment, stdio, sampling or arbitrary URL proxies.
- Built-in environment validation, configuration artifacts with SHA-256 and the pure CPU example are available to the model through `local_tool`, using an immutable environment snapshot attached when the task starts. Browser-local versions remain available without model credentials.
- Serialized task blobs in R2, conditional ETag writes, per-user key prefixes, step leases, pre-dispatch effect checkpoints, retained receipts and explicit recovery states. Checkpoint writes are paced for R2's per-key rate limit. Records are operational evidence, not an independently immutable audit system.
- Implementation invalidates previous gates. Test/audit/verification requests invalidate their previous verdict. Deployment requires passing test and external audit receipts for the exact current revision and revision-bound deployment arguments. A failed verdict can return to the orchestrator for another implementation and fresh tests. Timeout, missing receipt or unknown external outcome blocks automatic replay.

## Activation dependencies

The deployed UI must report local tools until the model is configured. No fake specialist messages, model responses, audits, external tests or deployments are substituted for missing connections.

1. Enable the **OpenAI Developers** plugin. Follow its API-key approval workflow, then configure `OPENAI_API_KEY` as a **Site runtime secret**. Never put a key in chat, source, browser storage or the hosting manifest.
2. Set `TRIX_MODEL` to an available Responses API model with function calling. This release does not guess the user's provider entitlement or silently choose a billed model.
3. Set the server-owned `TRIX_MCP_SERVERS` JSON and separate MCP credential secrets in the Site settings. Each server is an operator-selected public HTTPS hostname, not a browser-provided endpoint. The operator must verify hostname ownership and network routing; the runtime does not resolve DNS itself or support private-network enrollment.
4. Use task scope to select enrolled servers and, where needed, authorize actions within their fixed target bindings. A goal, report or model instruction cannot grant additional tools.
5. Validate the real provider, MCP server, destination, receipt contract and failure recovery before treating the integration as qualified.

Example enrollment (replace the example host and names with a verified server; do not use real tokens here):

```json
[
  {
    "id": "project-worker",
    "name": "Project worker",
    "url": "https://worker.example.org/mcp",
    "tokenEnv": "PROJECT_WORKER_TOKEN",
    "tools": [
      {"name":"project_inspect","purpose":"read","roles":["architect","implementer","tester","auditor","release"],"fixedArguments":{"project":"bound-project"}},
      {"name":"apply_patch","purpose":"implement","roles":["implementer"],"fixedArguments":{"project":"bound-project","branch":"trix-work"}},
      {"name":"run_tests","purpose":"test","roles":["tester"],"fixedArguments":{"project":"bound-project"},"revisionArgument":"revision"},
      {"name":"request_audit","purpose":"audit","roles":["auditor","security"],"fixedArguments":{"project":"bound-project"},"revisionArgument":"revision"},
      {"name":"deploy_revision","purpose":"deploy","roles":["release"],"fixedArguments":{"project":"bound-project","environment":"staging"},"revisionArgument":"revision"},
      {"name":"verify_release","purpose":"verify","roles":["release","tester"],"fixedArguments":{"project":"bound-project","environment":"staging"},"revisionArgument":"revision"}
    ]
  }
]
```

Calls include namespaced MCP metadata `dev.trix/task-id` and `dev.trix/effect-id` for provider correlation. This is not an idempotency guarantee; the worker must implement that contract. The MCP server implements the actual repository/worker/test/deployment operations. TriX does not execute arbitrary host code, install a worker, or infer a repository permission from this manifest. Fixed arguments bind the destination; the enrolled server must enforce its own authentication, repository root, base revision, allowed paths, sandbox, idempotency and receipts. Avoid tools with unconstrained command or arbitrary filesystem/network authority.

An action result must include a stable receipt:

```json
{"content":[],"structuredContent":{"status":"success","revision":"exact-commit-or-version","receiptId":"provider-operation-id","verdict":"passed"}}
```

`verdict: "passed"` is required for test, audit and verification gates. A completed request with a failing verdict is retained without opening its gate. Read receipts may establish the initial revision; implementation receipts establish a new revision and clear gates. The provider supplies report contents and provenance. A model's own review never opens the external audit gate. External audit provenance still requires verification of the enrolled audit service and its independent identity.

## Execution and recovery limits

- Up to 64 orchestration steps, 12 assignments, 3 implementation iterations and 15 minutes per task. Measured model usage is checked at each step against a 24,000-token stop threshold; one in-flight response may cross that threshold. This is not a monetary billing cap or a tokenizer-enforced reservation.
- One model or tool action per checkpointed HTTP step. The browser advances steps while open. Reloaded tasks expose Resume/Continue. R2 persists progress, but no unattended scheduler or continuously running worker is installed.
- A lease that expires without a response becomes paused or reconciling. The API never assumes an interrupted external call failed. Stop prevents new dispatch once observed; an already sent request may complete and its receipt is retained.
- `RECONCILING` requires an operator to inspect the provider and repair the authoritative task record using its exact receipt. No automatic reconciliation mutation, blind retry or arbitrary user-supplied "success" assertion is exposed. This deliberately blocks further writes until a real reconciliation adapter is enrolled in a future increment.
- Server tasks currently have an account limit of 40, without a delete API. Browser-local history has a separate 40-task/3 MB bound. Context is up to eight text files, each at most 100 KB, read by the model in bounded 6,000-character chunks. Previous v0.3 local tasks remain in their original store.
- Conversation completion means the model turn ended. Successful implementation, test, audit, deployment and verification are separate receipt states.

## Storage, build and hosting

`public/` contains source assets. `runtime/` implements policy, model orchestration, built-ins and MCP. `worker/index.js` implements authenticated APIs and static serving. `scripts/build.mjs` creates one dependency-free ESM Worker with embedded assets; it isolates the existing domain modules in closures. `dist/` is generated and not source. `.openai/hosting.json` retains the existing private Site ID and declares the logical `BUCKET` R2 binding.

The public source uses `.openai/hosting.example.json` without a Site ID. Build falls back to that template when private hosting configuration is absent; an operator must register their own Site and identity boundary before deployment.

The managed development preview uses `scripts/dev.mjs`, with disposable in-memory storage, a preview identity and no model/MCP secrets. That identity adapter is excluded from the production Worker. Production uses only the Sites-provided authenticated user ID; absence is denied for task APIs. The existing owner-private audience is preserved.

Validation: `npm run check`. Publish the exact source commit and Worker artifact through the Sites source workflow. Do not copy this private runtime configuration to a public repository.

## Response observations

Browser local preparation, browser CPU worker round-trip, server built-in execution and observed provider request durations are recorded with separate scopes. CPU artifacts record execution location and SHA-256. Model configuration alone does not establish connectivity. `scripts/benchmark.mjs` measures warm deterministic functions, independent output checks and a fixed local-routing corpus; it does not measure live model, MCP or R2 performance.

## Evidence and outstanding qualification

Automated fixtures exercise the model/tool/delegation loop, exact revision gates, failing audits, fresh implementation invalidation, pre-dispatch checkpoints, uncertain outcome blocking, scope/target refusals, request identity, origin checks, step ownership and real built-in domain behavior. These fixtures do not establish live provider behavior, external implementation success, independent audit identity, deployment success or unattended operation. See [the release audit](release-audit-v0.5.0.md) for current checks. The 0.4 verification file remains historical evidence.

Protocol references: [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), [MCP 2025-11-25 transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [R2 conditional operations](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).
