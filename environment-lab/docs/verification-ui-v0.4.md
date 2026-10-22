> Historical record: applies to its stated release. Use the [current documentation index](README.md) for application 0.5.0, capabilities and verification limits.

# Conversational UI and orchestration verification · 22 October 2026

## Observed

- `npm run check`: **131 tests passed**, syntax checks passed, single ESM Worker built and imported successfully. The artifact check verifies the existing Site identity, R2 binding and embedded landing page.
- Eleven new runtime tests cover the complete delegated implementation/test/audit/release/verification loop using simulated model and MCP responses; scope and target refusals; exact revision gates; passing versus failing audit verdicts; gate invalidation after changes; pre-dispatch checkpointing; uncertain effect blocking; stop before dispatch; identity/origin checks; step ownership; and real built-in validation, configuration and CPU behavior.
- Browser: the landing page is conversational, without the previous persistent dashboard or workbench. The working environment opens inside a contextual modal; its existing form and diagnostics remain usable.
- Browser: compatibility validation returned the real planning diagnostics; configuration generation produced an artifact; a browser download completion event was observed. The browser's returned download path was not available for filesystem inspection, so downloaded-file byte verification is not claimed.
- Browser: the dedicated CPU worker returned `SUCCEEDED`, three ordered operations and **50**. The execution evidence panel displayed that result.
- Browser: conversation, tool cards and results survived reload.
- Browser: specialist definitions and action scopes are accessible in a contextual modal, including at a 320-pixel content width. Layout inspected at approximately 375 and 320 pixels using same-origin test frames. Light and dark appearance and the collapsed history navigation were inspected.

## Not established by these checks

No live model call, real MCP server call, external code change, external test run, independent audit or external deployment of a target project was performed. The Site had no model or MCP environment configuration when inspected. The preview intentionally uses disposable persistence and no credentials. Runtime fixtures do not qualify these external integrations. No unattended executor is installed.

The published product must continue to show **Local tools** until model configuration is present. The external release loop is implemented but inactive until its provider, tools, target grants and receipt contracts are configured and verified.

## Hosting

The existing Site remains owner-private. Source assets moved from `dist/` to `public/`; `dist/` is now the generated Worker artifact. The source workflow packages and publishes the exact checked commit, preserving the Site ID and audience. Deployment identity and final status are retained by Sites.
