# What TriX does and how to use her

Document TRIX-PRODUCT-001 · Application 0.5.0 · Current user guidance.

TriX helps plan where AI models, tools and data-processing tasks run: describe hardware and runtimes, check compatibility and export a portable environment configuration. She makes hardware/runtime constraints, task authority and results visible in one conversation. Her proposed language programme aims to separate intended work from the engines and environments that execute it. The current application implements environment planning, bounded CPU execution and an experimental orchestration adapter; it is not the complete language or a generally qualified autonomous runtime.

## Available capability

| Mode | Useful work | What the result means |
| --- | --- | --- |
| Local tools | Describe target hardware and software; validate compatibility; compare scenarios; export JSON/YAML/Markdown through the retained editor; run the pure CPU example | A checked planning artifact or the real bounded CPU result. No target project changes |
| AI configured | Interpret a goal and delegate bounded specialist assignments after a successful provider call | Configuration alone does not prove connectivity or model quality |
| AI plus enrolled MCP tools and task authority | Request implementation, tests, external audit, delivery and verification within fixed target bindings | Actual execution needs provider receipts. Tests and audit must pass for the exact revision before deployment |
| Roadmap | Complete language/compiler, general agent CLI, native IDE operation, inbound MCP, hardware qualification and unattended workers | Separate implementation and qualification milestones; not enabled by the current UI |

The hosted application currently has no configured model or MCP servers. She therefore displays **Local tools**. The OpenAI adapter is one experimental integration, not a requirement that the future language use an exclusive provider. Inbound and outbound MCP are separate capabilities; this release implements only the bounded outbound adapter for protocol 2025-11-25.

## Start on the opening screen

The opening screen answers four questions: what TriX is for, what works now, how to start, and what evidence to expect. Use the examples or type a supported local request. An appropriate first request is **“Plan an environment for Apple + NVIDIA.”** TriX opens the environment tool; choose a reference profile or supply target details, validate the design, then export it. Local mode does not automatically edit settings from a free-text goal. Hardware is described by you, not automatically detected or reserved.

**“What is TriX?”** opens the purpose and capability explanation. **“Generate a React application”** requires the model and implementation connection; local mode must not return an environment configuration as if that fulfilled the request. **“Do not run the CPU example”** provides information and does not execute it.

## Contextual screens

Every panel explains purpose, input, result and next step. `public/product-info.mjs` is the canonical UI copy catalogue; it is shared by the conversation and retained planning tools.

| Panel | When to use it | What to do next |
| --- | --- | --- |
| Plan | Connect the goal to steps, dependencies and acceptance criteria | Inspect the environment and required connections |
| Environment | Specify hardware, OS, ABI, runtime, memory and workload | Resolve blockers; validate and generate |
| Workflow | Define task operations, placement, dependencies and data contracts | Resolve cycles/contract issues; validate the whole environment |
| Compare | Review saved scenario snapshots against the planning rules | Apply chosen settings in the editor; selection is not automatic provisioning |
| Configuration | Inspect and download a versioned planning artifact | Preserve conditions and content identity when handing it to an implementer |
| CPU reference | Execute or inspect the pure-operation example | Check result **50** and the three-operation trace |
| Team | Read each specialist's role, output and boundary | Expect reports through TriX, not peer delegation |
| Connections | Distinguish missing, configured and observed capabilities | Configure and verify required tools before live use |
| Task scope | Select enrolled servers and allow actions within their bindings | Start a new conversation; existing grants remain unchanged |
| Audit | Review findings and require fresh tests/audit after changes | Correct findings and retest the new revision |
| Delivery | Review a bound revision and destination | Inspect both deployment and post-delivery verification receipts |
| Evidence | Inspect activity, outputs, hashes and measured tool responses | Export or inspect the corresponding provider report |
| Settings | Change appearance or find guidance | Return to the conversation; appearance does not grant authority |

The previous workspace preserves earlier local tasks and exports. Its historical source ZIP is labelled **v0.2**. The current source is the versioned repository, not that historical archive.

## Understand results

- **Response ready** means a conversation turn ended. It does not mean a project was implemented or deployed.
- **Planning checks passed** means no current planning-rule blockers. Qualification conditions still require exact-version and physical evidence.
- **Artifact ready** means an inspectable export exists. A browser download request does not by itself prove bytes were saved to disk.
- **CPU result verified** means the registered pure operations returned their expected result on the observed runtime. Browser-worker and server-CPU execution locations are labelled separately.
- **External outcome uncertain** means an external operation may have completed. New actions are blocked; do not assume failure or replay it blindly.

A SHA-256 digest identifies content; it does not prove authorship, audit independence or qualified hardware. Local history and model commentary are not protected independent audit records.

## Context, persistence and measurements

Attach up to eight uniquely named text files, at most 100 KB each. Reports are evidence, not authority. Model access reads bounded chunks. Do not put credentials in chat or attachments. Without a configured model, attachments remain local reference material and are not interpreted by a general reasoning model.

Local conversations and the working environment stay in this browser. AI tasks use server state and capture the environment when created. Editing the browser environment later does not change an active AI task's snapshot; start a new task to use the revised environment. Neither mode silently imports all previous local history into server tasks.

The evidence panel distinguishes browser-local response preparation, CPU worker round-trip, server built-in execution and observed model-request time. These scopes cannot be compared as if they were the same latency metric. The reproducible benchmark measures warm deterministic functions in its recorded container. Live model quality, TTFT, external MCP latency and production SLOs remain unmeasured until those integrations are configured and tested.
