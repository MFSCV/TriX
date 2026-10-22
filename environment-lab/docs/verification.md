# Configurator verification

Date: 22 October 2026. Product under test: TriX Environment Lab 0.1.0. Baseline: TriX Standard 0.2. Rule set: 2026-10-22.1.

## Deterministic engine checks

`npm test`: **32 tests passed, zero failed**. Includes all 11 presets, domain rejection cases, JSON re-import, English brief generation, YAML serialization, and 9,240 ISA × OS × device × backend combinations. The cross-product is a robustness and rejection exercise, not proof that any physical target executes a workload.

An independent Python YAML parser successfully parsed the generated YAML and checked the schema identifier, groups and proposed evidence status. JavaScript modules passed `node --check`.

## Browser acceptance

The managed browser exercised the application through its visible UI:

| Scenario | Observed result |
| --- | --- |
| Reference environment | Apple and NVIDIA groups shown, conditional status, generation enabled |
| Snapshot comparison | Two scenarios saved, dimensions compared, backend matrix shown |
| Restore snapshot | Original reference environment restored and revalidated |
| CUDA on Apple GPU/macOS | CUDA_TARGET displayed; generation disabled |
| Correct backend to MLX | Blocking condition removed; generation enabled |
| Remote provider + offline | REMOTE_POLICY displayed; generation disabled |
| Cross-vendor tensor parallelism | CROSS_VENDOR_JOINT displayed; generation disabled |
| Excess memory requirement | MEMORY_CAPACITY displayed immediately while typing; generation disabled |
| Dynamic groups | Third group added; removed back to two groups |
| Version input | Entered version retained in the field and planning state |
| JSON generation/download | JSON file downloaded and independently parsed; schema, backend, proposed status and zero blocking errors verified |
| Invalid import | Empty object rejected with a clear explanation |
| Valid JSON import | Exported scenario restored and revalidated |
| Browser reload | Scenario retained through localStorage |
| English brief | Implementation sequence and open qualification gates rendered in English |
| Copy | Copy confirmation displayed, including fallback in the HTTP preview |
| Private audience | Native Sites access state: owner only, no groups or external visitors |

## Corrections made during acceptance

1. Removed reliance on secure-context-only `crypto.randomUUID` in the HTTP preview; group identifiers have a non-security fallback. Group identifiers are not credentials.
2. Added immediate numeric/text input validation; compatibility now reflects typed values without requiring a blur event.
3. Added a clipboard fallback for browsers lacking the asynchronous Clipboard API.
4. Preserved expanded version sections across state renders and validated imported group identifiers to prevent HTML attribute injection.

## Verification limits

The primary JSON export/import flow passed in the browser. Subsequent YAML download notifications timed out in the managed preview browser, although YAML rendering and independent parsing passed. No browser download confirmation is claimed for YAML or Markdown. Their generated content is also available through the on-screen preview and copy action. Physical accelerator execution, numerical correctness, runtime security, distributed fault recovery and mobile lifecycle are not implemented or certified by this planning application.

The deployment result and exact source commit are recorded by native Sites version/deployment records. The private hosting operation enforces the owner-only audience.

## English UI and UX refresh — 22 October 2026

The complete interface, accessible names, import errors, validation explanations and notifications now use English. Navigation uses a dark workspace sidebar with larger controls and higher-contrast text. A four-step shortcut bar guides configuration. Profile replacement can be undone; blockers precede warnings. Numeric control bounds now match node-count constraints. Live group titles update while typing.

Validation: JavaScript syntax check passed; all 32 domain tests passed. Browser QA confirmed profile application, undo restoration, comparison snapshot/table, and JSON/YAML/Markdown plan views. Desktop layout visually inspected. Responsive CSS updated; mobile viewport behavior was not independently browser-tested. Existing owner-only access is preserved. No compiler, runtime or hardware qualification is implied.

## Theme selector and agent workspace design — 22 October 2026

Light, Dark and System preferences apply across all views, form controls, dialogs, tables, validation states, code exports and new agent panels. Choice persists in localStorage; System follows browser preference changes. Inline theme initialization limits a wrong-theme flash.

Agent workspace is an interactive design, not a connected LLM runtime. It captures a session-local prompt, offers example intents, creates a deterministic review brief using existing configuration validation, and exposes six proposed specialist role contracts. The orchestration and independent audit reporting paths are shown explicitly. No model requests or external execution occur.

Checks: JavaScript syntax and 32 existing domain tests passed. Browser checks confirmed dark selection persists after reload, switching to light, example-prompt capture, local brief preparation and specialist-detail selection. Desktop dark layout inspected visually. Mobile CSS is provided but not viewport-tested.


## Agent workspace increment — 22 October 2026

38/38 Node tests passed, including six new dialogue/coordinator tests. JavaScript syntax check passed. Internal managed browser preview verified Agent workspace navigation, profile cpu proposal, explicit apply, and generate response. General LLM reasoning, server execution, real skill invocation and hosted end-to-end runtime behavior remain unimplemented and untested.
