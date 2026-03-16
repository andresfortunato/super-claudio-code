# OpenSpec TDD Analysis

Research date: 2026-03-13
Repository: https://github.com/Fission-AI/OpenSpec

---

## 1. TDD Implementation Summary

**OpenSpec does not implement TDD.** There is no red-green-refactor loop, no test-first workflow, no TDD skill, no test artifact type, and no mechanism that generates or runs automated tests as part of the spec-to-implementation pipeline.

What OpenSpec *does* have is a **spec-driven development workflow** with a post-implementation **verification skill**. The relationship to TDD is indirect:

- **Specs as test-like artifacts**: Specs use structured `### Requirement:` + `#### Scenario:` format with WHEN/THEN conditions. The schema instruction explicitly says "Specs should be testable -- each scenario is a potential test case." But this connection is aspirational -- nothing in the workflow actually generates executable tests from scenarios.

- **`/opsx:verify` skill (post-implementation)**: This is the closest thing to test verification. It checks three dimensions after code is written:
  1. **Completeness** -- Are all tasks done? Are all spec requirements addressed in the codebase?
  2. **Correctness** -- Does implementation match spec intent? Are scenarios covered? Do tests exist?
  3. **Coherence** -- Does implementation follow design decisions? Are patterns consistent?

  But verify is AI-driven heuristic checking (keyword search, file path analysis, "reasonable inference"), not automated test execution. It is explicitly positioned as a pre-archive validation step, not a test runner.

- **Mechanism**: The verify skill is a slash command (`/opsx:verify`) implemented as a skill template in `src/core/templates/workflows/verify-change.ts`. It instructs the AI agent to read change artifacts, search the codebase for implementation evidence, and produce a structured verification report. It is part of the "expanded" workflow profile, not the default core profile.

**The workflow flow is: propose -> spec -> design -> tasks -> implement -> verify -> archive.** Tests are written during the "implement" phase (as part of tasks), not before. There is no test-first enforcement.

---

## 2. Test Types & Granularity

### OpenSpec's Own Tests (the tool itself)

The OpenSpec codebase uses Vitest with a reasonable test pyramid:

| Type | Location | Examples |
|------|----------|---------|
| Unit tests | `test/core/`, `test/utils/`, `test/commands/` | Schema parsing, validation logic, markdown parsing, config handling |
| Integration tests | `test/core/artifact-graph/workflow.integration.test.ts` | End-to-end artifact graph workflow progression |
| E2E tests | `test/cli-e2e/basic.test.ts` | Full CLI invocations via spawned processes |
| Smoke tests | `scripts/test-postinstall.sh`, planned `add-qa-smoke-harness` | Shell-based postinstall validation, planned sandboxed CLI scenarios |

Key patterns:
- **Temp directory isolation**: Tests create temp directories per suite, `process.chdir()` into them, and restore afterward. The `improve-deterministic-tests` change formalized this pattern.
- **Vitest forks pool**: Tests use `pool: 'forks'` for process isolation since tests manipulate `process.cwd()`.
- **Zod schema validation tests**: Spec format validation uses Zod schemas with structured tests for requirement format (SHALL/MUST keywords, scenario presence, etc.).

### What OpenSpec Prescribes for Users

The framework says essentially nothing about test types or test strategy for user projects. The spec template's scenario format is implicitly test-like but there is no:
- Test artifact type in any schema
- Test generation from scenarios
- Test pyramid concept
- Distinction between unit/integration/e2e testing
- Guidance on when or how to write tests

The `config.yaml` example mentions "Testing: Vitest for unit tests, Playwright for e2e" as project context, but this is just a pass-through string to AI -- not a first-class concept.

---

## 3. Test-Spec Integration

### The Spec-Test Gap

This is OpenSpec's most significant gap. The connection between specs and tests is purely conceptual:

1. **Spec scenarios look like test cases** -- They use WHEN/THEN format that maps naturally to test assertions. The schema instruction says "each scenario is a potential test case."

