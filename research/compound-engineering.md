# Research: compound-engineering-plugin

*Source: github repo analysis via MCP*

---

I now have a thorough understanding of the entire system. Let me compile my findings into a comprehensive analysis.

---

## Comprehensive Analysis: compound-engineering-plugin Learning System and Automation Infrastructure

### DIMENSION 1: THE LEARNING COMPONENT

#### 1.1 Architecture Overview

The compound-engineering plugin implements a **document-based institutional knowledge system** -- not a programmatic hooks-based learning system. The learning loop consists of three interconnected components:

1. **Capture**: `/ce:compound` command + `compound-docs` skill
2. **Storage**: `docs/solutions/` directory with YAML-frontmattered markdown files
3. **Retrieval**: `learnings-researcher` agent invoked by `/ce:plan` and `/ce:review`

There are **no Claude Code hooks** (SessionStart, PostToolUse, Stop, etc.) used anywhere in this plugin. The entire system is built on **skills** (SKILL.md files), **agents** (.md files), and **slash commands** that delegate to skills.

#### 1.2 How Learnings Are Captured

**Trigger mechanism**: The `/ce:compound` command (in `plugins/compound-engineering/skills/ce-compound/SKILL.md`) is the primary capture mechanism. It is triggered in two ways:

1. **Manual invocation**: User runs `/ce:compound` or `/ce:compound [context]`
2. **Auto-invoke via trigger phrases** -- the SKILL.md contains an `<auto_invoke>` XML block:
```xml
<auto_invoke>
  <trigger_phrases>
    - "that worked"
    - "it's fixed"
    - "working now"
    - "problem solved"
  </trigger_phrases>
</auto_invoke>
```
This is a **pure prompt-engineering trigger** -- there is no programmatic hook that detects these phrases. Claude is instructed to watch for them in conversation. This means the auto-invoke depends entirely on the model recognizing the phrases and self-activating.

3. **Workflow integration**: The `/lfg` (Let's F'n Go) automated pipeline does NOT include `/ce:compound` in its sequence. The `/ce:compound` step is intended to be run ad-hoc after solving a non-trivial problem, not as a pipeline stage.

**Capture process (full mode)**:

The `ce-compound` skill orchestrates a multi-agent capture process with 3 phases:

- **Phase 0**: Context budget check -- warns if context window is low, offers "compact-safe mode" (single pass, ~2k tokens) vs "full mode" (5 parallel subagents, ~10k tokens)
- **Phase 1**: 5 parallel subagents run simultaneously:
  - Context Analyzer: extracts problem type, symptoms, builds YAML frontmatter skeleton
  - Solution Extractor: identifies root cause, extracts code examples
  - Related Docs Finder: searches `docs/solutions/` for cross-references
  - Prevention Strategist: develops prevention strategies
  - Category Classifier: determines file path and category
- **Phase 2**: Orchestrator assembles one single markdown file from all subagent outputs
- **Phase 3** (optional): Specialized agents review the documentation (e.g., performance-oracle for performance issues)

Critical design constraint: **only one file is ever written** -- subagents return text, not files.

**Capture process (compact-safe mode)**: Single-pass, no subagents, creates a minimal doc.

#### 1.3 Storage Format and Organization

**Location**: `docs/solutions/[category]/[filename].md`

**Categories** (mapped from `problem_type` enum):
```
docs/solutions/
  build-errors/
  test-failures/
  runtime-errors/
  performance-issues/
  database-issues/
  security-issues/
  ui-bugs/
  integration-issues/
  logic-errors/
  developer-experience/
  workflow-issues/
  best-practices/
  documentation-gaps/
  patterns/                  # Cross-cutting patterns
    critical-patterns.md     # "Required reading" for all agents
    common-solutions.md      # Recurring pattern documentation
```

**Filename convention**: `[sanitized-symptom]-[module]-[YYYYMMDD].md`

**File format** (see `plugins/compound-engineering/skills/compound-docs/assets/resolution-template.md`): Each learning document has:
- **YAML frontmatter** validated against `schema.yaml` with enum-constrained fields:
  - `module`, `date`, `problem_type`, `component`, `symptoms` (array 1-5), `root_cause`, `resolution_type`, `severity`
  - Optional: `rails_version`, `related_components`, `tags` (up to 8)
- **Markdown body** with structured sections: Problem, Environment, Symptoms, What Didn't Work, Solution (with before/after code), Why This Works, Prevention, Related Issues

**Schema validation**: The `compound-docs` skill has a hard validation gate (Step 5) -- YAML frontmatter **must** pass validation against `schema.yaml` before the file is written. This ensures all learnings follow a consistent structure that enables effective retrieval.

#### 1.4 How Learnings Are Retrieved (The "Injection" Mechanism)

