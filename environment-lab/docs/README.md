# TriX documentation index

Document TRIX-DOC-001 · Application 0.6.0 · 23 October 2026 · Current implementation record.

TriX has two related scopes: a proposed portable language and execution-contract programme, and an experimental application that implements part of that programme. The application's version is **0.6.0**; its planning engine is **0.2.0**, with environment schema **v2** and proposed standard revision **0.2**. These numbers are not interchangeable.

## Read in this order

| Document | Authority and purpose |
| --- | --- |
| [Product and user guide](product-guide.md) | Current purpose, capabilities, screen explanations, journeys and terminology |
| [Implementation baseline](implementation-baseline.md) | Current architecture, data boundaries, requirements, decisions, open gaps and acceptance mapping |
| [Live activation status](activation-status.md) | Observed connections, real MCP/Windows checks and prerequisites still missing |
| [Runtime and activation](orchestrator-runtime.md) | Model/MCP setup, specialist enforcement, provider receipts, limits and recovery |
| [Supabase runtime](supabase-runtime.md) | Persistence, RLS, private files, queues, scheduling, setup and recovery |
| [Release audit](release-audit-v0.6.0.md) | Findings, fixes, evidence and remaining verification limits for this release |
| [Version tracker](../version.json) | Machine-readable release identity and evidence paths |
| [Change log](../CHANGELOG.md) | Changes between application releases |

The source is authoritative for actual behaviour. Tests establish only their recorded cases. The current implementation baseline describes that behaviour; it does not adopt or rewrite the complete proposed language standard. Current explicit user decisions control scope. Any conflict with an adopted normative requirement must be recorded before claiming conformance.

## Source and proposal hierarchy

| Source | Status and treatment |
| --- | --- |
| User requests: conversational orchestration, scoped specialists, contextual panels, English product/docs, private hosting, output implementation and this review | Accepted product direction; current task also authorizes the GitHub synchronization and version tracker |
| [Design and Implementation Standard 0.2](https://github.com/MFSCV/TriX/blob/3b516c2b35bb2dba04aadeef58609d74da861f04/docs/TriX_Design_and_Implementation_Standard_v0_2.md) | Proposed normative baseline, preserved; complete language/runtime conformance is not established |
| [MCP and Connection Requirements 0.2](https://github.com/MFSCV/TriX/blob/3b516c2b35bb2dba04aadeef58609d74da861f04/docs/TriX_MCP_and_Connection_Requirements_v0.2.md) | Broader integration proposal, preserved. Its target protocol is not the same as the implemented 2025-11-25 adapter |
| Library: End-to-End Agent Conversion Plan 0.1 | Proposed programme; complete CLI/IDE, local worker, inbound MCP and qualification gates remain open |
| Library: Agentic UI/UX Transformation Plan 0.1 and implementation pack | Historical design proposal. The later explicit chatbot-first request supersedes the persistent dashboard/workbench layout |
| Repository `preimplementation/` | Preserved versioned specification pack and historical evidence. Its validators establish that pack's conditions, not this application's release status |
| Repository `history/` | Archived authoring material and original-language editions; not current implementer instructions |

The original PDF/DOCX editions, archives and their historical hashes remain unchanged. This index and the current baseline resolve their applicability without silently altering a versioned standard or invalidating its companion package. [Source inventory](source-inventory.json) records reviewed sources and scope.

## Historical application records

- [0.2 implementation increment](implementation-increment-v0.2.md) and [verification](verification.md): retained domain/reference evidence.
- [0.3 task workspace](agentic-ui-implementation.md) and [verification](verification-ui-v0.3.md): previous dashboard/workbench, retained for history.
- [0.5 release audit](release-audit-v0.5.0.md): historical initial conversational release and its original evidence.
- [0.4 verification](verification-ui-v0.4.md): first conversational runtime increment.
- [Agent integration](agent-integration.md): current integration boundary, with earlier statements superseded explicitly.

Historical test counts and missing-feature statements describe their recorded revision. They must not be quoted as the current application's status.
