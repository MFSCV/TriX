# Live activation status and remaining prerequisites

22 October 2026 · Application 0.5.0 · Runtime configuration revision 1.

The owner's follow-up authorizes the skills, plugins and resources needed to activate the application. This record supplements the initial release audit, which was performed with runtime configuration revision 0. Configuration changes do not rewrite that historical result.

## Activated and observed

- The owner-private hosted application is published with the checked conversational UI, Worker APIs and R2 binding. GitHub contains the reviewed public source; its audience is separate from private hosting.
- The official public OpenAI documentation MCP server is enrolled at `https://developers.openai.com/mcp`. Only `search_openai_docs` and `fetch_openai_doc` are granted, as read operations for the nine specialist roles. This is a knowledge connection, not a project implementation or deployment worker.
- The actual MCP adapter successfully discovered the server and made real search/fetch calls. Reproduce these opt-in checks with `node scripts/check-public-mcp.mjs --live`. Add `--record` only when intentionally updating evidence. [Live check evidence](../reports/live-public-mcp-v0.5.0.json) records operation timing and response hashes. The probe runs from the development container; deployment with configuration revision 1 confirms application configuration, not a separate hosted model-driven call.
- The same versioned pure CPU source was executed through the already connected Desktop Commander on a Windows device, with Node 24.22.0. It returned `SUCCEEDED`, result **50**, and three operations. The source SHA-256 matched the release: `7594954ae68ffab780bbacc2638b78da3127aedd87720387830b09e1abdd263f`. One execution/verification observation was **0.4214 ms**, excluding source download and remote-command transport. This qualifies that small reference observation, not all Windows configurations or accelerator/model execution.

The production environment change was applied to the existing saved version without changing its owner-private audience. Provider secrets, connected-device identifiers and private hosting identifiers are excluded from public evidence.

## Confirmed prerequisites still missing

| Capability | Observed state | Required next step |
| --- | --- | --- |
| OpenAI Developers plugin | Available but installation not confirmed | The account owner must complete installation; the available plugin-management operation offers installation but cannot silently complete it |
| Model inference and delegation | No `OPENAI_API_KEY` or `TRIX_MODEL` configured | Use the secure provider credential workflow when available; configure a supported model and make a real task call |
| Target implementation/test/release workers | None enrolled | Connect a project-bound executor with enforceable paths, sandbox, authority, receipts and recovery |
| External audit independence | No separately controlled audit worker | Enroll an audit identity/service that can evaluate the exact revision without writing it |
| SentinelX executor | No hosts enrolled | Enroll an authorized Linux host if this route is selected; no installer or daemon was run on another device |
| Windows project execution service | Desktop Commander is connected; only the bounded reference was exercised | A ChatGPT device connection is not automatically a credential or MCP endpoint that the hosted application can reuse |

Installing a ChatGPT plugin does not automatically install skills or credentials inside the hosted TriX application. This release uses versioned specialist instructions and explicit operator tool grants. It does not copy arbitrary account integrations into the browser or silently grant them to a model.

## Full-operation acceptance

After prerequisites are available, run one real bounded project task through the conversation: clarify acceptance → delegate → implement → test → audit → correct → retest/re-audit → deliver → verify at the destination. Check actual outputs and revision-matched provider receipts, measure response/operation times and exercise stop/recovery. Do not mark this gate complete merely because model settings or tool names appear in Connections.

The [release tracker](https://github.com/MFSCV/TriX/issues/1) records the initial release commit and activation progress. The current honest status is **local planning verified; public knowledge MCP activated; full model-driven implementation still blocked on provider and executor enrollment**.
