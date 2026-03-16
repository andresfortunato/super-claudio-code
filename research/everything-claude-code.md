# Research: everything-claude-code

*Source: github repo analysis via MCP*

---

I now have a thorough understanding of the repo. Here is my structured summary:

---

## Research Summary: `affaan-m/everything-claude-code`

This repo is a comprehensive Claude Code plugin and curated resource collection. It is _not_ just a guide -- it contains substantial executable infrastructure (Node.js scripts, shell scripts, JSON schemas, hooks) alongside its documentation (.md command definitions, skills, guides). It is structured as an installable npm package / Claude Code plugin.

---

### DIMENSION 1: Automation Outside .md Files

**1.1 The Hooks System (Major Finding)**

The repo has a fully developed hooks system at `hooks/hooks.json` with 20+ hooks across 6 lifecycle events:
- **PreToolUse**: Blocks dev server runs outside tmux, warns about git push, warns about doc files, suggests compaction every ~50 tool calls, optional security scanning
- **PostToolUse**: Auto-formats JS/TS after edits, runs TypeScript checks, runs quality gates, logs PR URLs
- **SessionStart**: Loads previous context and detects package manager automatically
- **PreCompact**: Saves state before context compaction
- **Stop**: Persists session state, extracts patterns for continuous learning, tracks costs
- **SessionEnd**: Cleanup marker

Key automation pattern: All hooks route through `scripts/hooks/run-with-flags.js`, which implements a **profile system** (minimal/standard/strict) controlled by `ECC_HOOK_PROFILE` env var. Individual hooks can be disabled via `ECC_DISABLED_HOOKS`. This is a clean separation: the hook config declares intent, the runtime decides whether to execute.

The hooks schema at `schemas/hooks.schema.json` documents the full hook event vocabulary including newer events like `WorktreeCreate`, `WorktreeRemove`, `TeammateIdle`, `TaskCompleted`, `ConfigChange`, `InstructionsLoaded`.

**1.2 Executable Scripts (Major Finding)**

The `scripts/` directory contains real automation code:
- **`scripts/lib/tmux-worktree-orchestrator.js`** (15KB): Creates git worktrees + tmux sessions for parallel Claude Code workers. Takes a JSON plan file, creates branches, worktrees, coordination directories, and launches Claude in each pane.
- **`scripts/orchestrate-worktrees.js`**: CLI wrapper that reads a plan JSON, does dry-run or `--execute` to spin up multi-worker sessions.
- **`scripts/lib/session-manager.js`** (13KB): Full session persistence system -- finds, creates, parses, and manages session files in `~/.claude/sessions/`.
- **`scripts/lib/session-aliases.js`** (12KB): Alias system for naming sessions.
- **`scripts/lib/project-detect.js`** (13KB): Auto-detects project type, language, framework.
- **`scripts/hooks/session-start.js`**: On session start, loads previous context automatically.
- **`scripts/hooks/session-end.js`**: On stop, persists session state.
- **`scripts/hooks/evaluate-session.js`**: Evaluates sessions for extractable patterns.
- **`scripts/hooks/pre-compact.js`**: Saves state before compaction.
- **`scripts/skill-create-output.js`**: Terminal UI formatter for the `/skill-create` command.
- **`scripts/claw.js`** (14KB): A CLI tool for the plugin itself.
- **`install.sh`** (8.5KB): Multi-target installer script that copies rules, agents, skills, commands, hooks, and MCP configs to `~/.claude/` (Claude target), `.cursor/` (Cursor target), or `.agent/` (Antigravity target).

**1.3 Configuration & Scaffolding Patterns**

- The `install.sh` script demonstrates **programmatic scaffolding**: it creates directory structures (`~/.claude/rules/common/`, `~/.claude/rules/<language>/`) and copies files preserving relative paths.
- The orchestration system uses JSON plan files (e.g., `.claude/plan/workflow-e2e-test.json`) that declare workers, seed paths, and session names. The script then scaffolds worktrees, coordination dirs, and tmux sessions.
- `seedPaths` in plan JSON overlays selected local files into worktrees -- a mechanism for sharing in-flight docs/scripts with isolated workers.

**1.4 Settings and Environment Variables**

The repo recommends specific `~/.claude/settings.json` configuration:
```json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50",
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku"
  }
}
```

**1.5 Dynamic System Prompt Injection**

The longform guide documents using `claude --system-prompt "$(cat memory.md)"` with shell aliases to inject different context profiles:
```bash
alias claude-dev='claude --system-prompt "$(cat ~/.claude/contexts/dev.md)"'
alias claude-review='claude --system-prompt "$(cat ~/.claude/contexts/review.md)"'
```
The `contexts/` directory has actual files for this: `dev.md`, `review.md`, `research.md`.

---

### DIMENSION 2: Planning and Execution Patterns

**2.1 The `/plan` Command (Simple Planning)**

`commands/plan.md` defines a straightforward planning pattern:
1. Restate requirements
2. Identify risks
3. Break into phases with actionable steps
4. Identify dependencies
5. Assess complexity (High/Medium/Low)
6. **WAIT for user confirmation before touching code**

This is a pure .md command -- no scripted scaffolding. The planner agent is invoked and produces a markdown plan inline.

**2.2 The `/multi-plan` + `/multi-execute` Workflow (Advanced Planning)**

`commands/multi-plan.md` (9.3KB) and `commands/multi-execute.md` (10.6KB) implement a sophisticated multi-model planning pattern:

