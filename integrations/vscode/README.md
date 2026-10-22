# TriX native VS Code workflow

Open this directory in VS Code and launch its Extension Development Host. Set user-level `trix.cliPath` to the reviewed absolute `runtime/bin/trix.mjs`, `trix.nodePath` to Node.js 24+, and `trix.projectId` to a previously bound project. Workspace settings cannot change the executable. Bind the project through the CLI first.

Commands inspect the selected binding, create plans from selected text/documents, inspect/cancel shared tasks and show a read-only verified-output diff. Handler-level workspace trust, exact real-root selection, buffer version/hash checks and task/project checks enforce context. No editor buffer is overwritten. Remote hosts require Node/CLI in the actual extension host; web/virtual workspaces are unsupported. No extension Marketplace publication or real editor-host compatibility qualification occurred; bridge tests use labelled fixtures.
