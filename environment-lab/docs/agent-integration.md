# Agent integration status

Application 0.6.0 · Current implementation record. Supersedes this file’s earlier static-site status. See the [documentation index](README.md) and [runtime contract](orchestrator-runtime.md).

TriX contains a bounded server-side orchestrator and nine specialist definitions. A configured model may delegate one assignment at a time to a separate specialist context. Specialists report only to the orchestrator. Enrolled MCP tools are checked against server-owned roles, purposes, fixed targets, revision requirements and task authority. Configuration does not establish a successful live call.

The built-in tools validate the task’s captured environment, generate a configuration artifact and execute the pure CPU example. The browser retains deterministic local versions. The previous `agents.mjs` module still supports historical exact-command planning tools; it is not the model orchestrator and must not be used to infer general language reasoning.

## Specialist contract

`public/specialists.mjs` is the role catalogue. `runtime/policy.mjs` enforces external tool authority; a role card or model instruction cannot grant it. `runtime/orchestrator.mjs` exposes parent-only delegation, context reads, local tools, contextual surfaces, discovery and enrolled MCP calls. The model is not given arbitrary shell, filesystem or credential access.

Implementation clears prior test and audit gates. New test/audit/verification requests invalidate the previous corresponding verdict. A failed verdict cannot approve delivery. Deployment requires passing test and external audit receipts for the exact current revision; post-deployment verification is separate. Missing or uncertain external outcomes block automatic replay.

## Skills and optional integrations

Skills available to the authoring assistant, including documentation consolidation and security-audit guidance, are not automatically installed into TriX. This release has no general executable skill registry or admission runner. Third-party packages such as Ghidra, SkillSpector, NemoClaw/OpenShell, AFOA and inference toolkits remain separately scoped integration candidates unless actual TriX source, permissions and qualification evidence are supplied. Other projects’ archives or conversations do not establish a TriX installation.

The wider Global Coordinator / project orchestration / independently controlled Global Auditor programme remains a design dependency. The current project auditor is a model role able to request external reports; she is not a separately credentialed Global Auditor. No independent audit certification is claimed.

## Acceptance boundary

Deterministic tests exercise real local calculations and simulated model/MCP dispatch. Live provider reasoning, destination changes, independent audit provenance, native IDE integration, a general agent CLI, inbound MCP and general external execution require their own adapters and evidence. Supabase persistence and bounded scheduled CPU execution have real hosted evidence in the [Supabase runtime record](supabase-runtime.md). The current CLI runs only the bounded CPU reference.

Do not treat a generated artifact, a passing schema, a role definition, an authored skill or a deployment API acknowledgement as proof of completed end-to-end project implementation.