**Plan Phase**:
1. **Prompt Enhancement**: Optionally uses ace-tool MCP to enhance the user's prompt
2. **Context Retrieval**: Semantic search or fallback to Glob/Grep/Read
3. **Dual-Model Analysis**: Codex (backend) and Gemini (frontend) analyze in parallel via background tasks
4. **Cross-Validation**: Consensus/divergence identification
5. **Plan Synthesis**: Claude synthesizes both analyses into a structured plan
6. **Plan Saving**: Writes to `.claude/plan/<feature-name>.md`
7. **Strict Boundary**: NEVER modifies production code. Presents plan and stops.

**Execute Phase**:
1. Reads plan file from `.claude/plan/`
2. Routes to appropriate model (Frontend->Gemini, Backend->Codex, Fullstack->Both)
3. Gets "dirty prototype" as Unified Diff from external models
4. Claude refactors prototype to production-grade code
5. Applies changes with Edit/Write tools
6. Dual-model code review audit
7. Delivery report

The plan file acts as the handoff artifact between sessions/commands. Key pattern: `.claude/plan/<feature-name>.md` with versioning (`-v2.md`, `-v3.md`).

**2.3 The `/workflow` Command (Full Lifecycle)**

`commands/multi-workflow.md` defines a 6-phase workflow: Research -> Ideation -> Plan -> Execute -> Optimize -> Review. Each phase has a mode label, quality gates, and user confirmation checkpoints. Force-stops when quality score < 7.

**2.4 The `/orchestrate` Command (Agent Chains)**

`commands/orchestrate.md` defines sequential agent pipelines:
- `feature`: planner -> tdd-guide -> code-reviewer -> security-reviewer
- `bugfix`: planner -> tdd-guide -> code-reviewer
- `refactor`: architect -> code-reviewer -> tdd-guide

Uses structured **handoff documents** between agents (Context, Findings, Files Modified, Open Questions, Recommendations). For parallel work, uses the `orchestrate-worktrees.js` script with JSON plan files.

**2.5 Session Persistence (Multi-Session Strategy)**

The `/save-session` and `/resume-session` commands form a complete multi-session strategy:
- Sessions saved to `~/.claude/sessions/YYYY-MM-DD-<short-id>-session.tmp`
- Detailed template with: What We're Building, What WORKED (with evidence), What Did NOT Work (with exact failure reasons), What Has NOT Been Tried Yet, Current State of Files, Decisions Made, Blockers, Exact Next Step
- The "What Did NOT Work" section is called out as the most critical -- prevents future sessions from retrying failed approaches
- Resume loads the session file and presents a structured briefing, then waits for the user before acting

Automated hooks support this: `session-start.js` loads context on new sessions, `session-end.js` persists state on Stop, `pre-compact.js` saves state before compaction.

**2.6 Context Management Techniques**

From `docs/token-optimization.md` and the longform guide:
- Strategic manual `/compact` at logical breakpoints (after exploration, before implementation)
- Auto-compact threshold at 50% (not default 95%) to maintain quality
- Use subagents (Task tool with Haiku model) for exploration to protect main context
- `/clear` between unrelated tasks
- Keep MCP servers under 10 per project
- Dynamic system prompt injection via `--system-prompt` for different work modes

**2.7 Continuous Learning / Instinct System**

A unique pattern: The repo has a "continuous learning" system where:
- Hooks observe tool use patterns (PreToolUse/PostToolUse observers)
- Sessions are evaluated for extractable patterns (`evaluate-session.js` hook)
- Patterns become "instincts" (YAML files with trigger, confidence, domain)
- `/evolve` command clusters instincts into Skills, Commands, or Agents
- `/skill-create` analyzes git history to extract coding patterns into SKILL.md files

**2.8 The Checkpoint Pattern**

`commands/checkpoint.md` creates named checkpoints tied to git state, logged to `.claude/checkpoints.log`, enabling verification at workflow milestones.

---

### IMPLICATIONS FOR OUR PLANNING SKILL

Based on this research, here are the key takeaways for our design question (should the skill's .md prescribe the structure, or should a script/hook scaffold it automatically?):

**ECC's Answer: Both, Layered**

ECC uses a layered approach:
1. **Commands (.md files) prescribe the workflow and structure** -- `multi-plan.md` is a 9KB file that instructs Claude exactly what to produce and where to save it (`.claude/plan/<feature-name>.md`). This burns tokens but provides the procedural logic.
2. **Scripts handle the mechanical scaffolding** -- `install.sh` creates directory structures, `orchestrate-worktrees.js` creates worktrees/tmux from plan JSON, `session-manager.js` manages session file I/O.
3. **Hooks automate lifecycle moments** -- SessionStart loads context, PreCompact saves state, Stop persists. These fire automatically without burning prompt tokens.

**The "plan file as artifact" pattern is central**: Plans are saved to `.claude/plan/` as markdown files, then consumed by `/execute` in a subsequent session. The plan file IS the multi-session handoff mechanism.

**Token cost observation**: The multi-plan command is ~9KB of prompt text that loads every time it's invoked. ECC accepts this cost because the command is invoked explicitly (not loaded by default). But the repo's `docs/token-optimization.md` and longform guide emphasize minimizing always-loaded context (CLAUDE.md, rules) and using commands/skills that load on demand.

**Script scaffolding is used for infrastructure, not plan content**: The scripts create directories, worktrees, and tmux sessions. But the plan CONTENT is always generated by Claude (the command .md tells Claude what format to produce). There is no script that generates plan content -- that would be the wrong tool for the job. The scripts handle the stuff Claude is bad at (filesystem operations, process management, git worktree setup) while Claude handles what it's good at (analysis, planning, writing).