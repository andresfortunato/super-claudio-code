# Implementation Log — Hook Registration

<!-- Append-only. Record decisions, direction changes, dead code rationale. -->

## 2026-05-07 — Phase 1: dropped `displayName`, `postInstall`, `skills` from plugin.json

**Plan said**: bump version, optionally drop `skills:` array.

**Reality**: `claude plugin validate` rejected the manifest with "Unrecognized keys: displayName, postInstall". Both keys were silently ignored by Claude Code — they did nothing. `postInstall: "node install.js"` was never being executed by the plugin loader, and `install.js` is not wired to any npm `postinstall` script in package.json either, so it has been dead code since the framework was created.

**Action**: Dropped all three keys. Final plugin.json is `name`, `description`, `version`, `author` only — matches the canonical official-plugin shape (claude-code-setup, mcp-server-dev, claude-md-management, playground, example-plugin all use this exact set; none ship `skills:`/`displayName`/`postInstall`).

**Implication for cleanup agent**: `install.js` is dead — should be removed at plan completion.
