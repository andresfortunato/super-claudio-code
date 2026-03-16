# Research: get-shit-done

*Source: github repo analysis via MCP*

---

I now have a thorough understanding of the entire GSD system. Let me write up the findings.

---

## Findings: GSD Repo Research

### DIMENSION 1: Automation Outside .md Files

GSD has **substantial programmatic automation** -- far more than its surface-level .md file count would suggest. The system uses a **three-layer architecture**:

**Layer 1: NPM Install Script (`bin/install.js`, 88KB)**
- Published as `get-shit-done-cc` on NPM
- On `npx get-shit-done-cc`, it copies all GSD files into `~/.claude/get-shit-done/`
- Copies agents, commands, hooks, templates, workflows, and tools into the user's Claude config directory
- Sets up Claude Code's `.claude/settings.json` and hook configurations
- This is how GSD gets its slash commands registered -- by populating `commands/gsd/` in `~/.claude/`

**Layer 2: `gsd-tools.cjs` CLI (23KB) + library modules (174KB total)**
- Located at `get-shit-done/bin/gsd-tools.cjs` with 11 library modules in `get-shit-done/bin/lib/`
- This is **the critical automation layer**. Key modules:
  - `init.cjs` (23KB) -- 12 "compound init" commands that pre-compute all context for workflows. Example: `gsd-tools init new-project` detects brownfield vs greenfield, resolves model profiles, checks file existence, detects package files -- all via Node.js before the LLM does anything
  - `state.cjs` (28KB) -- Programmatic STATE.md manipulation (advance plan counter, record metrics, add decisions/blockers, progress bar recalculation)
  - `phase.cjs` (30KB) -- Phase directory scaffolding, plan indexing, decimal phase insertion, phase removal with renumbering
  - `roadmap.cjs` (11KB) -- ROADMAP.md parsing, plan progress updates
  - `verify.cjs` (31KB) -- Plan structure validation, phase completeness checks, artifact verification, key-link verification
  - `template.cjs` (7KB) -- Generates pre-filled PLAN.md, SUMMARY.md, VERIFICATION.md from templates with YAML frontmatter
  - `milestone.cjs` (9KB) -- Milestone archival, requirements marking
  - `commands.cjs` (18KB) -- Scaffold, commit, slug generation, web search, progress rendering
  - `frontmatter.cjs` (12KB) -- YAML frontmatter CRUD operations
  - `config.cjs` (6KB) -- Config management
  - `core.cjs` (19KB) -- Shared utilities, model profile resolution, phase finding

**Layer 3: Claude Code Hooks (3 JavaScript files)**
- `gsd-statusline.js` -- Notification bar showing model, task, context usage with progress bar. Writes context metrics to a bridge file in `/tmp/`
- `gsd-context-monitor.js` -- PostToolUse hook that reads context metrics and injects warnings into the conversation when context usage hits 65% or 75%. Detects GSD state via `.planning/STATE.md` existence
- `gsd-check-update.js` -- SessionStart hook that checks NPM for newer versions in background

**How planning artifacts are created -- the automation flow:**

1. User runs `/gsd:new-project` (a slash command = `.md` file in `commands/gsd/`)
2. The command's `.md` file references a workflow (e.g., `@~/.claude/get-shit-done/workflows/new-project.md`)
3. The workflow's **first step** is always: `node gsd-tools.cjs init new-project` -- a JavaScript call that pre-computes configuration, detects state, resolves models
4. The workflow then orchestrates the LLM to create files (PROJECT.md, ROADMAP.md, STATE.md, etc.)
5. State updates use `gsd-tools.cjs` programmatically: `gsd-tools state advance-plan`, `gsd-tools commit "docs: ..."`, `gsd-tools template fill summary --phase 1`

**Key insight: GSD does NOT use scripts to scaffold its `.planning/` directory structure.** The directory structure (`.planning/phases/XX-name/`, `.planning/research/`, etc.) is created by the LLM following workflow instructions, with `mkdir -p` commands embedded in the `.md` workflow files. The `gsd-tools scaffold` commands exist but are limited to creating individual files (CONTEXT.md, UAT.md, VERIFICATION.md, phase directories) -- they don't create the whole tree at once.

The `template fill` command in `gsd-tools` can create pre-filled PLAN.md, SUMMARY.md, and VERIFICATION.md files programmatically, but it's typically invoked by the LLM as directed by workflow `.md` files.

### DIMENSION 2: Planning and Execution Patterns in .md Files

**File inventory and token cost:**

GSD's planning/workflow system ships with these `.md` file categories (stored in `~/.claude/get-shit-done/`):

| Category | Count | Total Size | Purpose |
|----------|-------|------------|---------|
| `agents/` | 12 files | ~236KB | Agent system prompts (planner, executor, verifier, debugger, etc.) |
| `commands/gsd/` | 32 files | ~44KB | Slash command definitions (thin routers) |
| `workflows/` | 34 files | ~306KB | Detailed workflow logic |
| `templates/` | 29 files (including subdirs) | ~136KB | File templates for generated artifacts |
| `references/` | 13 files | ~86KB | Reference documentation (checkpoints, git, TDD, etc.) |
| **Total** | **~120 files** | **~808KB** | |

At ~4 chars/token, that's roughly **200K tokens** of definition files in the GSD system itself.

