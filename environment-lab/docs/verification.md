> Historical record: applies to its stated release. Use the [current documentation index](README.md) for application 0.5.0, capabilities and verification limits.

# TriX Environment Lab 0.2.0 verification

Date: 22 October 2026. Standard: proposed TriX 0.2. Rule set: 2026-10-22.2.

## Executed deterministic checks

- `npm run check`: **100 tests passed; zero failures, skips or cancellations** at the recorded pre-release run. This retains the 32 configurator tests and six existing local-command tests and adds 62 increment cases.
- The original **9,240-combination** ISA/OS/device/backend sweep remains a robustness/rejection exercise, not an independent support oracle or physical qualification.
- The three JSON Schema contracts passed the independent Python `jsonschema` Draft 2020-12 meta-schema validator and positive fixtures. An inherited backend was independently rejected by the environment schema.
- Python PyYAML independently parsed the generated v2 YAML and checked its schema and execution groups.
- The Node CLI tests exercised real local CPU computation, temporary-file checkpoints, completed-result reuse, different-plan refusal, tampered-result refusal and effect rejection before state creation.

## Browser acceptance

The managed preview exercised visible controls, not direct application-state mutations:

| Flow | Evidence |
| --- | --- |
| Pure CPU example | Verify and Run produced SUCCEEDED, ordered task trace and numeric result 50. |
| Unregistered `network.fetch` | REJECTED before execution; empty trace and OPERATION_UNKNOWN. |
| CUDA with Apple GPU/macOS | CUDA_TARGET displayed and generation disabled. |
| Correct CUDA to MLX | Generation enabled again. |
| 120-character group name | Generated, valid reimport accepted, then reload retained all 120 characters. |
| Inherited backend import | `constructor` rejected with “Unknown target or backend”; current environment retained. |
| JSON download | Browser download completed and returned a download artifact path. |
| YAML | Content rendered; independent parsing passed. Subsequent browser download notification timed out. |

Additional merged-source browser acceptance and any remaining limits are recorded in the release notes below before publication. No physical accelerator, model, distributed fault-recovery, power-loss durability or production security qualification was executed.

## Scope of claims

The pure CPU result is actual execution of the documented experimental subset. Browser tests and Node tests do not qualify hardware profiles, a complete source language, native model engines or a production authorization system. The existing Agent workspace remains a proposed design and deterministic local commands remain a bounded tool, with no LLM connected.

## Merged-source release checks

- The final increment suite contains **102 passing tests**, including the experimental ReferencePlanBuilder SDK and independent execution oracles.
- Browser workflow editing created two stages, rejected a cycle (TASK_CYCLE), rejected an input/output contract mismatch (TASK_CONTRACT), and re-enabled generation after correction.
- The backend matrix displayed a CUDA candidate as locally CONDITIONAL and the complete mixed tensor scenario as BLOCKED.
- The retained local-command flow prepared `profile cpu`, applied it, displayed the CPU environment and retained Undo. Dark theme remained active.
- Binding-manifest output identified `trix.implementation-binding/v0.1`; qualification output remained `not-run`.
- Markdown content rendered correctly. Programmatic clipboard contents were not independently confirmed in the managed HTTP preview; no clipboard pass is claimed.
- JSON download completed before the export control was converted into a direct downloadable link. The final direct link uses the exact cached preview content. YAML download notifications remained unconfirmed through both the direct link and the browser's dedicated download action. This is a verification limitation, not evidence of a successful download. No final Markdown download confirmation is claimed.
- Visual inspection covered the merged desktop interface, including dark theme. A dedicated mobile device, screen reader and complete accessibility campaign were not executed.
