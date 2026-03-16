# Evolutionary Development Framework — Implementation Plan

## Goal

Build a Claude Code efficiency framework (npm package + plugin) with three layers: a Node.js CLI for automation, skills for orchestration, and hooks for lifecycle management. The framework makes Claude Code sessions more efficient through structured planning, context management, multi-session orchestration, parallel execution, and automated learning.

## Constraints

- **No token waste**: CLI handles all scaffolding and file operations. Skills contain only judgment and orchestration. Hooks contain only lifecycle automation.
- **Skills don't create directories**: The CLI scaffolds; skills write content into existing structure.
- **Skills don't implement hooks**: Hooks are configured during framework installation, not per-invocation.
- **No code snippets in plans**: This plan follows its own principles — intent + constraints, not implementation details.
- **Node.js for CLI**: Matches Claude Code's ecosystem (hooks run JS), enables JSON manipulation, npm distribution.
- **npm + plugin marketplace**: Distribution via npm install + Claude Code plugin marketplace registration.

## Decisions Made

1. **Three-layer architecture**: CLI (automation) → skills (orchestration) → hooks (lifecycle). Each layer does what it's best at. (Session 2)
2. **Multi-file plan structure**: plan.md + phases/ + context/ + handoff.md + log.md. Not single-file. Enables selective context loading per session. (Session 1)
3. **Planning and execution are separate skills**: "Continue the plan" means editing the plan. "Implement" means executing it. (Session 1)
4. **Agent teams for parallelization**: Not subagents. Each teammate gets full context window. tmux mode by default. (Session 3)
5. **Exception-based escalation**: No scheduled checkpoints. Escalate only when something affects plan direction. Severity filter: direction vs details. (Session 3)
6. **Phase-level execution loops**: Not task-level. Read files once at phase start, lightweight checkpoints per task. (Session 3)
7. **`.completed` marker file for archival trigger**: Skill writes marker, Stop hook detects it, launches archivist + cleanup agent team (Haiku, parallel). (Session 3)
8. **Auto-commit via TaskCompleted hook**: Template message from task subject. For PR-quality messages, user invokes `/commit` manually. (Session 3)
9. **Learning capture via Stop hook**: Fires before session ends, prompts for learnings if session was significant. (Session 3)
10. **Hybrid learning retrieval**: Push via UserPromptSubmit hook (grep index.yaml per message) + pull via agent on-demand. (Session 2)
11. **Context monitoring**: Both hook warnings (65%/75%) and skill text rule (stop at 60%). User will battle test both. (Session 3)
12. **TDD is a separate skill**: Not part of this framework. Add reference pointer only. (Session 3)
13. **Plan directory scaffolding**: CLI command `durin plan init [name]` runs as first step when planning skill loads. (Session 3)
14. **Brainstorming is a separate skill**: Brainstorming produces decisions; planning produces plans. Brainstorming precedes planning but can also be standalone (exploratory). (Session 3)
15. **Mayeutic brainstorming model**: User guides the conversation, Claude reacts — listening early, challenging mid, proposing alternatives late. Claude's questions are reactive (gaps, contradictions), not directive (checklists). (Session 3)

## File Manifest

### CLI (`src/`)
- `src/cli.js` — entry point, command router
- `src/commands/init.js` — `durin init`: scaffold project directories (includes `brainstorms/`)
- `src/commands/plan-init.js` — `durin plan init [name]`: scaffold plan directory
- `src/commands/status.js` — `durin status`: aggregate plan status
- `package.json` — npm package config, bin entry

### Hook Scripts (`hooks/`)
- `hooks/hooks.json` — Claude Code hook configuration (all events)
- `hooks/session-start.js` — inject status/project.md + active plan status
- `hooks/user-prompt-submit.js` — grep index.yaml, inject matched learnings
- `hooks/task-completed.js` — auto-commit with template message, update status
- `hooks/stop.js` — enforce handoff, detect .completed marker → launch archivist + cleanup
- `hooks/pre-compact.js` — force handoff write before compaction
- `hooks/teammate-idle.js` — quality gate enforcement for agent teams
- `hooks/context-monitor.js` — warn at 65%/75% context usage (PostToolUse)
- `hooks/agents/archivist.md` — prompt file for archivist subagent (plan archival + cleanup)
- `hooks/agents/cleanup.md` — prompt file for cleanup subagent (dead code removal)

