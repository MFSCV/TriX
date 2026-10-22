# TriX agent integration increment — 22 October 2026

## Implemented scope

This increment adds an English Agent workspace to the private configurator. Three deterministic local tools prepare profiles, validate compatibility and generate the existing planning envelope. The coordinator accepts a documented bounded command vocabulary. It does not call an LLM, execute code, install skills, inspect hardware or deploy workloads. Dialogue is session-memory only; applied scenarios use the existing browser-local persistence.

Profiles are proposals until explicitly applied. Every proposal is tied to its base scenario; changes invalidate stale proposals. Existing compatibility validation remains authoritative, including blocking offline/remote combinations and preserving unresolved qualification conditions. Previous scenarios can be restored through the existing Undo action.

## Skills verification

The current development assistant exposes consolidate-preproduction and security-audit. Neither is installed as an executable skill in this static Site. The checkout contains no skill runner, model provider, shell executor, MCP broker or security workflow. SkillSpector was located as a separate DrClick integration archive; its content and TriX integration were not inspected. Ghidra, NemoClaw/OpenShell, AFOA and TensorRT-RTX are prior-discussion adapter candidates, not verified dependencies of this checkout. Their upstream versions and operational claims were not revalidated in this increment. The UI registry records these distinctions and grants no execution authority.

## Proposed next runtime contract

General prompt/dialogue automation requires a server runtime. Preserve the separate TriX language boundary: dialogue produces a versioned typed task plan; semantic and capability validation precede execution. The prompt must never become an executable shell string.

Use a single active control authority. Route project work through a TriX project coordinator, with narrowly scoped planner, compatibility, compiler/build, test/benchmark, documentation and security agents. Parent-routed communication and a separate audit path must prevent agents granting themselves authority. This is a proposed runtime design, not implemented multi-agent execution.

Each task needs task_id, project_id, actor_id, input_revision, intent, plan_schema_version, steps, dependencies, tool/skill version and content digest, capabilities, resource scope, data policy, time/token/cost limits, cancellation token, retry/idempotency policy and evidence requirements. Server-owned policy must validate every tool call; model output and skill text are untrusted proposals. Keep secrets server-side as references. Do not expose an arbitrary connector or shell proxy.

Persist durable task transitions: received → clarifying → planned → authorized → running → succeeded/failed/cancelled. Resume must revalidate scenario revision and authorization. Retry read-only/idempotent work within declared limits; reconcile uncertain writes before retrying. Record actor, plan hash, tool inputs with secrets excluded, policy decision, result, timestamp and artifact digest. A browser transcript is not an immutable audit ledger.

Skill installation requires source provenance, license, pinned digest/version, declared tools/data/network needs, isolated validation, evaluation evidence and explicit activation policy. Registry states should distinguish discovered, inspected, validated, approved, active, quarantined and retired. Never promote state from a conversational claim or package existence.

## Acceptance and remaining gates

Executed: 38 Node tests including six new agent tests, syntax validation, and existing compatibility cross-product coverage. These establish deterministic planning behavior only. Browser evidence is recorded separately in verification.md.

Remaining: choose and authorize model/provider and credential path; implement authenticated server and scoped executor; connect actual skill packages; qualify sandbox and cancellation; test authorization, prompt injection, cross-project isolation, restart, retries and budget exhaustion; independently audit the runtime. No claim of autonomous end-to-end execution or completed security audit is made.
