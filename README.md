# TriX

TriX combines a vendor-independent typed execution contract with an agent control service. She can plan a bounded operation, validate it, execute a reviewed CPU transformation, generate a callable integration, deliver it into an explicitly bound local project, and verify the installed result. The CLI, authenticated local API and web workspace share the same persistent tasks and evidence.

This is an **alpha local profile**, not the completed production conversion programme. The language specification and broad hardware catalogue remain separately versioned. Only `text.normalize` and `json.transform` are executable in this release. A separately configured GitHub adapter can deliver the reviewed integration as a draft pull request; live GitHub delivery remains unqualified. Generated integration source comes from reviewed fixed templates. Arbitrary shell commands, repository build scripts, model-generated programs, GPU workloads and production deployment are blocked or unavailable.

## Run the implementation

Node.js 24 or later is required. The main runtime has no third-party dependencies.

```sh
npm test
npm run demo
node runtime/bin/trix.mjs --help
node runtime/bin/trix.mjs serve --port 8787
```

The server binds to `127.0.0.1`. Its startup response identifies the URL and private owner-token file. Open the URL and paste that file's contents into the workspace. All project, task, artifact and evidence requests require the owner token. The static interface contains no task data or credentials. Never expose this local profile directly to a public network.

`npm run demo` creates a disposable consumer project, performs a real CPU operation, writes a generated module and consumed JSON configuration, invokes the installed integration and reports `LOCAL_VERIFIED` only when observed output matches. Without a configured model, the demo explicitly uses a typed plan; it does not simulate a language-model response.

## Native workflow

The CLI supports project binding, planning/configuration, execution, observation, cancellation, staged bundle application, verification, recovery and evidence export. Use `--output json` or `--output ndjson` for scripts, `--input FILE|-` for structured inputs and `--file FILE` for a non-overwriting export. Provider secrets never belong in arguments or project files. A successful submission is accepted work, not verified completion.

```sh
node runtime/bin/trix.mjs project bind --id demo --root ./consumer --output json
node runtime/bin/trix.mjs plan create --project demo --operation text.normalize --text ' Hello TriX ' --options '{"trim":true,"case":"upper"}' --file plan.json
node runtime/bin/trix.mjs task submit --project demo --input plan.json --apply --wait --output json
```

The consumer directory must already exist. Changes are limited to new `trix.integration.json` and `trix.integration.mjs` files; existing user files are preserved. Apply after a bundle-only job creates a linked task, preserving the original task's outcome. Input/source drift invalidates the plan. Recovery removes only unchanged files created by that delivery and retains effect history.

- [Runtime setup and limitations](docs/runtime/README.md)
- [VS Code native extension](integrations/vscode/README.md)
- [Language server](integrations/lsp/README.md)
- [Optional eve conversation facade and qualification](docs/runtime/eve-qualification.md)

## Model and connection configuration

Natural-language planning requires a legitimate configured model endpoint and model identity. Set `TRIX_MODEL_URL` to an approved OpenAI-compatible chat-completions endpoint and `TRIX_MODEL` to its exact model ID. `TRIX_MODEL_TOKEN` is optional for protected endpoints. Alternatively, an explicitly configured AI Gateway credential and model can use that gateway. Loopback HTTP is allowed for local models; other plain HTTP requires explicit configuration and is unsuitable for sensitive traffic. No ChatGPT subscription or connected ChatGPT plugin is treated as a TriX API entitlement.

The model proposes bounded structured operations and options. It cannot write code, grant permission, change the destination, install skills or select an arbitrary tool. Missing credentials return `MODEL_NOT_CONFIGURED`; typed planning remains available. Configure secrets in the process environment or a suitable external secret manager, never in this repository.

MCP and ACP integrations are experimental protocol subsets with explicit version/capability checks. MCP stdio provides bounded domain tools. ACP v1 offers planning in already-bound editor roots and does not activate supplied MCP commands. Outbound HTTP MCP requires an explicit destination, allowed tools, separate credential reference and private-address policy. A complete generic tool response does not prove the destination effect: external-effect uncertainty remains visible until reconciled.

## Persistence and assurance boundaries

Node SQLite stores tasks, versions, idempotency keys, dispatch/effect records and ordered events. The runtime distinguishes lifecycle, execution observation and individual effects. Lost write acknowledgements enter reconciliation instead of blindly replaying. Model connection revocation persists across restarts. A local hash-chain audit detects alteration and blocks new protected work on integrity failure; it is **not** an independently administered audit service.

Reviewed data-only operations run in bounded workers with confirmed termination. This is **not an operating-system sandbox**. Project directories and the host administrator remain trusted in this local profile; no hostile concurrent directory replacement claim is made. Installed code is never imported from a mutable project path: captured, verified template/configuration bytes are checked and executed in a private verification directory.

The current Linux/Node environment is tested. Windows/macOS shells, editor hosts, physical accelerators, production recovery, independent audit and live model quality need their own qualification. CI defines additional platform campaigns; configured jobs are not evidence they have run.

## Specification and history

The original [English design standard](docs/TriX_Design_and_Implementation_Standard_v0_2.md), [connection requirements](docs/TriX_MCP_and_Connection_Requirements_v0.2.md) and unchanged `preimplementation/` release remain the language/planning baseline. Their original 228 requirements and 67 future acceptance cases are not a count of this runtime's passing tests. The broader agent conversion remains staged; this alpha delivers its first controlled implementation path and native workflow foundations.

Source visibility does not change the private execution audience. No project licence has yet been selected; public source availability does not establish reuse rights.
