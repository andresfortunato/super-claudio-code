# Research: spec-kit

*Source: github repo analysis via MCP*

---

I now have a comprehensive understanding of the repo. Let me compile the findings.

---

## Structured Research Summary: github/spec-kit

### DIMENSION 1: Automation Outside .md Files

#### 1A. The `specify` CLI (Python, installed via `pip`)

The primary automation tool is `specify`, a Python CLI (`src/specify_cli/__init__.py`, 109KB) built with Typer/Rich. Installed via `pyproject.toml` as `specify` command. The `init` command is the main scaffolding entry point:

- **`specify init --ai claude`** bootstraps an entire project with the Spec-Driven Development framework
- Creates the `.specify/` directory with templates, scripts, and the `memory/` directory
- Copies all templates from `templates/` into `.specify/templates/`
- Copies all scripts from `scripts/` into `.specify/scripts/`
- Creates agent-specific command directories (e.g., `.claude/commands/`) and generates command files adapted to each agent's format
- Supports 20+ AI agents, each with different directory conventions, file formats (Markdown vs TOML), and argument patterns

Key design: The CLI does **one-time scaffolding** -- it copies templates and scripts into the target project. After that, the shell scripts and command files take over.

#### 1B. Shell Scripts (the runtime automation layer)

Located in `scripts/bash/` and `scripts/powershell/` (mirrored for cross-platform), these are the actual automation that runs during development:

**`create-new-feature.sh`** -- The most important scaffolding script:
- Auto-detects the next feature number by scanning both `specs/` directories AND git branches (local + remote)
- Creates a git branch named `{NNN}-{short-name}` (e.g., `003-user-auth`)
- Creates `specs/{branch-name}/` directory
- Copies `spec-template.md` into the directory as `spec.md`
- Accepts `--short-name`, `--number`, `--json` flags
- Includes smart branch name generation with stop-word filtering
- Sets `SPECIFY_FEATURE` environment variable

**`setup-plan.sh`** -- Scaffolds the plan file:
- Reads current branch, derives feature directory path
- Copies `plan-template.md` into the feature directory as `plan.md`
- Outputs JSON with paths for the AI command to consume

**`update-agent-context.sh`** (28KB) -- Automatically updates AI agent context files:
- Parses `plan.md` to extract language, framework, database, project type
- Updates/creates agent-specific context files (CLAUDE.md, GEMINI.md, etc.)
- Preserves manual additions between markers
- Generates language-specific build commands and project structure

**`check-prerequisites.sh`** -- Validates workflow state:
- Checks feature branch naming convention
- Verifies required files exist (plan.md, tasks.md)
- Lists available design documents
- Supports `--paths-only`, `--require-tasks`, `--include-tasks` modes

**`common.sh`** -- Shared functions:
- `get_repo_root()` with git/non-git fallback
- `get_current_branch()` with `SPECIFY_FEATURE` env var fallback
- `find_feature_dir_by_prefix()` -- allows multiple branches to share a spec directory by matching numeric prefix
- `get_feature_paths()` -- emits all standard paths as `eval`-able shell variables

#### 1C. Command Files (the AI orchestration layer)

Located in `templates/commands/`, these are Markdown files with YAML frontmatter that serve as **slash commands** for AI agents. They contain a `scripts:` key in the frontmatter that references the shell scripts:

```yaml
scripts:
  sh: scripts/bash/create-new-feature.sh "{ARGS}"
  ps: scripts/powershell/create-new-feature.ps1 "{ARGS}"
```

The command files instruct the AI to:
1. **Run the shell script first** (which does the filesystem scaffolding)
2. **Parse the JSON output** to get paths
3. **Read the template** that was copied into place
4. **Fill in the template** with content derived from user input and AI analysis
5. **Write the populated file** back to disk

This is the critical architecture: **scripts scaffold the structure, AI fills the content**.

#### 1D. Extension System

The repo has a full extension system (`extensions/`) with:
- `extensions.yml` hook configuration (before_tasks, after_tasks, before_implement, after_implement)
- Extension catalog (`catalog.json`, `catalog.community.json`)
- Template for creating extensions (`extensions/template/`)
- Hooks can be mandatory (auto-executed) or optional (user-prompted)

#### 1E. VS Code Integration

`templates/vscode-settings.json` auto-approves script execution in `.specify/scripts/` directories and recommends prompt files for Copilot Chat modes.

---

### DIMENSION 2: Planning and Execution Patterns in .md Files

#### 2A. The Spec-Plan-Tasks Pipeline

The workflow is a strict three-phase pipeline, each phase producing files in `specs/{NNN-feature-name}/`:

