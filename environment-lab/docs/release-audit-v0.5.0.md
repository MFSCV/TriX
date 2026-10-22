# TriX 0.5.0 — product, documentation and verification report

Document TRIX-AUDIT-005 · 22 October 2026 · Experimental application release.

## Result and intended use

TriX helps plan **where AI models, tools and data-processing tasks run**. A user describes hardware, runtimes and constraints, checks compatibility, compares environments and exports a portable configuration. The current local application also executes a small typed CPU graph. With a model and enrolled external tools, the experimental orchestrator can delegate scoped implementation, tests, audit and delivery. Those live integrations are not configured in the observed hosted environment.

The generic opening statement about bringing specialists and tools together has been replaced by **“Plan where your AI work runs.”** The next sentence names the user's input and the concrete output: hardware, models and constraints → compatibility checks and a portable environment configuration. The opening now presents a three-step journey and a supported first request. This is useful application behaviour within the larger proposed TriX language programme; it is not a complete compiler or universal execution runtime.

**Release assessment:** local planning and bounded execution passed the recorded regression and browser checks. Live autonomous implementation, model quality and external delivery remain unqualified. It would be inaccurate to guarantee that every possible configuration or connected operation works.

## Review method and coverage

This is an implementation-led product/quality review with focused source inspection, regression tests, deterministic measurements and manual browser acceptance. It is not an independent security certification, penetration test, exhaustive device matrix or complete accessibility audit.

Reviewed sources and authority are recorded in [the source inventory](source-inventory.json). The review covered current application source and documentation, all 13 Markdown documents identified in the public specification/preimplementation areas, the complete text of the English Standard 0.2 and MCP requirements, the end-to-end conversion plan and all 27 pages of the earlier UI/UX proposal as text. Historical PDF/DOCX editions, archives and authoring history are preserved; they were not all regenerated or visually revalidated. The [current index](README.md) explains which records describe current behaviour and which remain proposals or historical evidence.

Acceptance is mapped to stable review requirements in the [implementation baseline](implementation-baseline.md). Evidence is retained as machine-readable reports and SHA-256 entries in [version.json](../version.json).

## Findings, corrections and rechecks

| ID | Observed issue | Correction | Recheck |
| --- | --- | --- | --- |
| QA-001 | Opening described orchestration without explaining the job TriX performs | Explicit AI-workload purpose, input/output, available capability, three steps and supported first request; clearer title and brand caption | Desktop and mobile browser reading and visual inspection |
| QA-002 | Panels did not consistently explain why they appeared or what to provide next | Shared purpose/input/result/next-step catalogue for every current surface and retained editor | Catalogue coverage regression plus representative browser panels |
| QA-003 | Configuration booleans could be mistaken for a verified connection | “AI configured” and explicit live-verification requirement; removal of unnecessary plugin setup instruction | API/source tests and missing-connection UI |
| QA-004 | Completed response could imply a completed implementation | Separate guidance, planning, artifact, CPU result, failure and uncertainty labels | Status regression and browser flows |
| QA-005 | Generic application generation and unrelated validation could select the wrong local tool | Scoped deterministic command routing; unsupported goals explain missing integration | Same fixed corpus improved from 16/28 to 28/28 |
| QA-006 | CPU outputs lacked a consistent downloadable result/digest/location; worker failures looked stopped | Retained output and trace, explicit browser/server execution, SHA-256, download and separate failed/stopped states | CPU result 50, three operations, browser digest and independent server-result hash test |
| QA-007 | Malformed API roots, invalid context/environment and damaged local records could fail unclearly | Early validation, unique context names, UTF-8 quotas, delegation/measurement restore validation and original-history recovery | Invalid-input and restore regressions |
| QA-008 | Editing the browser environment could be confused with changing an active AI snapshot | Explicit captured-snapshot versus live working-environment explanation | Source/API tests and contextual editor inspection |
| QA-009 | Old “static/no broker” documentation conflicted with the current Worker runtime | Current documentation index, product guide, implementation baseline and updated integration/runtime instructions; historical notices | Relative-link checks and source reconciliation |
| QA-010 | Public source could depend on private hosting identity | Generic template, optional build identity, explicit public export allowlist and private-identifier scan | Sanitized export and build/artifact check |
| QA-011 | Invalid configuration generation returned a terse technical failure | Planning-blocker status, diagnostic explanation and corrective action; no artifact generated | CPU profile + CUDA rejected, then valid profile exported |
| QA-012 | Base CSS followed imported layout rules, overriding mobile breakpoints | Base and layout loaded in explicit order; opening composer avoids overlap; narrow header and hash wrapping corrected | 320/375-pixel frames, light/dark, measured scroll width |

The first browser attempt at invalid generation exposed QA-011. The first narrow-screen inspection exposed QA-012. Both were corrected and rerun; those initial failures are retained here rather than presenting the review as a first-pass success.

## Functional evidence

Run `npm run check` for the recorded source regression, syntax, build, embedded Worker and current-document link checks. The regression suite passed **168/168**, with no failures, cancellations or skipped tests. Exact counts, stage durations, test-file hashes and runtime are in [test results](../reports/test-results-v0.5.0.json). Coverage includes planning compatibility, imports/migration, bounded CPU execution, CLI checkpoints, task storage, role/tool policy, simulated model delegation/MCP and release receipts. Simulated provider tests establish deterministic contracts, not interoperability with a real provider.

