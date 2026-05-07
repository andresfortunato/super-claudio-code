# Hook Registration — Implementation Plan

## Goal

Restore automatic hook registration for `super-claudio-code` in a way that works across machines and other users, without re-introducing any of the four root causes that killed the prior `mergeHooksIntoSettings` implementation in commit ee2a7e0. The mechanism is the official Claude Code plugin path: declare hooks in `hooks/hooks.json` with `${CLAUDE_PLUGIN_ROOT}`-relative commands and let Claude Code wire them up automatically when the user installs the plugin via a marketplace. `scc init` stays out of `~/.claude/settings.json` entirely.

## Constraints

- **Don't restore the old `mergeHooksIntoSettings` function** in any form. The four root causes (stale script refs, name-pinned matcher, absolute paths in committed files, bulk all-or-nothing install) all return if we do.
- **Don't write absolute paths into `~/.claude/settings.json`** from any code in this repo. Path resolution must be runtime-deferred to Claude Code's `${CLAUDE_PLUGIN_ROOT}`.
- **Don't reference scripts in `hooks.json` that don't exist** in the repo — registration must be coupled to the actual file set, not aspirational.
- **Don't break the existing npm-only install path.** Users who run only `npm install -g github:andresfortunato/super-claudio-code` and never touch the plugin marketplace must keep getting the `scc` CLI and project scaffolding. Hooks won't fire for them — that's the documented trade-off.
- **Don't introduce a settings-mutation step on uninstall.** Disabling a hook must not require editing `~/.claude/settings.json` either.
- **Don't ship the `scc` CLI inside the plugin.** Plugins don't put binaries on `$PATH`; `scc plan init` is invoked from the planning skill and needs `$PATH` resolution. CLI stays in npm.

## Decisions Made

1. **Distribution: dual path, plugin owns hooks/skills/agents auto-wiring; npm owns the CLI.**
   - Plugin via `/plugin marketplace add github:andresfortunato/super-claudio-code` then `/plugin install`. Gives `${CLAUDE_PLUGIN_ROOT}`-resolved hooks, auto-loaded skills/agents, and survives the framework being moved or renamed.
   - npm via `npm install -g github:andresfortunato/super-claudio-code`. Gives the `scc` binary on `$PATH` so the planning skill's `scc plan init` works.
   - The two paths overlap on skills/agents content; documentation tells users to pick one OR install both knowing skills will be defined twice (Claude Code dedupes by skill name in practice — verify in Phase 1).

2. **Hook registration lives in `hooks/hooks.json`, not in `plugin.json`'s inline hooks key.**
   - Empirically, every hook-using plugin installed on this laptop (hookify, ralph-loop, learning-output-style, security-guidance) uses the separate-file convention. `plugin.json` stays minimal metadata.
   - Claude Code auto-discovers `hooks/hooks.json` at the plugin root.

3. **Path references use `${CLAUDE_PLUGIN_ROOT}` exclusively.**
   - Form: `"command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/<script>.js"`.
   - This is set by Claude Code at hook execution time and resolves to the plugin install path (`~/.claude/plugins/cache/super-claudio-code/<version>/...`). No matcher-by-substring tricks needed for repair.

4. **Per-hook opt-out is an env-var gate inside each script, not a settings.json edit.**
   - Each of the three hook scripts checks `SCC_DISABLED_HOOKS` (comma-separated list of hook names like `stop,pre-compact`) at the very top and exits 0 if its name appears.
   - Borrowed from everything-claude-code's `ECC_DISABLED_HOOKS` pattern. Reason: turning a hook off requires zero file mutation — set the env var, restart the session, done. Aligns with constraint of never mutating settings.json.

5. **Self-marketplace, not submission to `claude-plugins-official`.**
   - This repo carries its own `.claude-plugin/marketplace.json` declaring a single plugin. Users add the marketplace once with the GitHub URL.
   - Submitting to the official marketplace adds a maintainer-review dependency and version-pin coupling we don't want for a personal framework. Self-marketplace keeps iteration fast.