However, **not all files are loaded at once**. The system uses `@` references to load files on demand. A typical flow like `/gsd:plan-phase 1` loads:
1. The command `.md` (~1.4KB)
2. The workflow `.md` (~23KB for plan-phase)
3. The agent `.md` (~43KB for gsd-planner)
4. Referenced templates (phase-prompt.md = 18KB, etc.)
5. STATE.md, ROADMAP.md, PROJECT.md from `.planning/`

Estimated per-workflow context load: **50-80KB** (12-20K tokens) of GSD system files, plus whatever project files are referenced.

**Planning structure:**

GSD uses a hierarchical planning model:

```
.planning/
  PROJECT.md          -- Living project context (what, why, constraints, decisions)
  REQUIREMENTS.md     -- Requirements with REQ-IDs, scoped to milestones
  ROADMAP.md          -- Phases with goals, requirements mapping, success criteria
  STATE.md            -- Short-term memory (<100 lines target), position tracking
  config.json         -- Workflow preferences (mode, granularity, model profile)
  research/           -- Domain research (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md)
  codebase/           -- Codebase maps for brownfield projects (6 files)
  phases/
    01-foundation/
      01-01-PLAN.md       -- Executable plan with tasks, frontmatter, verification
      01-01-SUMMARY.md    -- Execution results
      01-RESEARCH.md      -- Phase-specific research
      01-CONTEXT.md       -- Phase context from discuss-phase
      01-VERIFICATION.md  -- Must-haves verification report
      .continue-here.md   -- Session handoff (transient, deleted on resume)
    02-features/
      ...
  todos/
    pending/
    completed/
  milestones/           -- Archived milestone phases
  archive/
```

**Multi-session execution:**

GSD handles session boundaries through several mechanisms:

1. **STATE.md** -- The "short-term memory" file. Updated after every significant action. Contains: current position (phase X of Y, plan A of B), accumulated decisions, pending todos, blockers, session continuity info. Target: under 100 lines.

2. **`.continue-here.md`** -- Created by `/gsd:pause-work` when stopping mid-phase. Contains: current state, completed work, remaining work, decisions made, blockers, mental context, and the exact next action. Deleted on resume.

3. **SUMMARY.md files** -- Created after each plan execution. Contains: what was accomplished, files modified, decisions made, deviations from plan, duration, and "Next Phase Readiness" section.

4. **Context monitor hook** -- Programmatically detects when context usage hits 65%/75% and injects warnings. If GSD is active, tells the agent to inform user to run `/gsd:pause-work`.

**Session handoff flow:**
- Context getting low -> hook fires warning
- User runs `/gsd:pause-work` -> creates `.continue-here.md`, commits WIP
- User runs `/clear` (new session) then `/gsd:resume-work`
- Resume workflow reads STATE.md -> finds `.continue-here.md` -> presents options -> routes to appropriate command

**Progress tracking:**

- ROADMAP.md has a progress table with per-phase plan counts and status
- STATE.md has a progress bar: `Progress: [████░░░░░░] 40%`
- `gsd-tools progress` renders progress in JSON, table, or bar format
- `gsd-tools state update-progress` recalculates from disk (counts plans vs summaries)
- Performance metrics tracked: velocity, average duration, per-phase breakdown, trend

**How plans are structured:**

Each PLAN.md file has rich YAML frontmatter:
```yaml
phase: 01-foundation
plan: 01
type: execute
wave: 1                     # Pre-computed execution wave
depends_on: []              # Plan dependencies
files_modified: []          # Files this plan touches
autonomous: true            # false if has checkpoints
requirements: [REQ-01]      # Requirement traceability
must_haves:
  truths: []                # Observable behaviors that must be true
  artifacts: []             # Files that must exist
  key_links: []             # Connections between artifacts
```

Tasks use XML structure within the `.md`:
```xml
<task type="auto">
  <name>Task 1: Create User model</name>
  <files>src/features/user/model.ts</files>
  <read_first>src/features/user/types.ts</read_first>
  <action>Define User type with id, email, name...</action>
  <verify>tsc --noEmit passes</verify>
  <acceptance_criteria>
    - "model.ts contains 'export interface User'"
  </acceptance_criteria>
  <done>User type exported and usable</done>
</task>
```

### Implications for Our Planning Skill

**Key finding: GSD's automation is substantial but the `.planning/` directory structure is still created by LLM-driven mkdir commands in workflow .md files, not by a standalone scaffolding script.**

The `gsd-tools` CLI handles:
- Pre-computing context before workflows start (init commands)
- Structured state manipulation (STATE.md updates, progress tracking)
- Template generation (pre-filled PLAN/SUMMARY/VERIFICATION files)
- Validation and verification
- Git commits with proper messages

But it does NOT handle:
- Creating the initial `.planning/` tree structure as a single operation
- Generating PROJECT.md, ROADMAP.md, REQUIREMENTS.md content (that's all LLM)

**The answer to our open question:** GSD uses a hybrid approach. The skill's `.md` prescribes the structure AND there is automation, but the automation is in the form of a CLI tool that the LLM invokes, not a pre-scaffolding script. The workflow `.md` files tell the LLM "run this bash command to create the directory, then write this file with this template." The `gsd-tools` CLI reduces token cost by pre-computing configuration and state lookups in JavaScript rather than having the LLM parse JSON config files itself.

**The token cost problem is real:** ~808KB of system definition files exists. But GSD mitigates it through on-demand loading -- only the relevant command + workflow + agent + referenced templates are loaded per invocation. Still, a single workflow invocation can pull in 50-80KB of GSD system context.