2. **But scenarios never become tests** -- There is no mechanism to:
   - Generate test stubs from scenarios
   - Track which scenarios have corresponding tests
   - Ensure test coverage maps to spec coverage
   - Create a test list before implementation

3. **Verify checks for tests loosely** -- The verify skill's correctness dimension includes "Check if tests exist that cover the scenario" but this is heuristic AI analysis, not structured tracking.

### When Tests Are Written

Tests are written **during implementation**, as tasks within `tasks.md`. They are treated as implementation work, not as a planning artifact. Example from their own codebase:

```
## 4. Validation
- [x] 4.1 Convert affected command tests to isolated fixtures
- [x] 4.2 Verify tests pass consistently across environments
- [x] 4.3 Confirm no reads from real repo state during tests
```

### No Test Artifact Type

The default `spec-driven` schema has exactly four artifacts: `proposal`, `specs`, `design`, `tasks`. There is no `tests` artifact. A custom schema could add one:

```yaml
artifacts:
  - id: tests
    generates: tests.md
    requires: [specs]
```

But this is not provided, documented, or suggested.

---

## 4. What We Can Learn

### Strong Patterns Worth Adopting

1. **Structured scenario format as test precursors**: The `### Requirement:` + `#### Scenario:` + WHEN/THEN pattern is excellent scaffolding for test lists. Each scenario is a testable behavior statement. We should build on this by making the connection explicit and executable.

2. **Three-dimensional verification model**: The verify skill's Completeness / Correctness / Coherence framework is a good mental model for post-implementation validation. The severity levels (CRITICAL / WARNING / SUGGESTION) with actionable recommendations are well-designed.

3. **Artifact dependency graph**: The DAG-based schema system (`requires: [specs, design]`) is elegant. It enables flexible ordering while maintaining logical dependencies. We could use similar dependency modeling for test artifacts.

4. **Delta-based spec changes**: The ADDED/MODIFIED/REMOVED delta format for specs is clever for brownfield work. A similar pattern for test modifications could work well.

5. **Graceful degradation in verification**: The verify skill adapts its checking based on available artifacts (tasks-only, tasks+specs, full artifacts). This pragmatic approach avoids all-or-nothing verification.

6. **Schema customization**: The ability to fork/create custom schemas means teams can add test artifacts if they want. The infrastructure supports it even if the defaults don't include it.

7. **Fluid iteration model**: The "actions not phases" philosophy means you can update specs during implementation. This is more realistic than rigid phase gates and compatible with TDD's learning-as-you-go nature.

### Specific Ideas for Our Framework

- **Test list as artifact**: Add a `test-plan` or `tests` artifact that depends on `specs`, is required before `tasks`, and contains test scenarios derived from spec requirements. This bridges the spec-test gap.
- **Scenario-to-test traceability**: Each spec scenario should have a corresponding test (or explicit skip justification). Track this mapping.
- **Red-green-refactor as a task pattern**: Structure tasks.md to interleave test-writing and implementation tasks: "Write test for X" -> "Implement X" -> "Refactor X".
- **Test verification as part of verify**: Extend the verify concept to actually run tests, not just search for their existence heuristically.

---

## 5. Gaps & Weaknesses

### Critical Gaps

1. **No TDD support whatsoever**: Despite having a spec format that naturally maps to test cases, there is zero machinery connecting specs to tests. Scenarios are written but never tracked against test implementations. This is the biggest missed opportunity in the entire framework.

2. **Verify is heuristic, not deterministic**: The verify skill uses "keyword search, file path analysis, reasonable inference" to assess implementation. It explicitly says "don't require perfect certainty." This means verification can miss real problems or flag false positives. A framework that actually ran tests would provide deterministic correctness checking.

3. **No test artifact in default schema**: Tests are treated as implementation details within tasks, not as first-class planning artifacts. This means test strategy is never explicitly planned or reviewed before implementation begins.

4. **No test-first enforcement**: The workflow is spec -> design -> tasks -> implement. Tests happen during implement. There is no mechanism to write tests before implementation code, even though the spec scenarios provide perfect material for it.