6. **Three hooks register: `user-prompt-submit.js`, `stop.js`, `pre-compact.js`.** `session-start.js` was deleted in commit `fa0fd30`. No stale entries.

7. **`scc init` does not change as part of this plan.** It keeps doing project-local scaffolding (.scc/, plan/, archive/, brainstorms/, CLAUDE.md @import) and skill/agent symlinking. The skill/agent symlinks are redundant when the plugin is installed but harmless — Claude Code dedupes. We document this; we don't engineer around it in this plan.

## File Manifest

- `.claude-plugin/plugin.json` — **modify**: bump version to `0.2.0`. Keep metadata-only (no inline hooks). Optionally remove the `skills:` array since Claude Code discovers skills by directory convention; verify against installed-plugin examples first.
- `.claude-plugin/marketplace.json` — **create**: declare a single-plugin marketplace pointing at this repo. Schema mirrors `claude-plugins-official/marketplace.json` (owner block, `plugins[]` with `source.source: "github"` or `"relative-path"`).
- `hooks/hooks.json` — **modify**: replace empty `{ "hooks": {} }` with three entries (UserPromptSubmit, Stop, PreCompact) using `${CLAUDE_PLUGIN_ROOT}` paths and matcher `""`. Reference the layout used by hookify's `hooks/hooks.json` already on disk for the canonical shape.
- `hooks/user-prompt-submit.js` — **modify**: prepend `SCC_DISABLED_HOOKS` opt-out gate. Hook name to match against: `user-prompt-submit`.
- `hooks/stop.js` — **modify**: prepend opt-out gate. Hook name: `stop`.
- `hooks/pre-compact.js` — **modify**: prepend opt-out gate. Hook name: `pre-compact`.
- `README.md` — **modify**: rewrite the Hooks section. Primary install path = plugin marketplace flow. Secondary fallback = the existing manual settings.json snippet (kept for users who can't or won't use plugins). Add a short "which install do I need?" callout (npm for CLI, plugin for hooks). Document `SCC_DISABLED_HOOKS`.

## Repo Context

**What's already in place:**

