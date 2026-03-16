# Research: superpowers

*Source: github repo analysis via MCP*

---

Now I have a comprehensive picture of the repo. Let me compile the findings.

---

## Structured Research Findings: `obra/superpowers`

### DIMENSION 1: Automation Outside .md Files

#### 1.1 Hooks System (the primary automation mechanism)

**Location:** `hooks/` directory

The repo has exactly **one hook** that fires programmatically: a **SessionStart hook**.

**`hooks/hooks.json`** -- This is the Claude Code plugin hook configuration:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
            "async": false
          }
        ]
      }
    ]
  }
}
```

**`hooks/session-start`** -- A bash script that:
1. Reads the `using-superpowers/SKILL.md` file content
2. Escapes it for JSON embedding
3. Outputs it as `hookSpecificOutput.additionalContext` (for Claude Code) or `additional_context` (for Cursor)
4. This means every session starts with the "using-superpowers" skill automatically injected into context

**`hooks/run-hook.cmd`** -- A cross-platform polyglot (bash/cmd) wrapper that finds bash on Windows (Git Bash, MSYS2) and executes hook scripts.

**Key insight:** The automation is minimal and strategic. The only automated action is context injection at session start. There are no hooks for file creation, directory scaffolding, or template generation.

#### 1.2 Plugin System

**`.claude-plugin/plugin.json`** -- Standard plugin metadata (name, version, author). No scripts or build steps.

**`.claude-plugin/marketplace.json`** -- Marketplace registration. No automation.

#### 1.3 Scripts (within skills)

**`skills/brainstorming/scripts/`** contains:
- `server.js` -- A Node.js HTTP server for visual brainstorming (mockups in browser)
- `start-server.sh` -- Launches the server
- `stop-server.sh` -- Stops the server
- `helper.js` -- Utility functions
- `frame-template.html` -- HTML template

**`skills/writing-skills/render-graphs.js`** -- Renders Graphviz dot graphs in skill files to SVG.

These scripts are **invoked by Claude during execution**, not automatically. The .md skill file instructs Claude when to run them.

#### 1.4 Codex/OpenCode Integrations

**`.codex/`** -- Contains `INSTALL.md` for Codex setup (and historically a `superpowers-codex` Node.js script for skill discovery/loading).

**`.opencode/`** -- OpenCode plugin directory.

These are platform adapters, not automation for plan scaffolding.

#### 1.5 No Build/Package Automation

- **No `package.json`** at repo root
- **No `Makefile`**
- **No CI/CD** (`.github/` directory exists but contents not examined -- likely just GitHub metadata)
- **No template generators or scaffolding scripts**

#### 1.6 Answer to the Core Question: How Does the Plan Directory Structure Get Created?

**It is NOT scaffolded by a script.** The plan directory structure is created entirely through .md instructions. Specifically:

- The **brainstorming** skill tells Claude to save specs to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- The **writing-plans** skill tells Claude to save plans to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- Claude creates these directories and files as it works, following the .md instructions

Evidence: the repo contains actual plan and spec files at these paths:
- `docs/superpowers/specs/2026-01-22-document-review-system-design.md`
- `docs/superpowers/specs/2026-02-19-visual-brainstorming-refactor-design.md`
- `docs/superpowers/plans/2026-01-22-document-review-system.md`
- `docs/superpowers/plans/2026-02-19-visual-brainstorming-refactor.md`
- `docs/superpowers/plans/2026-03-11-zero-dep-brainstorm-server.md`

There is also a legacy `docs/plans/` directory with older plans that predate the current structure.

---

### DIMENSION 2: Planning and Execution Patterns

#### 2.1 Plan Structure

Superpowers uses a **single-file plan** model, not a multi-file directory structure. Each plan is one .md file stored at `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`.

**Required plan header:**
```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development ...

**Goal:** [One sentence]
**Architecture:** [2-3 sentences]
**Tech Stack:** [Key technologies]
---
```

**Task structure within the plan:**
- Tasks use `### Task N: [Component Name]` headings
- Steps use checkbox syntax (`- [ ]`) for progress tracking
- Each step is one action (2-5 minutes): write test, run test, implement, verify, commit
- Exact file paths, complete code snippets, exact commands with expected output
- Plans are chunked with `## Chunk N: <name>` headings, each under 1000 lines

#### 2.2 Multi-Session Execution

Superpowers handles multi-session execution through **two distinct approaches**:

