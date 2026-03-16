# Cross-Repo Synthesis: Claude Code Workflow Automation

*Comparative analysis of 5 Claude Code workflow repos*

---

## The Automation Spectrum

| Repo | Approach | Plan Structure | Scaffolding Method |
|------|----------|---------------|-------------------|
| **superpowers** | Pure .md | Single file per plan | Claude creates files from skill instructions |
| **GSD** | Hybrid (heavy .md + CLI helpers) | ~15 files in `.planning/` tree | LLM runs `mkdir` per workflow .md, CLI handles state/templates |
| **ECC** | Hybrid (layered) | Plan file + session files | Scripts for infrastructure (worktrees, tmux), .md for content |
| **spec-kit** | Script-first | `specs/{feature}/` directory | Shell scripts scaffold + copy templates, .md orchestrates AI fill |
| **OpenSpec** | CLI-first | `openspec/changes/{name}/` | TypeScript CLI scaffolds dirs + provides JSON, SKILL.md orchestrates calls |

## Key Findings

### 1. Scaffolding Pattern (spec-kit + OpenSpec convergence)

Both independently arrived at the same architecture:
1. A script/CLI creates the directory structure (zero AI tokens)
2. The script outputs JSON with created paths
3. The SKILL.md tells the AI to call the script first, then populate results
4. Templates are separate files, copied by script, read by AI on demand

### 2. Session Management (ECC best practices)

- `session-start.js` loads context on new sessions
- `session-end.js` persists state on Stop
- `pre-compact.js` saves state before compaction
- "What did NOT work" pattern prevents retrying failed approaches
- `tmux-worktree-orchestrator.js` takes JSON plan → scaffolds parallel workers

### 3. State Management (GSD patterns)

- `gsd-tools.cjs` CLI for programmatic state manipulation
- STATE.md as short-term memory (<100 lines)
- `.continue-here.md` for mid-phase session handoff
- Context monitor hook fires warnings at 65%/75% usage
- Progress bar rendering from disk state

### 4. Simplicity (superpowers philosophy)

- Single-file plans, no scaffolding scripts
- Only automation: SessionStart hook injects skill loader
- Checkbox-based progress tracking
- Works well for simpler plan structures

### 5. Token Cost Reality

| Repo | System Files | Per-Workflow Load |
|------|-------------|-------------------|
| superpowers | ~50KB skills | ~5-10KB per skill |
| spec-kit | ~30KB CLI + templates | ~3-12KB per command |
| OpenSpec | ~30KB CLI + schemas | ~4KB per skill |
| GSD | ~808KB total | ~50-80KB per workflow |
| ECC | ~200KB+ total | ~10-20KB per command |

## Implications for Our Planning Skill

### Directory structure automation
- Bundle a shell script that creates the plan directory skeleton
- Script outputs JSON paths for Claude to consume
- SKILL.md orchestrates: "run script, then populate files"
- Structure lives in code, not in the skill's token-consuming prose

### Session management
- SessionStart hook checks for status.md and injects resume context
- Adopt "what did NOT work" pattern from ECC
- Overwrite handoff.md each session, propagate surprises back to plan

### Plan content
- Keep SKILL.md lean — describe what goes in each file, not the directory structure
- Templates as separate files, not inline in the skill
- Progressive disclosure: core principles always loaded, multi-session reference on demand