- `hooks/` directory contains three working hook scripts: `user-prompt-submit.js`, `stop.js`, `pre-compact.js`. All read JSON from stdin, are pure-Node (no deps), and tolerate missing input gracefully (`main().catch(() => process.exit(0))`). Stop hook uses `decision: 'block'` JSON output + `process.exit(2)` to gate session termination.
- `hooks/hooks.json` exists but is `{ "hooks": {} }` — was emptied in `ee2a7e0` ("disable all hooks"). The three hook scripts the file should reference are all present.
- `.claude-plugin/plugin.json` exists with name, displayName, version `0.1.0`, description, and a `skills:` array listing six skills by path. No `hooks` key.
- No `.claude-plugin/marketplace.json` exists.
- `~/.claude/settings.json` has no `hooks` key. Contains `enabledPlugins` for six other plugins but not super-claudio-code (this repo isn't yet installed as a plugin anywhere).
- `src/commands/init.js` does NOT register hooks (the merge logic was removed in `ee2a7e0`). It scaffolds `.scc/`, `plan/`, `archive/`, `brainstorms/`, creates `CLAUDE.md` with `@.scc/status/project.md` import, and symlinks skills + agents into `~/.claude/skills/` and `~/.claude/agents/`.

**Reference implementations to mimic:**

- `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/hookify/hooks/hooks.json` — canonical shape: `hooks` keyed by event name, each with `matcher` + `hooks[]` array, commands using `${CLAUDE_PLUGIN_ROOT}`. Read this file before writing ours.
- `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/hookify/.claude-plugin/plugin.json` — minimal metadata-only plugin manifest, three keys: `name`, `description`, `author`. No hooks reference.
- `~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json` — canonical marketplace shape with `$schema`, `name`, `description`, `owner`, `plugins[]`. Single-source-of-truth for marketplace.json schema.

**What NOT to mimic:**

- `everything-claude-code`'s 20+ hooks across 6 events. Three is the right number for now.
- `get-shit-done`'s npm-postinstall-mutates-settings approach. That's the model that broke us in `ee2a7e0`.
- The deleted `mergeHooksIntoSettings()` function in commit `ee2a7e0` — read it only to understand what NOT to do. It contained all four root-cause anti-patterns in one place.

## Phases

### Phase 1: Plugin manifest + hooks wiring (local-only verification)

- **Intent**: Get hooks firing via `${CLAUDE_PLUGIN_ROOT}` resolution when the framework is loaded as a plugin from this checkout. No marketplace yet — verify the mechanism works with `claude --plugin-dir` first, before publishing the install path.
- **Modifies**: `.claude-plugin/plugin.json` (version bump + optional skills-array review), `hooks/hooks.json` (three entries), `hooks/user-prompt-submit.js`, `hooks/stop.js`, `hooks/pre-compact.js` (opt-out gate prepended).
- **Verification**:
  1. From a fresh terminal: `claude --plugin-dir /Users/anf191/github/super-claudio-code` opens a session in this repo. The session reports super-claudio-code as a loaded plugin.
  2. UserPromptSubmit fires: in a project with at least one entry in `.scc/learnings/index.yaml` whose triggers match a test prompt, submitting that prompt produces the "Relevant Learnings" injection (visible in transcript or from a `/transcript` inspection).
  3. Stop fires: drop a `.completed` marker in `plan/plan-test/`, ask the assistant a question, observe that the stop hook blocks once with the archivist+cleanup instruction. Confirm `.archival-triggered` sentinel appears.
  4. PreCompact fires: trigger a manual `/compact` and observe the reminder message in the transcript.
  5. Opt-out works: `SCC_DISABLED_HOOKS=stop claude --plugin-dir ...` — the stop hook does not block even with `.completed` present.
- **Estimated context**: ~15% (small file edits, mostly reading existing scripts and the hookify reference).

### Phase 2: Marketplace + docs (publishable install path)

- **Intent**: Make the plugin installable on a fresh machine via the standard `/plugin marketplace add` + `/plugin install` flow, and rewrite the README so the plugin path is the primary documented install. Only after Phase 1 has proven the hooks fire correctly under `${CLAUDE_PLUGIN_ROOT}` resolution.
- **Creates**: `.claude-plugin/marketplace.json`.
- **Modifies**: `README.md` (Hooks section + Installation section).
- **Verification**:
  1. Push the branch with marketplace.json + plugin manifest changes.
  2. From a *different* machine (or a fresh `~/.claude/plugins/` test directory), run `/plugin marketplace add github:andresfortunato/super-claudio-code` followed by `/plugin install super-claudio-code@super-claudio-code`. Plugin appears in `~/.claude/plugins/cache/super-claudio-code/<version>/`.
  3. New session in any project: hooks fire (repeat Phase 1 verification 2-4 in this fresh-install context).
  4. README walkthrough: a new reader following the README from cold can install the plugin, install the npm CLI, and see hooks firing without needing to inspect the source.
- **Estimated context**: ~20% (mostly README rewriting; marketplace.json is small).

## Open questions (decide during implementation, not now)

- **Skills array in plugin.json**: real plugins like hookify ship without a `skills:` array — Claude Code auto-discovers skills by directory. Worth confirming during Phase 1 by removing the array and checking skill loading still works. If it does, drop the array (less to maintain). If not, keep it.
- **Plugin reference name**: `/plugin install super-claudio-code@super-claudio-code` is awkward. The marketplace name and plugin name don't have to match — could be `scc@super-claudio-code` for shorter invocation. Settle in Phase 2 when writing marketplace.json.
- **`scc init` skip-symlink-when-plugin-installed**: detect presence of `~/.claude/plugins/cache/.../super-claudio-code` and skip the symlink step? Possible follow-up; not part of this plan unless symlink collisions cause user-visible breakage during verification.