The `learnings-researcher` agent (`plugins/compound-engineering/agents/research/learnings-researcher.md`) is the retrieval engine. It is **not triggered automatically at session start**. Instead, it is invoked:

1. **During `/ce:plan`** -- Step 1 runs `learnings-researcher` as a parallel subagent alongside `repo-research-analyst`. This is the primary retrieval path.
2. **During `/ce:review`** -- runs as one of the final review agents after parallel code review.
3. **Manual invocation** -- can be called directly.

**Retrieval algorithm** (7-step grep-first filtering):

1. **Extract keywords** from the feature/task description (module names, technical terms, problem indicators)
2. **Category narrowing** (optional) -- if feature type is clear, limit search to relevant subdirectory
3. **Grep pre-filter** -- runs multiple parallel Grep calls against frontmatter fields:
   ```
   Grep: pattern="title:.*email" path=docs/solutions/ -i=true
   Grep: pattern="tags:.*(email|mail|smtp)" path=docs/solutions/ -i=true
   Grep: pattern="module:.*(Brief|Email)" path=docs/solutions/ -i=true
   ```
   This returns filenames only, reducing hundreds of files to 5-20 candidates.
4. **Always read critical-patterns.md** -- regardless of grep results
5. **Read frontmatter only** (first 30 lines) of candidates
6. **Score and rank** by field overlap (strong/moderate/weak matching)
7. **Full-read only relevant files**, return distilled summaries

The output is structured as: Search Context, Critical Patterns, Relevant Learnings (with file path, module, relevance, key insight, severity), and Recommendations.

**Key insight**: There is no "index file" maintained. The retrieval system uses **grep against the raw markdown files** as its index. The YAML frontmatter IS the index -- the structured enum fields enable grep-based matching. This is simple but scales with the number of files in the directory.

#### 1.5 Graduation / Promotion Mechanism

The system has a **manual graduation path** but no automated pruning:

1. **Promotion to "Required Reading"**: After documenting a solution, the user is presented with a 7-option decision menu (in `compound-docs` SKILL.md). Option 2 is "Add to Required Reading":
   - Extracts pattern from the doc
   - Formats as WRONG vs CORRECT with code examples (using `assets/critical-pattern-template.md`)
   - Adds to `docs/solutions/patterns/critical-patterns.md`
   - The `learnings-researcher` agent **always reads** this file (Step 3b), making it truly "required reading"

2. **Promotion to an existing skill**: Option 4 lets users add a learning to a related skill's reference files

3. **Create new skill**: Option 5 scaffolds a new skill using the learning as the first example

4. **No pruning mechanism**: There is no automated staleness detection, expiration, or cleanup. The system grows monotonically. The only mitigation is the grep-first approach limiting what gets read into context.

5. **No CLAUDE.md graduation**: Unlike our planned system, learnings are NOT automatically promoted to CLAUDE.md. The plugin's CLAUDE.md is hand-maintained with a small "Key Learnings" section, but there is no automated pipeline to promote patterns there.

#### 1.6 What Triggers Learning Injection Into Context

There is **no SessionStart hook** that automatically injects learnings. Instead:

- Learnings are injected **only when the user explicitly invokes a workflow command** (`/ce:plan`, `/ce:review`, `/lfg`)
- The `learnings-researcher` agent is called as a subagent within those workflows
- The injection is scoped: learnings relevant to the current task are returned as summaries, not as raw files dumped into context

This is a **pull model** (learnings are fetched on-demand by specific commands) rather than a **push model** (learnings injected at session start).

---

### DIMENSION 2: OVERALL AUTOMATION INFRASTRUCTURE

#### 2.1 Plugin Architecture

The plugin uses Claude Code's official plugin system (not hooks). The structure at `plugins/compound-engineering/`:

```
plugins/compound-engineering/
  .claude-plugin/plugin.json    # Plugin metadata (name, version, description, mcpServers)
  .cursor-plugin/plugin.json    # Mirror for Cursor editor
  .mcp.json                     # MCP server config (context7)
  CLAUDE.md                     # Plugin-scoped instructions
  agents/                       # 28 agents organized by category
    review/ (15 agents)
    research/ (5 agents)
    design/ (3 agents)
    workflow/ (4 agents)
    docs/ (1 agent)
  skills/                       # 47 skills, each as a directory with SKILL.md
    ce-brainstorm/
    ce-plan/
    ce-work/
    ce-review/
    ce-compound/
    compound-docs/              # Has references/, assets/, schema.yaml
    lfg/                        # Full automation pipeline
    slfg/                       # Swarm mode pipeline
    setup/                      # Configure review agents
    ... (40+ more)
```

#### 2.2 Hooks