Manual browser acceptance used the managed development preview with disposable local identity/storage and no provider credentials. [Browser evidence](../reports/browser-v0.5.0.json) records scope and observations:

- Opening and “What TriX does” explain the problem, current tools, connected work and roadmap. The help disclosure presents input, result and next step.
- “Generate a React application” reports that the connection is needed; it does not fabricate an implementation or return an unrelated configuration.
- Planning validation displays unresolved qualification conditions. Selecting Portable CPU and then CUDA blocks configuration generation with `CUDA_TARGET` and a corrective action.
- Restoring Apple + NVIDIA permits export. The downloaded JSON was **15,294 bytes**; its displayed and independently recalculated SHA-256 both equal `995b610420de2f5a864ea931e7030aac53df8c4e314f393620b91d150cb98c7d`. The exact exported content was imported through the editor and revalidated with two execution groups and no planning blockers. Generated timestamps mean a new export normally has a different digest.
- The browser CPU worker returned **50**, `SUCCEEDED` and a trace containing constant, multiply and add. Its displayed digest was `6516e94555016664f830748894d4a57f1dfdd3e0e21b710abe8221e41af0b044`.
- Two saved scenarios displayed different groups, architectures and backends. Performance remained explicitly “Not measured”.
- Creating a workflow task changed the actual working state. A self-dependency produced `TASK_CYCLE` and disabled generation. Removing it restored generation.
- Reload retained the test conversation. Task scope disabled external authority with no enrolled server. Settings changed theme. The 320/375-pixel fixtures had no horizontal overflow after the CSS correction (observed client/scroll widths 305/305 and 375/375).

The sampled console filter for application-origin errors returned no entries. Browser-extension metadata errors were observed separately and are not reported as application failures. This limited observation is not a guarantee of an error-free console in all conditions.

## Response and output measurements

Run `npm run benchmark` to reproduce the [benchmark](../reports/benchmark-v0.5.0.json). Each operation has 30 warm-up calls and 300 measured samples, with p50/p95/max, clock and container metadata. It covers validation, configuration generation, CPU execution, JSON round-trip and SHA-256. 
| Operation | p50 (ms) | p95 (ms) |
| --- | ---: | ---: |
| `environment.validate` | 0.014 | 0.153 |
| `environment.generate` | 0.036 | 0.164 |
| `reference.execute` | 0.011 | 0.032 |
| `configuration.roundtrip` | 0.174 | 0.439 |
| `configuration.sha256` | 0.008 | 0.040 |

All 11 reference profiles generated with zero planning errors; the CPU oracle returned 50 with three operations; the configuration round-trip preserved the expected environment identity and groups.

The fixed synthetic local-command set passed **28/28**, compared with **16/28** for the previous routing predicates recorded in [the baseline](../reports/routing-baseline-v0.4.json). This is regression coverage for these requests, not a percentage measure of general natural-language understanding or model quality.

One observed browser CPU execution took **30.3 ms**, including worker startup, execution, result transfer and SHA-256. The recorded preparation scopes were 0.5 ms for the unsupported-request response and 0.3 ms before CPU-worker execution. These are individual observations, not latency guarantees. Server events now retain observed model/local-tool duration; no model call was made in this release review.

The earlier [function baseline](../reports/baseline-v0.4.json) is preserved. Differences between short microbenchmarks are sensitive to runtime scheduling and warm-up; no performance improvement or production SLO is claimed from them. Browser response, pure execution, network latency and model TTFT are distinct measurements.

## Documentation and release traceability

Current guidance now covers purpose, modes, every contextual screen, result vocabulary, attachments, snapshots, persistence, measurements and activation boundaries. The existing language standard and preimplementation package keep their versions and hashes. The current application, planning engine, schema and proposed standard versions are explicitly separate.

Application release: **0.5.0**, experimental; planning engine **0.2.0**; environment schema **v2**; proposed standard **0.2**. `public/release.mjs` is canonical. [CHANGELOG.md](../CHANGELOG.md), [version.json](../version.json), source/evidence hashes and the GitHub release-tracker issue identify the released source and verification status. The GitHub commit is the containing revision; the tracker records its exact SHA after the push to avoid a self-referential hash.

Public synchronization updates the application under `environment-lab/` and the repository's current entry points, preserving historical/specification directories. It excludes private Site identity, credentials, user records, screenshots and generated deployment bundles. The hosted application's owner-private audience is unchanged. Publication success is checked through the hosting service; browser acceptance above concerns the local build, not a separate live-provider campaign.

## Open acceptance gates

| Gate | Current state | Evidence still needed |
| --- | --- | --- |
| Live model and specialist quality | No model configured | Authorized provider/model, successful real calls, representative task/quality evaluation and latency/TTFT |
| External implementation/test/audit/delivery | No MCP server or target enrolled | Destination-bound worker, real output checks, revision-matched receipts and post-delivery verification |
| Audit independence and effect recovery | Policy contracts tested with simulated services | Separately controlled auditor, destination fencing/idempotency and operation-specific uncertain-effect reconciliation |
| Physical hardware and model backends | Planning declarations only | Exact hardware/software tuple and numerical/resource/throughput qualification |
| Unattended execution and full CLI/IDE | Not implemented | Durable scheduler/executor and cross-surface acceptance |
| Production operations | Not qualified | Representative load, recovery, retention/deletion, capacity, billing objectives and independent security/accessibility review |

These are explicit remaining project gates. They are not hidden behind successful local tests or an orchestration-themed interface.
