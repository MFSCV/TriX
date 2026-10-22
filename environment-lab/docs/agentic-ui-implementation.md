> Historical record: applies to its stated release. Use the [current documentation index](README.md) for application 0.5.0, capabilities and verification limits.

# TriX Task Workspace 0.3

Date: 22 October 2026. Implemented frontend increment from TRIX-UX-001 v0.1.

## Source and authority

The user requested implementation of the agentic-interaction UI/UX plan. The private Site source at commit 6d835e27e2dd7398257d3cb6954f222205dd06de already contained the v2 environment domain, per-task planning workflow, recoverable persistence and pure CPU reference. This increment preserves those later additions instead of reverting to the older public repository snapshot used during planning.

UI package version 0.3.0 and planning-engine version 0.2.0 are distinct. The current planning export remains trix.environment-planning/v2, with existing v1 migration. This is an explicit update to the older design-plan migration assumption, not a new language IR.

## Implemented interaction

- Goal-first Home with four useful entry actions and recent task resumption.
- One task conversation and Plan, Artifacts, Changes and Evidence workbench tabs. Old commands/agent-design navigation aliases enter this workspace.
- Persisted browser-local tasks, drafts, messages, selected context, proposals, input revisions, immutable artifacts, hashes and activity. Selected task deep links resolve only records available in that browser.
- Existing deterministic command vocabulary plus explicitly bounded goal templates. Unsupported language is recorded without fabricated reasoning or execution.
- Exact local scenario proposal review, current-base checks, stale refusal and independent manual environment editing.
- Existing v2 configurator, workflow, comparison, qualification checklist and export functions retained. Task history uses a separate key and does not overwrite environment or theme storage.
- JSON, YAML and Markdown artifact previews/downloads. SHA-256 binds the canonical JSON artifact. Download requests are distinguished from independently observed filesystem saves.
- Actual pure CPU execution in a dedicated browser Worker, result trace and output artifact. Cancellation terminates only the worker owned by the current tab. External effects remain prohibited.
- Separate lifecycle, execution-observation, knowledge and external-effect fields. An unobserved prior attempt is not relabeled as stopped or succeeded.
- Projects/context overview, directional Connections, integration-evidence registry, local outcome inbox, settings, task export and explicit local-history removal controls.
- Searchable action palette, keyboard tab movement, dialog focus restoration, English content, semantic Light/Dark/System tokens and mobile conversation/workbench switching. Off-canvas closed navigation is inert.

Context is limited to eight text files of at most 100 KB each per task. No provider receives context. History is limited to 40 tasks, 12 artifacts, 200 messages and 300 local events per task, with a 3.5 MB encoded store bound. Export/remove actions are provided instead of silent eviction. Malformed history stays available for recovery; failed saves retain in-tab state with a visible session-only warning.

## Honest capability boundary

This implements the planning/UI slice and local CPU supervision, not the entire P0-P5 runtime programme. There is no configured model provider, authenticated durable server task service, enrolled hardware worker, outbound MCP broker, inbound MCP endpoint, IDE adapter, general agent CLI, repository write adapter or independent audit service. Connection cards expose these states without pretend Connect/Run/Apply controls. Existing Node CLI applies only to the bounded CPU reference.

Task localStorage records are user-editable local records, not protected audit evidence. SHA-256 establishes content identity, not authenticity or hardware qualification. The native WebCrypto digest has a tested standard SHA-256 fallback for HTTP development preview; IDs are local identities, never access credentials.

Sequential stale-tab conflicts are checked and storage events refresh the projection. localStorage has no atomic cross-tab compare-and-swap; truly simultaneous writes remain outside this frontend's guarantee. Multi-client transactional authority, durable orchestration, budget reservation, concurrent effect deduplication and independent audit require the server contract. The UI does not claim those guarantees.

## Plan coverage

| Plan area | Implemented scope | Remaining dependency |
| --- | --- | --- |
| P0/P1 shell, conversation, forms, revisions, artifacts, diagnostics, themes | Implemented for browser-local planning and existing v2 domain | Further usability iteration |
| P2 state, activity, supervision and recovery | Implemented for bounded local CPU; honest status for unobserved attempts | Authenticated server, policy, provider, independent audit and durable event stream |
| P3 outbound changes and delivery | Local scenario review; immutable exports and download receipts | Destination binding, isolated writer, integration tests and provider receipts |
| P4 IDE/CLI/MCP continuity | Capability boundaries and existing reference CLI explained | Shared runtime/API and separately tested native adapters |
| P5 validation | Automated regressions and focused browser QA recorded separately | Representative user study, assistive-technology review and measured release targets |

No WCAG conformance, production security or universal client/platform support claim follows from these frontend checks.

## Maintenance

- dist/task-store.mjs owns local task records, bounded interpretation, revisions and content identity.
- dist/workspace-ui.mjs owns task views and interaction orchestration.
- dist/cpu-worker.mjs runs only the pre-existing pure reference executor.
- dist/workspace.css owns semantic tokens and the new responsive shell.
- dist/app.js remains the bridge to existing expert tools and their single shared environment state.
- tests/task-workspace.test.mjs covers persistence, stale proposals, blocked exports, digest oracles, inert input and data preservation.

Keep the private Site audience and project identity. The next server implementation must supply authoritative capability/policy/event interfaces before enabling model or project effects. Do not replace recorded unavailability with a visual-only success state.