**The plugin uses ZERO Claude Code hooks.** No `SessionStart`, no `PostToolUse`, no `Stop`, no `PreToolUse` hooks. Everything is driven by:
- Slash commands (now unified as skills)
- Agent invocations via the `Task` tool
- Prompt-engineering triggers (auto_invoke phrases in SKILL.md)

#### 2.3 Workflow Pipeline

The core workflow is: `Brainstorm -> Plan -> Work -> Review -> Compound -> Repeat`

Each stage is a skill:
- `/ce:brainstorm` -- collaborative dialogue, writes `docs/brainstorms/[timestamp]-[topic]-brainstorm.md`
- `/ce:plan` -- multi-agent research + plan creation, writes `docs/plans/YYYY-MM-DD-NNN-[name]-plan.md`. **This is where learnings are injected** (via `learnings-researcher` agent).
- `/ce:work` -- executes the plan, uses worktrees, tracks progress via TodoWrite, incremental commits
- `/ce:review` -- multi-agent code review, creates todo files in `todos/`. Also invokes `learnings-researcher`.
- `/ce:compound` -- captures learnings post-fix, writes `docs/solutions/[category]/[filename].md`

The `/lfg` command chains: plan -> deepen-plan -> work -> review -> resolve_todo_parallel -> test-browser -> feature-video.

#### 2.4 Session State and Persistence

- **No session state management** in the traditional sense -- the plugin does not persist state between sessions
- **State is persisted as files**: Plans in `docs/plans/`, brainstorms in `docs/brainstorms/`, solutions in `docs/solutions/`, todos in `todos/`
- **Agent configuration persisted** in `compound-engineering.local.md` (YAML frontmatter + markdown body) via the `setup` skill
- **Plan progress** tracked by checking off `- [ ]` to `- [x]` in plan files (living documents)

#### 2.5 Key Design Decisions and CLI Infrastructure

The `src/` directory contains a Bun/TypeScript CLI tool (`@every-env/compound-plugin`) that is entirely separate from the learning system. It provides:
- `convert` -- converts Claude Code plugins to other agent formats (OpenCode, Codex, Droid, etc.)
- `install` -- installs a plugin into a target tool
- `sync` -- syncs personal Claude Code config to other tools
- `list` -- lists available plugins

This CLI is the distribution mechanism, not part of the runtime learning system.

#### 2.6 Integration with Claude Code

- **Skills** are loaded via Claude Code's plugin system. Each skill directory contains a `SKILL.md` with YAML frontmatter (`name`, `description`, and optionally `disable-model-invocation`, `allowed-tools`, `argument-hint`).
- **Agents** are `.md` files with YAML frontmatter (`name`, `description`, `model`). They are invoked via the `Task` tool.
- **Commands** were migrated to skills in v2.39.0 -- Claude Code 2.1.3+ merged the two formats.
- **MCP Servers** defined in `.mcp.json` (currently just context7 for framework docs).

---

### KEY TAKEAWAYS FOR OUR LEARNING SYSTEM

**What compound-engineering does well:**

1. **Structured schema with enum validation** -- the YAML frontmatter ensures every learning is consistently categorized, making retrieval reliable. The `schema.yaml` with strict enum validation is a strong pattern.

2. **Grep-first retrieval** -- using grep against frontmatter fields as a lightweight index avoids maintaining a separate index file that could drift out of sync.

3. **Critical patterns as required reading** -- the `docs/solutions/patterns/critical-patterns.md` file is always read by the learnings-researcher, acting as a curated "essential learnings" layer.

4. **Context budget awareness** -- the compact-safe mode in `/ce:compound` shows awareness that context is a finite resource.

5. **Pull-based injection scoped to workflow** -- learnings are only injected during planning and review, not dumped at session start.

**What it lacks (opportunities for our design):**

1. **No hooks at all** -- no SessionStart injection means learnings are only available when the user explicitly runs a workflow command. Our planned SessionStart hook would be more proactive.

2. **No automated capture trigger** -- the "auto_invoke" phrases are prompt-engineering only, not programmatic hooks. A `Stop` hook that triggers learning capture would be more reliable.

3. **No index file** -- grep against raw files works but doesn't scale well to hundreds of learnings. A maintained `learnings-index.yaml` with trigger descriptions would be faster.

4. **No pruning/staleness** -- the learning set grows forever. No mechanism to detect that a learning is obsolete (e.g., after a dependency upgrade resolves the issue).

5. **No CLAUDE.md graduation** -- learnings stay in `docs/solutions/` forever. The "Required Reading" promotion is manual. Our planned graduation to CLAUDE.md would be more powerful.

6. **No session-aware context matching** -- the learnings-researcher only matches based on explicit keyword search. It cannot match based on what files you have open or what you're currently working on without being told.