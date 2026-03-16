# Research: GSD TDD Deep Dive

*Source: github.com/glittercowboy/get-shit-done (repo analysis via gh CLI)*
*Date: 2026-03-13*

---

## 1. TDD Implementation Summary

GSD implements TDD as a **first-class plan type** integrated into its multi-agent planning and execution system. TDD is not an afterthought or a bolted-on step -- it is baked into the planner's decision logic, the executor's task handling, the plan-checker's verification dimensions, and the post-execution test generation workflow.

### Core Mechanism: `type: tdd` Plans

The planner agent (`agents/gsd-planner.md`) contains a **TDD Detection** heuristic that runs during plan creation:

> "Can you write `expect(fn(input)).toBe(output)` before writing `fn`?"
> - Yes: Create a dedicated TDD plan (type: tdd)
> - No: Standard task in standard plan

When the answer is yes, the planner creates a dedicated PLAN.md with `type: tdd` in the frontmatter. This plan gets its own subagent context window because TDD is recognized as inherently context-heavy (RED + GREEN + REFACTOR cycles).

### TDD Candidates vs Skip

Candidates for TDD plans:
- Business logic with defined I/O
- API endpoints with request/response contracts
- Data transformations, parsing, formatting
- Validation rules and constraints
- Algorithms with testable behavior
- State machines and workflows
- Utility functions with clear specifications

Skip TDD (use standard `type="auto"` tasks):
- UI layout, styling, visual components
- Configuration changes
- Glue code connecting existing components
- One-off scripts and migrations
- Simple CRUD with no business logic
- Exploratory prototyping

### Task-Level TDD Flag

For code-producing tasks inside standard (non-TDD) plans, the planner can add `tdd="true"` to individual tasks:

```xml
<task type="auto" tdd="true">
  <name>Task: [name]</name>
  <files>src/feature.ts, src/feature.test.ts</files>
  <behavior>
    - Test 1: [expected behavior]
    - Test 2: [edge case]
  </behavior>
  <action>[Implementation after tests pass]</action>
  <verify><automated>npm test -- --filter=feature</automated></verify>
  <done>[Criteria]</done>
</task>
```

The executor agent recognizes `tdd="true"` and switches to the RED-GREEN-REFACTOR execution flow for that task.

### Reference File

All TDD details are codified in `get-shit-done/references/tdd.md`, which serves as the authoritative reference for both planner and executor agents.

---

## 2. Test Types & Granularity

GSD uses a **multi-layered testing/verification approach** with distinct mechanisms at different levels:

### Level 1: Per-Task Automated Verification (`<verify>` blocks)

Every task in every plan (not just TDD plans) has a `<verify>` block with an `<automated>` command. This is the **Nyquist Rule**: every task must have an automated verification command. If no test exists, the planner creates a Wave 0 task to generate the test scaffold first.

These are typically:
- Build commands: `npm run build succeeds`
- Curl checks: `curl -X POST localhost:3000/api/auth/login returns 200`
- CLI outputs: `pytest tests/test_module.py::test_behavior -x`
- File existence/content: grep patterns

### Level 2: Unit Tests (TDD Plans)

When the planner creates a `type: tdd` plan, the executor follows RED-GREEN-REFACTOR producing 2-3 atomic commits:
1. `test(08-02): add failing test for email validation` (RED)
2. `feat(08-02): implement email validation` (GREEN)
3. `refactor(08-02): extract regex to constant` (REFACTOR, optional)

