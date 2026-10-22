# TriX configuration and plan language server

Run `node integrations/lsp/server.mjs` through an LSP client using standard Content-Length stdio framing. It implements full-document synchronization, JSON diagnostics, and shared semantic validation for `trix.plan/v1`. Only implemented capabilities are advertised. No source grammar, formatter, completion, debugger, command execution, network access or agent authority is implied. Use the CLI/API/MCP/ACP for agent work. Protocol tests do not establish universal editor compatibility.