5. **No CI integration from the framework**: OpenSpec's own CI runs tests, but the framework provides no guidance or tooling for integrating spec-scenario-based testing into user project CI pipelines.

### Moderate Gaps

6. **Scenario format is not executable**: WHEN/THEN scenarios are markdown prose. They could be structured data (YAML, JSON) that tooling could parse and generate test stubs from.

7. **No test coverage tracking**: No mechanism to track which spec requirements/scenarios have corresponding tests, creating a coverage gap that grows over time.

8. **Verify is optional and expanded-only**: The verify skill is part of the expanded workflow profile, not the default core profile. Most users will never use it unless they explicitly opt in.

9. **No feedback loop from tests to specs**: If tests reveal that a spec scenario is wrong or incomplete, there is no formalized path to update the spec. The "fluid" philosophy allows it informally, but nothing guides the user.

### Minor Gaps

10. **No test pyramid guidance**: No concept of test types (unit, integration, e2e) or appropriate ratios/strategies.

11. **QA smoke harness is in-progress**: The `add-qa-smoke-harness` change shows awareness of the gap in their own testing (sandboxed CLI testing), but it is not yet merged.

---

## 6. Key File References

### Core Workflow & Schema

| File | Description |
|------|-------------|
| `schemas/spec-driven/schema.yaml` | Default schema definition: proposal -> specs -> design -> tasks dependency graph with apply instructions |
| `schemas/spec-driven/templates/spec.md` | Spec template -- just ADDED Requirements with Requirement/Scenario structure |
| `schemas/spec-driven/templates/tasks.md` | Tasks template -- checkbox format for tracking implementation progress |

### Verify Skill (Closest to TDD)

| File | Description |
|------|-------------|
| `src/core/templates/workflows/verify-change.ts` | Full verify skill implementation: Completeness/Correctness/Coherence with CRITICAL/WARNING/SUGGESTION severity |
| `openspec/changes/archive/2026-02-17-add-verify-skill/proposal.md` | Verify skill proposal explaining the three verification dimensions |
| `openspec/changes/archive/2026-02-17-add-verify-skill/specs/opsx-verify-skill/spec.md` | Detailed verify skill spec with all scenarios |
| `openspec/changes/archive/2026-02-17-add-verify-skill/design.md` | Design decision: dynamic generation via setup command pattern |
| `openspec/specs/opsx-verify-skill/spec.md` | Merged main spec for verify skill |

### Apply Skill (Implementation Phase)

| File | Description |
|------|-------------|
| `src/core/templates/workflows/apply-change.ts` | Apply skill: reads tasks.md, implements tasks, marks checkboxes. Tests are written here as implementation work. |

### Testing Infrastructure (OpenSpec's Own Tests)

| File | Description |
|------|-------------|
| `vitest.config.ts` | Vitest config: forks pool, 10s timeout, process isolation |
| `test/core/artifact-graph/workflow.integration.test.ts` | Integration test: full artifact graph workflow with temp directories |
| `test/core/validation.test.ts` | Unit tests for Zod-based spec/change validation schemas |
| `test/cli-e2e/basic.test.ts` | E2E tests: full CLI invocations via spawned processes |
| `openspec/changes/archive/2025-09-29-improve-deterministic-tests/proposal.md` | Change that formalized temp fixture isolation pattern for tests |

### Test Quality Improvements

| File | Description |
|------|-------------|
| `openspec/changes/add-qa-smoke-harness/specs/developer-qa-workflow/spec.md` | Planned QA smoke harness: sandboxed CLI scenario runner, Makefile entry points |

### Documentation

| File | Description |
|------|-------------|
| `docs/opsx.md` | OPSX workflow docs: fluid actions, dependency graph, custom schemas |
| `docs/concepts.md` | Core concepts: specs, changes, artifacts, delta specs, archive |
| `docs/workflows.md` | Workflow patterns including verify-before-archive recommendation |
| `docs/commands.md` | Full command reference including /opsx:verify |
| `docs/customization.md` | Custom schemas and project config including test context injection |