Test quality guidelines are explicit:
- Test behavior, not implementation
- One concept per test
- Descriptive names (not "test1")
- No implementation details (don't mock internals)

### Level 3: Post-Phase Test Generation (`/gsd:add-tests`)

The `add-tests` command/workflow generates tests for already-completed phases. It:
1. Reads SUMMARY.md, CONTEXT.md, VERIFICATION.md for the phase
2. Classifies each changed file as TDD (unit), E2E (browser), or Skip
3. Presents classification to user for approval
4. Discovers existing test structure (directories, conventions, runners)
5. Generates test plan with specific test cases
6. Writes tests following discovered project conventions
7. Runs tests, flags bugs discovered, commits passing tests

Classification criteria:
- **TDD (Unit)**: Pure functions, business logic, parsers, validators, state machines, utilities
- **E2E (Browser)**: Keyboard shortcuts, navigation, forms, selection, drag-and-drop, modals, data grids
- **Skip**: UI layout/styling, config, glue code, migrations, simple CRUD, type definitions

### Level 4: Goal-Backward Verification (`gsd-verifier` agent)

After execution, the verifier agent checks the codebase against the phase goal using a 3-level artifact check:
1. **Exists** -- File is present
2. **Substantive** -- Not a stub/placeholder (runs stub detection patterns)
3. **Wired** -- Connected to the rest of the system (imports, API calls, data flow)

This is NOT traditional testing -- it is structural/static verification using grep, file checks, and pattern matching. It detects stubs, orphaned code, broken wiring, and anti-patterns.

### Level 5: User Acceptance Testing (`/gsd:verify-work`)

Conversational UAT where the system:
1. Extracts testable deliverables from SUMMARY.md
2. Presents them one at a time with expected behavior
3. User responds pass/fail in natural language
4. Severity is inferred from user's words (never asked)
5. Failed items get parallel debug agents
6. Diagnosed gaps feed into `/gsd:plan-phase --gaps` for fix plans

Includes a **Cold Start Smoke Test** injected when server/startup files were modified.

### Level 6: Nyquist Validation (`/gsd:validate-phase`)

A retroactive audit that ensures every requirement has automated verification coverage. The `gsd-nyquist-auditor` agent fills gaps by generating behavioral tests (unit, integration, or smoke) and running them. Implementation bugs are escalated, never fixed by the auditor.

### Level 7: Integration Checking (`gsd-integration-checker`)

Verifies cross-phase wiring at the milestone level:
- Export/import maps between phases
- API route consumer verification
- Auth protection on sensitive routes
- End-to-end flow tracing (component -> API -> DB -> display)
- Requirements integration map

---

## 3. Test-Plan Integration

### When Tests Are Written

GSD supports tests at multiple points in the lifecycle:

| Timing | Mechanism | When Used |
|--------|-----------|-----------|
| **Before code** | TDD plans (`type: tdd`) | Business logic, APIs, validations |
| **Before code** | Task-level `tdd="true"` | Individual tasks in standard plans |
| **During code** | `<verify>` blocks in every task | All tasks (Nyquist Rule) |
| **After code** | `/gsd:add-tests` command | Post-phase test generation |
| **After execution** | `gsd-verifier` agent | Structural verification |
| **After execution** | `/gsd:verify-work` UAT | Human acceptance testing |
| **Retroactive** | `/gsd:validate-phase` Nyquist audit | Gap-filling |

### How Tests Relate to Planning

**Planning Phase (`/gsd:plan-phase`):**
- Planner decides which features warrant TDD vs standard plans
- Every task gets `<verify>` with `<automated>` command (Nyquist Rule)
- If no test exists, Wave 0 tasks create test scaffolds
- Plan checker (Dimension 8: Nyquist Compliance) verifies:
  - Every task has automated verification
  - No watch-mode flags in test commands
  - Feedback latency is reasonable
  - Sampling continuity (no 3 consecutive tasks without automated verify)
  - Wave 0 completeness for MISSING references

**Execution Phase (`/gsd:execute-phase`):**
- TDD plans/tasks follow RED-GREEN-REFACTOR with separate commits per phase
- Verification failures trigger Node Repair workflow (retry, decompose, or prune)
- Acceptance criteria checked after every task (`<acceptance_criteria>`)

**Verification Phase (`/gsd:verify-work`):**
- UAT extracts testable scenarios from summaries
- Failed tests spawn parallel debug agents
- Root causes feed into gap closure plans

### The VALIDATION.md Contract

Created during `/gsd:plan-phase` after research, the VALIDATION.md file is a per-phase validation contract that specifies:
- Test infrastructure (framework, config, commands)
- Sampling rate (when to run tests during execution)
- Per-task verification map (task -> requirement -> test type -> command -> status)
- Wave 0 requirements (test scaffolds needed before execution)
- Manual-only verifications (with reasons why)
- Validation sign-off checklist

---

## 4. What We Can Learn

### Pattern 1: TDD as a Dedicated Plan Type

GSD recognizes that TDD is fundamentally heavier than linear execution and gives it dedicated context. A TDD feature gets its own plan, its own subagent, and its own context budget (~40% vs ~50% for standard). This prevents quality degradation from trying to do TDD inside a multi-task plan.

**Takeaway:** When incorporating TDD, treat it as a first-class execution mode with its own resource allocation, not as a bolt-on to regular task execution.

### Pattern 2: The Nyquist Rule (Every Task Gets Automated Verification)

Named after the sampling theorem, GSD requires every task to have an `<automated>` verification command. This creates a continuous feedback signal throughout execution. The plan checker enforces this structurally before execution begins.

**Takeaway:** Don't just test features -- test every atomic unit of work. The cost of writing verification commands is far less than the cost of detecting problems late.

### Pattern 3: TDD Detection Heuristic

The simple "can you write expect(fn(input)).toBe(output) before writing fn?" heuristic is elegant. It draws a clear line between testable-first code (pure functions, APIs, validators) and inherently hard-to-test code (UI, config, glue).

**Takeaway:** A simple, memorable heuristic beats a complex decision tree for when to apply TDD vs when to skip it.

### Pattern 4: Structural Verification as a Complement to Tests

GSD's verifier doesn't run the application. It uses grep, file reads, and pattern matching to verify:
- Files exist and are substantive (not stubs)
- Code is wired (components call APIs, APIs call databases)
- No anti-patterns (TODOs, placeholders, empty handlers)

This catches an entire class of bugs that tests miss: code that compiles and tests pass, but the system doesn't work because pieces aren't connected.

**Takeaway:** Add structural/static verification alongside functional tests. Particularly valuable for AI-generated code where stubs are a common failure mode.

### Pattern 5: Multi-Phase Verification Pipeline

GSD doesn't rely on a single verification mechanism. It layers:
1. Per-task automated checks (during execution)
2. Goal-backward structural verification (after execution, automated)
3. Human acceptance testing (after execution, manual)
4. Cross-phase integration checking (at milestone level)
5. Retroactive Nyquist auditing (gap-filling)

**Takeaway:** Build a verification pipeline with multiple mechanisms at different granularities. Each layer catches different failure modes.

### Pattern 6: Test Generation from Execution Artifacts

The `/gsd:add-tests` workflow is a novel approach: generate tests retroactively from SUMMARY.md, CONTEXT.md, and VERIFICATION.md. This means tests can be added systematically even if they weren't part of the original plan.

**Takeaway:** Execution summaries and acceptance criteria are specifications in disguise. They can be mechanically converted into test cases.

### Pattern 7: Stub Detection Patterns

GSD has extensive, codified patterns for detecting stubs across different artifact types (React components, API routes, database schemas, hooks). These are reusable across projects.

**Takeaway:** Codify stub detection patterns as reusable verification rules. Especially important for AI-generated code.

### Pattern 8: Context-Aware Test Budget

TDD plans target ~40% context usage (lower than standard ~50%) because the RED-GREEN-REFACTOR cycle involves more back-and-forth (write test, run, implement, run, refactor, run). This is an important practical consideration for AI agents doing TDD.

**Takeaway:** Budget more context/resources for TDD tasks than for linear implementation tasks.

---

## 5. Gaps & Weaknesses

### Gap 1: No Formal Test Pyramid

GSD does not explicitly formalize a test pyramid (many unit tests, fewer integration tests, fewest E2E tests). The `add-tests` workflow classifies files into TDD/E2E/Skip, but there's no guidance on ratios or a pyramid strategy. Tests emerge from per-feature analysis rather than a holistic architecture.

### Gap 2: TDD is Optional, Not Default

TDD is an opt-in path the planner takes based on a heuristic. The default path is standard plans with `<verify>` blocks. For many projects, the vast majority of code will follow the standard path with post-hoc verification rather than test-first development. The framework could be more opinionated about when TDD should be the default.

### Gap 3: No Continuous Test Running During Development

GSD runs tests per-task and per-plan, but there's no concept of a continuous test runner or test watcher. The Nyquist Rule ensures sampling, but there's no "always running" test feedback loop like you'd have with `vitest --watch` in a normal dev environment. In fact, the plan checker explicitly flags watch-mode commands as a BLOCKING FAIL.

### Gap 4: Limited Mutation Testing or Test Quality Assurance

There's guidance on writing good tests (test behavior not implementation, one concept per test), but no automated mechanism to verify test quality. No mutation testing, no coverage enforcement beyond the Nyquist minimum, no verification that tests actually test meaningful behavior.

### Gap 5: No Property-Based or Generative Testing

All testing is example-based (specific inputs and expected outputs). There's no concept of property-based testing (e.g., QuickCheck/fast-check style) where properties are defined and the framework generates test cases. This would be particularly powerful for the AI-generated validation rules and data transformations that GSD targets for TDD.

### Gap 6: Integration Tests Remain Structural

The `gsd-integration-checker` uses grep-based static analysis to trace connections (component -> API -> DB). This catches missing wiring but can't verify that the wiring actually works correctly. True integration tests that run the system end-to-end are left to human UAT.

### Gap 7: No Test Data Management

There's no formalized approach to test data (fixtures, factories, seeds). The testing template mentions fixture patterns as documentation, but there's no mechanism for managing test data across phases or ensuring test isolation.

### Gap 8: TDD Context Budget May Be Too Tight

The 40% context target for TDD plans assumes a single feature per plan. If the feature is complex (e.g., a state machine with many states and transitions), the test suite itself may consume significant context before implementation begins. There's no mechanism to detect or handle this scenario.

---

## 6. Key File References

### Core TDD Reference
- `get-shit-done/references/tdd.md` -- The authoritative TDD reference. Covers when to use TDD, plan structure, RED-GREEN-REFACTOR execution flow, test quality guidelines, framework setup, error handling, commit patterns, and context budget.

### Verification & Testing
- `get-shit-done/references/verification-patterns.md` -- Comprehensive stub detection patterns and verification checklists for React components, API routes, database schemas, hooks, environment config, and wiring verification.
- `get-shit-done/templates/VALIDATION.md` -- Per-phase validation strategy template with test infrastructure, sampling rate, per-task verification map, Wave 0 requirements, and compliance sign-off.
- `get-shit-done/templates/codebase/testing.md` -- Template for documenting project test patterns (framework, structure, mocking, fixtures, coverage, test types).
- `get-shit-done/templates/UAT.md` -- Persistent user acceptance testing session template.
- `get-shit-done/templates/verification-report.md` -- Phase verification report template.

### Commands & Workflows
- `commands/gsd/add-tests.md` -- Command definition for retroactive test generation.
- `get-shit-done/workflows/add-tests.md` -- Full workflow for classifying files, generating test plans, and creating tests.
- `commands/gsd/validate-phase.md` -- Command for Nyquist validation auditing.
- `get-shit-done/workflows/validate-phase.md` -- Full Nyquist audit workflow.
- `get-shit-done/workflows/verify-work.md` -- UAT workflow (formerly verify-phase).

### Agents
- `agents/gsd-executor.md` -- Executor agent with TDD execution flow (`<tdd_execution>` section), task commit protocol, and deviation rules.
- `agents/gsd-planner.md` -- Planner agent with TDD detection heuristic (`<task_breakdown>` section, TDD Detection subsection).
- `agents/gsd-plan-checker.md` -- Plan checker with 8 verification dimensions including Dimension 8: Nyquist Compliance.
- `agents/gsd-verifier.md` -- Goal-backward verification agent with stub detection patterns and 3-level artifact checking.
- `agents/gsd-nyquist-auditor.md` -- Specialized agent for filling validation gaps by generating and running tests.
- `agents/gsd-integration-checker.md` -- Cross-phase integration verification agent.

### Context & Monitoring
- `hooks/gsd-context-monitor.js` -- PostToolUse hook that warns agents when context is running low (35% WARNING, 25% CRITICAL). Relevant to TDD because TDD is inherently context-heavier.
- `docs/context-monitor.md` -- Documentation for the context monitoring system.

### GSD's Own Tests
- `tests/*.test.cjs` -- 17 test files testing GSD's own tooling (verify, config, frontmatter, init, state, etc.). Uses Node.js built-in `node:test` runner with `node:assert`. Tests the gsd-tools.cjs library, not the agent behaviors.
- `.github/workflows/test.yml` -- CI runs tests across 3 OS x 3 Node versions with c8 coverage (70% line minimum).
- `scripts/run-tests.cjs` -- Test runner script.