1. **`/speckit.specify`** --> `spec.md` + `checklists/requirements.md`
2. **`/speckit.plan`** --> `plan.md` + `research.md` + `data-model.md` + `contracts/` + `quickstart.md`
3. **`/speckit.tasks`** --> `tasks.md`

Then optionally:
4. **`/speckit.analyze`** --> Consistency analysis report (read-only, no file writes)
5. **`/speckit.implement`** --> Executes tasks, marks them `[X]` in tasks.md
6. **`/speckit.clarify`** --> Interactive Q&A that updates spec.md
7. **`/speckit.checklist`** --> Custom checklists for any domain

#### 2B. Spec Format

The spec template (`templates/spec-template.md`) is deliberately **technology-agnostic**:
- User Stories with priorities (P1, P2, P3) -- each must be independently testable
- Given/When/Then acceptance scenarios
- Functional Requirements (FR-001, FR-002...)
- `[NEEDS CLARIFICATION]` markers for ambiguities (max 3 allowed)
- Success Criteria with measurable outcomes
- Key Entities (data model sketch)
- No implementation details allowed

#### 2C. Plan Format

The plan template (`templates/plan-template.md`) bridges spec to implementation:
- Technical Context section (language, frameworks, storage, testing, platform)
- Constitution Check (gates that must pass before proceeding)
- Project Structure (directory layout with options for single-project, web-app, mobile)
- Complexity Tracking table for justified violations
- References the generated artifacts: research.md, data-model.md, contracts/, quickstart.md

#### 2D. Tasks Format

The tasks template (`templates/tasks-template.md`) is the most structured:
- Strict checklist format: `- [ ] T001 [P] [US1] Description with file path`
- Phases: Setup --> Foundational (blocking) --> User Stories (one phase per story, priority-ordered) --> Polish
- `[P]` markers for parallelizable tasks
- `[USn]` labels mapping every task to a user story
- Dependency graph and execution order
- Three execution strategies: MVP First, Incremental Delivery, Parallel Team

#### 2E. Multi-Session / Context Management

Spec-kit handles multi-session execution through several mechanisms:

1. **File-based state**: All state lives in `specs/{feature}/` files. The AI re-reads these at the start of each session via the shell scripts that output JSON paths.
2. **Branch-based context**: The current git branch determines which feature is active. `common.sh`'s `get_current_branch()` also supports a `SPECIFY_FEATURE` env var for non-git repos.
3. **Prefix-based feature lookup**: `find_feature_dir_by_prefix()` matches the numeric prefix (e.g., `004`) to find the spec directory, allowing multiple branches to work on the same feature.
4. **Agent context files**: `update-agent-context.sh` maintains persistent context files (CLAUDE.md etc.) that accumulate technology stack info across features.
5. **Task progress tracking**: `/speckit.implement` marks completed tasks as `[X]` in `tasks.md`, so a new session can see what's done.
6. **Clarification sessions**: `/speckit.clarify` appends a `### Session YYYY-MM-DD` subsection to track Q&A across sessions.

#### 2F. Handoffs Between Commands

Command files use a `handoffs:` frontmatter key:
```yaml
handoffs: 
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec...
    send: true
```
This tells the AI agent what to suggest next after completing the current command, enabling a guided workflow chain.

#### 2G. Constitution Pattern

The `constitution-template.md` and `spec-driven.md` describe an immutable set of principles (articles) that constrain what the AI can generate. Plans must pass "gates" (Simplicity Gate, Anti-Abstraction Gate, Integration-First Gate) before proceeding.

---

### KEY INSIGHT FOR YOUR PLANNING SKILL

**Spec-kit's answer to your core question ("should a script scaffold the structure or should the .md prescribe it?") is unambiguously: BOTH, in a specific division of labor.**

The pattern is:

1. **Shell scripts do the mechanical scaffolding**: create directories, copy templates, detect numbering, create git branches, output JSON paths. This costs zero AI tokens.

2. **The .md command file orchestrates the AI**: it tells the AI to (a) run the script first, (b) parse the JSON output, (c) read the template that was just copied, (d) fill it with intelligent content, (e) write it back. The .md file is the "prompt" but it never describes the directory structure to create -- it delegates that to the script.

3. **Templates are separate files**: They live in `templates/` and get copied by scripts. The AI reads them as reference but doesn't burn tokens reproducing them from memory.

The token-efficient insight: the .md command file is ~3-12KB of instructions, but it never contains the template content inline. Instead it says "read the template at this path" after the script has copied it into place. The script's JSON output provides the exact paths, so the AI knows where to read and write without any guessing.