**Approach A: Subagent-Driven Development (preferred)**
- Stays in the SAME session -- the controller dispatches fresh subagents per task
- Each subagent gets isolated context (no session history leakage)
- Two-stage review after each task: spec compliance, then code quality
- Controller extracts ALL tasks upfront and provides full task text to each subagent
- Progress tracked via TodoWrite (Claude Code's built-in task tracker)

**Approach B: Executing Plans (fallback)**
- For platforms WITHOUT subagent support
- Execute plan in current session with batch execution + human checkpoints
- Uses TodoWrite for tracking (mark in_progress, then completed)

Neither approach uses a separate handoff file or status file. They rely on:
- The plan file itself (with checkboxes)
- TodoWrite (Claude Code's built-in task tracking)
- Git commits as progress markers

#### 2.3 Context Management Across Sessions

Superpowers takes a **radical approach to context management**: it avoids cross-session state almost entirely.

- **SessionStart hook** injects the `using-superpowers` skill content at every session start -- this is the ONLY automated context restoration
- **Plan files are the persistent state** -- if a plan has checked-off boxes, a new session can read the file to see what was done
- **Git worktrees provide isolation** -- each feature gets its own worktree, so branch state encodes progress
- **No handoff.md, no status.md, no log.md** -- there are no dedicated cross-session tracking files
- **Subagent prompts are crafted per-dispatch** -- the controller constructs exactly what each subagent needs from the plan file, never passes session history

#### 2.4 Progress Tracking

Two mechanisms:

1. **Checkbox syntax in plan files** (`- [ ]` / `- [x]`) -- plan steps can be checked off
2. **TodoWrite** -- Claude Code's built-in task tracker, used during execution to mark tasks as in_progress/completed

The plan header explicitly directs agents to use checkbox syntax: "Steps use checkbox (`- [ ]`) syntax for tracking."

#### 2.5 Session Handoffs

There is **no explicit handoff mechanism**. The design philosophy is:
- Each subagent is dispatched with ALL the context it needs (full task text, not a file path to read)
- The controller stays in session and coordinates
- If a session ends, the plan file + git state + TodoWrite state are the recovery points
- A new session reads the plan file and resumes from unchecked boxes

#### 2.6 Skill Structure (SKILL.md files)

Each skill is a directory containing:
- **`SKILL.md`** -- the main skill file (REQUIRED), with YAML frontmatter (`name`, `description`) and markdown body
- **Supporting files** -- prompt templates, scripts, reference docs (optional)

Skill frontmatter format:
```yaml
---
name: skill-name
description: Use when [condition] - [what it does]
---
```

Skill body typically contains:
- Overview section with announcement instruction
- Checklist or process flow (often with Graphviz dot notation)
- Detailed step-by-step instructions
- Red Flags / Common Mistakes section
- Integration section (what skills call this, what this skill calls)

Examples of supporting files:
- `skills/subagent-driven-development/implementer-prompt.md` -- template for dispatching subagents
- `skills/subagent-driven-development/spec-reviewer-prompt.md` -- template for review subagents
- `skills/brainstorming/scripts/server.js` -- visual companion server
- `skills/writing-plans/plan-document-reviewer-prompt.md` -- plan review template

#### 2.7 The Complete Workflow Chain

```
brainstorming -> using-git-worktrees -> writing-plans -> subagent-driven-development -> finishing-a-development-branch
```

Each skill explicitly names the next skill to invoke. The chain is:
1. **brainstorming**: explore, design, write spec to `docs/superpowers/specs/`
2. **using-git-worktrees**: create isolated workspace
3. **writing-plans**: write plan to `docs/superpowers/plans/`, then hand off to execution
4. **subagent-driven-development** (or executing-plans): execute the plan
5. **finishing-a-development-branch**: verify tests, merge/PR/keep/discard

---

### KEY FINDINGS FOR YOUR PLANNING SKILL DESIGN

#### What Superpowers Gets Right
1. **Single-file plans, not directories** -- less ceremony, easier to read in one pass, no file management overhead
2. **Checkbox syntax for tracking** -- works in git, visible in diffs, readable by any session
3. **Context injection via SessionStart hook** -- the only automation, and it is minimal (just loads one skill file)
4. **Subagent isolation** -- controller curates context, subagents never inherit session history
5. **Plan review loop** -- plans are reviewed by subagents before execution (spec reviewer, plan document reviewer)

#### What Superpowers Does NOT Do (notable absences)
1. **No scaffolding scripts** -- there is no `mkdir -p plan/ plan/phases/ plan/context/` automation
2. **No template generation** -- Claude creates plan files from .md instructions, not from a template script
3. **No status.md / handoff.md / log.md** -- progress is tracked via checkboxes in the plan file + TodoWrite
4. **No multi-file plan structure** -- everything is in one plan file, separated by task/chunk headings
5. **No hooks for plan creation** -- the SessionStart hook only injects the skill loader; plan creation is entirely skill-driven

#### Implications for Your Design

**The scaffolding question:** Superpowers answers this decisively -- **pure .md instructions, no scripts**. The skill file tells Claude what to create and where. Claude creates the directory structure as part of following the skill instructions.

**However**, Superpowers uses a simpler plan structure (single file) than what you are proposing (multi-directory with phases, context, handoff, log). With a more complex structure, the trade-off shifts:

| Approach | Superpowers (single file) | Your proposal (multi-file) |
|----------|--------------------------|--------------------------|
| Scaffolding cost | Trivial (one `mkdir` + one file) | Higher (multiple dirs + files) |
| Token cost if .md-prescribed | Low | Moderate (mkdir commands, file creation) |
| Script benefit | Minimal | More significant |
| Context across sessions | Read one file | Read multiple files selectively |

**Recommendation based on findings:** If you keep the multi-file structure, a **hybrid approach** makes the most sense:

1. A **shell script** (similar to `hooks/session-start`) that creates the directory skeleton. Triggered by the skill's .md instructions telling Claude to run it (not by a hook -- since this should only happen when the user initiates planning, not on every session start).
2. The **skill .md** prescribes WHAT goes in each file (the format/template), but delegates the mkdir/touch to the script.
3. This mirrors how superpowers uses `brainstorming/scripts/start-server.sh` -- the skill file says "run this script when needed," the script does the mechanical work.

Alternatively, consider whether your multi-file structure could be **simplified to a single file** like superpowers does. The plan file format superpowers uses (header + phased tasks with checkboxes) accomplishes progress tracking, context, and handoff without separate files. The main things you gain from multi-file are:
- Selective context loading (read only `handoff.md` for session resume instead of the whole plan)
- Append-only log (separate from plan state)
- Phase isolation (each phase readable independently)

Whether those benefits justify the added complexity depends on your expected plan sizes and session patterns.