### Skills (`skills/`) — already drafted, need finalization
- `skills/brainstorming/SKILL.md` — draft complete: mayeutic model, temporal phases, research on-demand, dual output
- `skills/planning/SKILL.md` — update: reference `durin plan init`, add brainstorming handoff consumption
- `skills/planning/references/multi-session.md` — updated this session
- `skills/implementation/SKILL.md` — update: ensure all hook references are correct
- `skills/implementation/references/escalation-reference.md` — complete
- `skills/agent-teams/SKILL.md` — update: ensure hook references match hooks.json
- `skills/tdd/SKILL.md` — canon TDD (Kent Beck): behavioral test lists during planning, RED-GREEN-REFACTOR during execution

### Framework Config
- `.claude-plugin/plugin.json` — plugin marketplace metadata
- `install.js` — post-install script: copies hooks, registers skills

### Config
- `.claude/learnings/config/learnings-config.md` — learning file template + index.yaml entry format

## Repo Context

This is a greenfield project — the repo currently contains research documents, planning notes, and three draft skill files. No existing code to integrate with. The CLI, hooks, and installation scripts are all new.

The framework will be distributed as an npm package that installs as a Claude Code plugin. Users run `npx durin` (or similar) to install, which copies hooks to `.claude/hooks/`, registers skills, and sets up the project structure.

## Phases

### Phase 1: CLI Tool
Build the Node.js CLI with `init` and `plan init` commands. These are the foundation — skills reference them.
- **Intent**: Scaffolding automation that skills depend on
- **Files**: `src/cli.js`, `src/commands/init.js`, `src/commands/plan-init.js`, `src/commands/status.js`, `package.json`
- **Verification**: `durin init` creates correct directory structure. `durin plan init test-plan` creates plan scaffold. `durin status` reads status files.
- **Estimated context**: ~40%

### Phase 2: Hook Scripts
Build all hook scripts. These are the lifecycle layer that skills reference.
- **Intent**: Automatic behavior (commits, injections, warnings, triggers) that runs outside session context
- **Files**: `hooks/hooks.json`, all `hooks/*.js` files
- **Verification**: Each hook fires on its event and produces correct output. SessionStart injects status. TaskCompleted auto-commits. Stop detects .completed marker.
- **Estimated context**: ~50% (many scripts, each small but needs testing)
- **Dependencies**: Phase 1 (hooks reference CLI-created file paths)

### Phase 3: Skill Finalization
Update all four skills to reference CLI commands and hooks correctly. Remove any lingering creation instructions or hook implementation details. Ensure all skills consistently read/write status files the same way — same paths, same format, same conventions. Status files are cross-skill shared state (like gstack's TODOS.md pattern).
- **Intent**: Skills match the built infrastructure — no orphan references, consistent status I/O across all skills
- **Files**: All `skills/**/SKILL.md` and reference files
- **Verification**: Each skill reads cleanly with no references to non-existent CLI commands or hooks. Grep all skills for status file paths — they must all use identical paths and formats.
- **Estimated context**: ~30%
- **Dependencies**: Phases 1 and 2

### Phase 4: Learning System
Build the learning capture, storage, and retrieval pipeline.
- **Intent**: Institutional knowledge that persists across sessions and plans
- **Files**: `hooks/user-prompt-submit.js` (retrieval), `hooks/stop.js` (capture trigger), `templates/learning.md`, CLI additions for `durin learning list`
- **Verification**: Learning written → appears in index.yaml → injected on matching prompt
- **Estimated context**: ~40%
- **Dependencies**: Phase 2 (hooks infrastructure)

### Phase 5: Installation and Distribution
Package as npm module with plugin marketplace registration. Build install script.
- **Intent**: Users can install with one command and the framework works
- **Files**: `package.json` (finalize), `.claude-plugin/plugin.json`, `install.js`
- **Verification**: Fresh `npx` install creates correct structure, skills trigger, hooks fire
- **Estimated context**: ~35%
- **Dependencies**: All previous phases

### Phase 6: Archivist and Cleanup Agents
Build the agent definitions and hook integration for plan completion automation.
- **Intent**: Automatic archival and dead code cleanup when plans complete
- **Files**: Agent definition files, Stop hook integration, archive/ directory management
- **Verification**: `.completed` marker → archivist creates archive entry → cleanup agent removes dead code → plan directory cleaned up
- **Estimated context**: ~35%
- **Dependencies**: Phases 2 and 5

### Future: SKILL.md.tmpl Codegen (deferred)
Auto-generate skill docs from templates + source code metadata (gstack pattern). Prevents drift between skills and CLI/hook implementations. Not urgent with 4 skills — becomes valuable when multiple contributors or frequent command changes make manual sync error-prone.
- **Intent**: Skills can never reference stale CLI commands or hook names
- **Dependencies**: Stable CLI and hook interfaces (post Phase 5)
