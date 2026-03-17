# Super Claudio Code

A Claude Code efficiency framework — structured planning, context management, session orchestration, and automated learning.

Super Claudio Code makes Claude Code sessions more efficient by providing two automation layers that work together: a **CLI** for scaffolding and **skills** for orchestration.

## Installation

Install the framework globally (once):

```bash
npm install -g github:andresfortunato/super-claudio-code
```

This gives you the `scc` CLI globally. Then, in each project:

```bash
scc init
```

This scaffolds project directories (`.claude/status/`, `.claude/learnings/`, `plan/`, `archive/`, `brainstorms/`) and installs skills to `~/.claude/commands/`. Idempotent — safe to run again.

Verify:

```bash
scc status
```

> **Note:** Once published to npm, install simplifies to `npm install -g super-claudio-code`.

## Architecture

```
CLI (automation)  →  Skills (orchestration)
━━━━━━━━━━━━━━━━     ━━━━━━━━━━━━━━━━━━━━━
scc init              brainstorming
scc plan init         planning
scc status            implementation
scc learning list     agent-teams
                      tdd
```

**CLI** handles all scaffolding and file operations — zero tokens spent on directory creation.

**Skills** contain judgment and orchestration — when to plan, how to implement, when to escalate.

## CLI Commands

### `scc init`

Scaffolds project directories for the framework:
```
.claude/status/           — project and plan status (shared state)
.claude/learnings/        — institutional knowledge across sessions
plan/                     — active plan directories
archive/                  — completed plan archives
brainstorms/              — brainstorming session outputs
```
All directories are automatically cleaned up once implementation completes.

### `scc plan init <name>`

This command is automatically executed by Claude Code when starting a planning process. It creates a new plan directory structure:

```
plan/plan-<name>/
├── plan.md               — goal, constraints, decisions, file manifest
├── handoff.md             — session handoff (overwritten each session)
├── log.md                 — implementation journal (append-only)
├── phases/                — per-phase plan files
└── context/               — decision-enabling codebase summaries
```

Also creates `.claude/status/plan-<name>.md` for cross-skill status tracking.

### `scc status`

Shows project identity and all active plan statuses.

### `scc learning list`

Lists all stored learnings with their metadata (title, severity, date, tags).

## Skills

Skills are `.md` files that guide Claude's behavior for specific workflows. They load on demand — only when triggered by the conversation context.

### Brainstorming

Collaborative exploration before planning. Claude listens early, challenges mid-conversation, and proposes alternatives late. Outputs structured decision summaries that feed into the planning skill.

### Planning

Writes implementation plans at the right level of detail — intent and constraints, not code snippets. Plans use a multi-file structure (plan.md + phases/ + context/) designed for selective loading across sessions.

### Implementation

Executes plans across sessions. Phase-level execution with verification at each checkpoint. Manages context budget (60% rule), handoff writing, escalation when reality diverges from the plan.

### Agent Teams

Orchestrates parallel work with independent Claude instances. Handles file ownership, worktree isolation for experiments, quality gates, and output consolidation.

### TDD

Canon test-driven development (https://tidyfirst.substack.com/p/canon-tdd). Behavioral test lists during planning, RED-GREEN-REFACTOR cycles during execution. Separate skill — used alongside implementation when the plan calls for it.

## Hooks (experimental, disabled by default)

The `hooks/` directory contains lifecycle automation scripts that can be individually enabled in a project's `.claude/settings.json`. They are **not installed automatically** — enable them one at a time to test.

| Hook | Event | What it does |
|------|-------|-------------|
| `session-start.js` | SessionStart | Injects project status + active plan statuses into session context |
| `user-prompt-submit.js` | UserPromptSubmit | Matches prompt against learning triggers, injects relevant learnings |
| `context-monitor.js` | PostToolUse | Warns at 65% and 75% context usage |
| `stop.js` | Stop | Enforces handoff writing, detects plan completion, prompts for learning capture |
| `pre-compact.js` | PreCompact | Reminds to write handoff before auto-compaction |
| `task-completed.js` | TaskCompleted | Auto-commits with `Complete: [description]`, updates status timestamps |
| `teammate-idle.js` | TeammateIdle | Blocks on merge conflicts or syntax errors in modified files |

To enable a hook, add it to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "node /path/to/super-claudio-code/hooks/session-start.js",
          "timeout": 5
        }]
      }
    ]
  }
}
```

## Learning System

Institutional knowledge that persists across sessions and plans.

**Storage**: Individual markdown files in `.claude/learnings/` with YAML frontmatter. A lightweight `index.yaml` maps each learning to trigger keywords.

**Capture**: Manual or prompted during sessions. Format template at `.claude/learnings/config/learnings-config.md`.

**Browse**: `scc learning list` shows all learnings with metadata.

## Plan Lifecycle

```
brainstorm  →  plan  →  implement  →  complete  →  archive
                ↑                         |
                └── handoff (per session) ─┘
```

1. **Brainstorm**: Explore approaches, make decisions
2. **Plan**: Planning skill runs `scc plan init <name>`, then writes plan.md with decisions, constraints, file manifest
3. **Implement**: Execute phase by phase, verify at each checkpoint, write handoffs between sessions
4. **Complete**: Mark plan as done
5. **Archive**: Synthesize archive entry, clean up plan directory

## File Layout

```
.claude/
  status/
    project.md                  — project identity + active plans
    plan-<name>.md              — per-plan status (phase, task, blocked)
  learnings/
    index.yaml                  — trigger keyword index
    config/learnings-config.md  — learning file format template
    <topic>.md                  — individual learnings

plan/
  plan-<name>/
    plan.md                     — implementation plan
    handoff.md                  — latest session handoff
    log.md                      — implementation journal
    phases/                     — per-phase plan files
    context/                    — codebase summaries

archive/
  index.md                      — summary of all archived plans
  plan-<name>.md                — archived plan entry

brainstorms/
  <topic>.md                    — brainstorming session outputs
```

## Design Principles

- **CLI handles scaffolding, skills handle judgment** — each layer does what it's best at
- **Intent over implementation** — plans describe what and why, not how
- **Constraints over instructions** — what NOT to do prevents more mistakes than what to do
- **Context is the scarcest resource** — every design decision optimizes for the 200K token budget
- **Exception-based escalation** — only surface issues that affect plan direction, handle details inline
- **Handoff over one more task** — a good handoff saves the next session 15-30% of its context

## License

MIT
