# Super Claudio Code

This is my Claude Code workflow. It's a work in progress where I test different tools and ideas and document them. The workflow is focused on:

- Optimizing planning so that we increase plan quality and reduce the ratio of .md lines to code at the same time
- Context management so that we avoid context rot and codebase re-exploration
- Multi-session orchestration so that we don't worry about referencing files or summaries any more
- Automated learning to take notes of relevant challenges or solutions.

Super Claudio Code has two layers: a **CLI** for scaffolding and **skills** for orchestration.

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

### Learning Capture

Captures institutional knowledge as individual files in `.claude/learnings/`. Supports two learning types: **gotchas** (Problem/Solution/Prevention) for mistakes and counterintuitive behavior, and **insights** (Discovery/Why it matters/When to apply) for useful patterns and observations. Triggered by the pre-compact hook, user request, or when Claude notices something worth preserving.

## Hooks (experimental, disabled by default)

The `hooks/` directory contains lifecycle automation scripts that can be individually enabled in a project's `.claude/settings.json`. They are **not installed automatically** — enable them one at a time to test.

| Hook | Event | What it does |
|------|-------|-------------|
| `session-start.js` | SessionStart | Injects project status + active plan statuses into session context |
| `user-prompt-submit.js` | UserPromptSubmit | Matches prompt against learning triggers, injects relevant learnings |
| `stop.js` | Stop | Detects plan completion (.completed marker), triggers archival agents |
| `pre-compact.js` | PreCompact | Reminds to write handoff and capture learnings before compaction |
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

**Capture**: The pre-compact hook reminds you to capture learnings before context compaction. Otherwise voluntary — ask Claude or capture manually. Format template at `.claude/learnings/config/learnings-config.md`.

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


## License

MIT
