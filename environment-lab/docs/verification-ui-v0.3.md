> Historical record: applies to its stated release. Use the [current documentation index](README.md) for application 0.5.0, capabilities and verification limits.

# Task Workspace 0.3 verification

Date: 22 October 2026. Baseline: private Site source 6d835e27e2dd7398257d3cb6954f222205dd06de.

## Executed

- Syntax checks for app.js, workspace-ui.mjs, task-store.mjs and cpu-worker.mjs.
- 120 passing Node tests: 102 preserved domain/reference/CLI cases and 18 added task-workspace cases.
- New cases cover history round trip, stale proposals, manual-edit preservation, offline/remote refusal, immutable artifact digest, hostile/unsupported input, sequential stale-tab conflict, malformed-data recovery, quota failure, environment/comparison/theme preservation, running-task amendment refusal, independent state dimensions, scenario diffs, four SHA-256 native-oracle cases and portable task export.
- Browser goal-to-result path: Home suggestion; task creation; exact local scenario review; Apply; validated artifact; readable JSON and provenance; browser Download. The actual downloaded bytes were parsed and accepted by importConfig; v2 schema, offline policy and unqualified status were preserved.
- Browser CPU path: inspect editable pure plan, execute in dedicated Worker, receive three-operation trace and expected independent oracle result 50, store output artifact and checksum.
- Reload restored the task, messages, artifact versions and environment. No model or external executor was used.
- Light and Dark were inspected on desktop. Theme resolution and preference controls remain shared with System.
- Responsive iframe QA at 375 and 320 CSS-pixel inner viewports. The 320-pixel body width equalled its viewport width; no page-level horizontal overflow was observed. Mobile Home, artifact workbench, conversation switching and navigation opening were exercised.
- Closed mobile navigation was verified absent from the accessibility tree; opening it exposed the controls. Action search/filtering opened the capability view. Modal focus and keyboard workbench controls were inspected and corrected during QA.

The HTTP development preview lacked crypto.randomUUID and crypto.subtle. Local record IDs now have a non-credential fallback; SHA-256 fallback agrees with independent Node crypto vectors, including UTF-8 and multi-block input. Production HTTPS uses native WebCrypto when available.

## Limits

This is focused product QA, not a WCAG conformance audit or security certification. No representative usability study, assistive-technology test matrix, production performance benchmark, real model-provider test, enrolled hardware test, independent audit, destination write/deployment test or native IDE/MCP client interoperability test was executed.

The UI cancellation path terminates only the tab-owned pure CPU Worker. The existing reference executor's cancellation unit test passes; the tiny three-operation browser example completes too quickly to establish a broad interactive cancellation race matrix. No pause/resume guarantee is offered.

localStorage detects sequential stale writes but does not provide transactional simultaneous multi-tab writes. Remote durable state, grant enforcement and external-effect reconciliation remain server dependencies. Local history and hashes are not protected audit/authenticity evidence.

Private hosting publication is verified separately by the Sites deployment result. A local preview screenshot is not independent proof of production delivery or audience controls.
