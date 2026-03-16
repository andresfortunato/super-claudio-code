# Superpowers TDD Deep Dive

Research on how `obra/superpowers` implements Test-Driven Development for a Claude Code productivity framework.

---

## 1. TDD Implementation Summary

Superpowers treats TDD as a **mandatory, non-negotiable discipline** enforced through a dedicated skill (`skills/test-driven-development/SKILL.md`) that activates during all implementation work. It is not a suggestion or best practice -- it is framed as an "Iron Law":

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

### Mechanism

TDD is enforced through multiple reinforcing layers:

1. **Dedicated Skill** (`skills/test-driven-development/SKILL.md`) -- A comprehensive ~600-line document that defines the RED-GREEN-REFACTOR cycle, provides examples, anticipates and counters rationalizations, and includes a verification checklist.

2. **Plan Integration** -- The `writing-plans` skill mandates that every task in an implementation plan follows TDD structure:
   - Step 1: Write the failing test
   - Step 2: Run it to verify it fails
   - Step 3: Write minimal implementation
   - Step 4: Run it to verify it passes
   - Step 5: Commit

3. **Subagent Enforcement** -- The implementer subagent prompt (`implementer-prompt.md`) explicitly instructs subagents to "Write tests (following TDD if task says to)" and self-review includes checking "Did I follow TDD if required?"

4. **Two-Stage Review** -- Spec compliance reviewers and code quality reviewers independently verify that tests exist and were written correctly, creating external accountability.

5. **Verification-Before-Completion Skill** -- A separate skill that requires evidence (actual test output) before any claim of completion. Prevents "should pass" or "looks correct" assertions.

6. **Anti-Pattern Reference** (`testing-anti-patterns.md`) -- Loaded when writing or changing tests, explicitly cataloging 5 anti-patterns (testing mock behavior, test-only methods in production, mocking without understanding, incomplete mocks, tests as afterthought).

### The "Delete and Start Over" Rule

The most distinctive aspect: if code is written before tests, the rule is to **delete the code entirely** and start over. Not keep it as reference, not adapt it, not look at it. Delete means delete. This is explicitly reinforced with counters to every rationalization (sunk cost, pragmatism, spirit-vs-letter arguments).

### TDD for Documentation/Skills Too

Superpowers applies the TDD metaphor to skill creation itself (`writing-skills/SKILL.md`):
- RED: Run pressure scenario without skill, watch agent fail
- GREEN: Write skill that addresses specific observed failures
- REFACTOR: Find new rationalizations, plug loopholes, re-test

This is a genuinely novel approach -- treating documentation quality as something that can be test-driven.

---

## 2. Test Types & Granularity

### Types Present in the Framework

| Type | Where | Description |
|------|-------|-------------|
| **Unit tests** | Plan tasks | Every function/method gets a test. Plans specify exact test files and assertions. |
| **Integration tests** | `tests/claude-code/test-subagent-driven-development-integration.sh` | Full end-to-end test of the SDD workflow: scaffolds a project, runs Claude headlessly, parses session transcripts to verify behavior. |
| **Skill-triggering tests** | `tests/skill-triggering/` | Verify that specific prompts cause the correct skill to be loaded. |
| **Pressure tests (for skills)** | `skills/writing-skills/testing-skills-with-subagents.md` | Subagent-based tests that verify skills resist rationalization under combined pressures (time + sunk cost + authority + exhaustion). |
| **Behavior tests for the framework itself** | `tests/claude-code/test-subagent-driven-development.sh` | Tests that verify the skill is understood correctly by asking Claude questions about it and asserting on responses. |
| **Real project tests** | `tests/subagent-driven-dev/go-fractals/`, `tests/subagent-driven-dev/svelte-todo/` | Full project scaffolds with plans that exercise the entire workflow end-to-end. |

### Granularity in Practice

The framework strongly favors **unit-level tests within implementations** but uses **integration/behavioral tests for the framework itself**. The test pyramid concept is implicit rather than explicit:

- Plans prescribe unit tests for individual functions
- The framework's own tests are behavioral/integration (running actual Claude sessions)
- There is no explicit test pyramid discussion or guidance on when to use which level

### Testing Approach for Code vs. Skills

For **code**: Standard unit tests (Jest, pytest, Go test, etc.) following strict TDD.

For **skills/documentation**: A unique "pressure testing" methodology where subagents are placed in realistic scenarios with combined pressures to verify the documentation actually changes agent behavior. This uses a RED-GREEN-REFACTOR cycle adapted for documentation.

---

## 3. Test-Plan Integration

### Tests Are First-Class Plan Citizens

The `writing-plans` skill mandates that every task in an implementation plan follows this exact structure:

```
Task N: [Component Name]
- [ ] Step 1: Write the failing test (with exact test code)
- [ ] Step 2: Run test to verify it fails (with exact command and expected failure)
- [ ] Step 3: Write minimal implementation (with exact code)
- [ ] Step 4: Run test to verify it passes (with exact command)
- [ ] Step 5: Commit
```

This means:
- **Tests are specified at planning time**, not implementation time
- The plan author writes both the test code and the implementation code
- The implementer is following a recipe, not making testing decisions
- Test expectations (what the failure message should be) are specified upfront

### Relationship Between Phases

```
Brainstorming --> Design Doc --> Plan (with tests baked in) --> Execution (TDD enforced per task)
```

1. **Brainstorming** covers testing approach at design level ("testing" is listed as a required design section)
2. **Writing Plans** bakes exact test code into each task at 2-5 minute granularity
3. **Execution** (via subagent-driven-development or executing-plans) follows the plan exactly
4. **Code Review** (two-stage: spec compliance then quality) verifies tests exist and are meaningful
5. **Finishing** requires all tests to pass before offering merge/PR options

### When Tests Are Written

Tests are conceptually designed during planning and physically written first during execution. The plan specifies what the test should look like; the implementer subagent writes it as its first step for each task.

---

## 4. What We Can Learn

### 4.1 Rationalization-Resistant Design

The most valuable pattern: anticipating and explicitly countering every rationalization an agent (or human) might use to skip discipline. The TDD skill includes:
- A comprehensive rationalization table (11 excuses with rebuttals)
- A red flags list (12 warning signs)
- A "Why Order Matters" section addressing 5 specific "tests after" arguments
- Explicit "Delete means delete" with 4 sub-points preventing workarounds

**Takeaway:** Any discipline-enforcing rule in our framework should include an explicit rationalization table built from real testing.

### 4.2 Verification-Before-Completion as Separate Concern

Separating "did you actually run the tests" from "did you follow TDD" is smart. The verification skill is a general-purpose gate that applies to any claim of completion, not just test-related claims. Its core insight: evidence before assertions, always.

**Takeaway:** We should have a verification gate that is independent of the methodology being used.

### 4.3 Testing at the Documentation/Skill Level

The idea of pressure-testing documentation with subagents is genuinely novel. Instead of just reviewing a document for clarity, you put an agent in a situation where the document should change behavior, and verify it actually does.

**Takeaway:** We could apply this to our own planning templates and execution instructions.

### 4.4 Plan-Level Test Specification

Having the plan author write the exact test code (not just "write tests for X") ensures:
- Tests are designed by someone with full context
- Implementers don't have to make testing judgment calls
- Test quality is reviewable at plan review time

**Takeaway:** Our plans should include exact test code, not just test descriptions.

### 4.5 Two-Stage Review (Spec Compliance then Code Quality)

The separation of "did you build what was asked" from "is it well-built" is useful. The spec reviewer is explicitly told to be skeptical and not trust the implementer's report.

**Takeaway:** We should separate correctness verification from quality verification.

### 4.6 The "Iron Law" Pattern

Framing rules as "iron laws" with explicit "no exceptions" clauses is more effective than "best practices" or "guidelines." The language is deliberately absolute:
- "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST"
- "Violating the letter of the rules is violating the spirit of the rules"
- "Delete means delete"

**Takeaway:** Critical rules should be stated as absolutes, not guidelines.

### 4.7 Anti-Pattern Documentation

The `testing-anti-patterns.md` reference is loaded contextually ("when writing or changing tests, adding mocks") and provides gate functions for each anti-pattern -- decision procedures that agents follow before making testing decisions.

**Takeaway:** Gate functions (explicit decision procedures) are more effective than guidelines.

---

## 5. Gaps & Weaknesses

### 5.1 No Explicit Test Pyramid

There is no guidance on when to write unit vs. integration vs. e2e tests. The implicit assumption is "always unit tests." For complex systems with multiple services or components, this could lead to excessive mocking or insufficient integration testing.

### 5.2 Test Quality is Plan-Author Dependent

Since tests are specified in the plan, their quality depends entirely on the plan author. If the plan author writes weak tests (testing implementation rather than behavior, missing edge cases), the implementer just follows them. The code quality reviewer can catch some of this, but the primary quality gate is at plan authoring time.

### 5.3 No Mutation Testing or Coverage Metrics

There's no mechanism to verify that tests are actually effective. No mutation testing, no coverage thresholds, no test effectiveness metrics. The only validation is the RED-GREEN cycle (watching the test fail first), which is good but not sufficient for complex systems.

### 5.4 Limited Guidance for Test Infrastructure

The anti-patterns document is good but limited. There's no guidance on:
- Test fixture management
- Test data generation
- Test isolation strategies
- Performance testing
- Property-based testing
- Contract testing between services

### 5.5 Mocking Guidance is Defensive Rather Than Prescriptive

The anti-patterns document says "don't test mocks" and "don't mock without understanding" but doesn't provide clear guidance on WHEN mocking is appropriate and what the alternatives are (dependency injection, test doubles, test containers, etc.).

### 5.6 No Test Maintenance Strategy

No guidance on what to do when:
- Tests become slow
- Test suites become flaky
- Tests need refactoring
- Tests are testing implementation details that change
- Test infrastructure needs upgrading

### 5.7 Binary Pass/Fail for Skill Testing

The pressure testing methodology for skills is creative but binary: agent either follows the rule or doesn't. There's no mechanism for partial compliance, graduated enforcement, or measuring improvement over time.

### 5.8 Heavy Reliance on Agent Compliance

The entire system depends on the agent reading, understanding, and following skill instructions. There are no automated enforcement mechanisms (linters, pre-commit hooks that verify test files exist, CI checks). The hooks.json only has a SessionStart hook.

### 5.9 No Guidance on Test Naming Conventions

Beyond "clear name that describes behavior," there's no convention for test naming (given/when/then, should-style, etc.) or test file organization patterns.

---

## 6. Key File References

### Core TDD Files

| File | Description |
|------|-------------|
| `skills/test-driven-development/SKILL.md` | The central TDD skill. ~600 lines defining the RED-GREEN-REFACTOR cycle, Iron Law, rationalization table, red flags, examples, and verification checklist. |
| `skills/test-driven-development/testing-anti-patterns.md` | Reference doc on 5 testing anti-patterns: testing mock behavior, test-only production methods, mocking without understanding, incomplete mocks, tests as afterthought. Includes gate functions for each. |
| `skills/verification-before-completion/SKILL.md` | Separate skill requiring evidence before any completion claim. Includes gate function pattern and common failure table. |

### Workflow Integration Files

| File | Description |
|------|-------------|
| `skills/writing-plans/SKILL.md` | Plan authoring skill that mandates TDD task structure (test first, verify fail, implement, verify pass, commit). |
| `skills/subagent-driven-development/SKILL.md` | Execution skill that dispatches per-task subagents with two-stage review. References TDD for implementer work. |
| `skills/subagent-driven-development/implementer-prompt.md` | Template for implementer subagents. Includes TDD requirement and self-review testing checklist. |
| `skills/subagent-driven-development/spec-reviewer-prompt.md` | Template for spec compliance review. Skeptical posture, reads code independently. |
| `skills/subagent-driven-development/code-quality-reviewer-prompt.md` | Template for code quality review. Checks test quality among other concerns. |

### Skill Testing Methodology

| File | Description |
|------|-------------|
| `skills/writing-skills/SKILL.md` | Skill creation guide that applies TDD to documentation: baseline test (RED), write skill (GREEN), close loopholes (REFACTOR). |
| `skills/writing-skills/testing-skills-with-subagents.md` | Detailed methodology for pressure-testing skills with subagents. Covers pressure types, scenario design, loophole plugging, meta-testing. |
| `skills/writing-skills/examples/CLAUDE_MD_TESTING.md` | Worked example of testing documentation variants with 4 scenarios and 4 documentation variants. |

### Test Infrastructure

| File | Description |
|------|-------------|
| `tests/claude-code/test-helpers.sh` | Shared test utilities: `run_claude`, `assert_contains`, `assert_order`, `create_test_project`, etc. |
| `tests/claude-code/test-subagent-driven-development-integration.sh` | Full integration test: scaffolds project, runs Claude headlessly, parses session transcript, verifies workflow behavior. |
| `tests/claude-code/test-subagent-driven-development.sh` | Knowledge tests: asks Claude questions about the SDD skill and asserts on responses. |
| `tests/skill-triggering/prompts/test-driven-development.txt` | Trigger prompt for verifying TDD skill loads when implementation is requested. |
| `tests/subagent-driven-dev/go-fractals/plan.md` | Real test plan (Go CLI fractals tool, 10 tasks) used for integration testing. |
| `docs/testing.md` | Documentation on how to test superpowers skills, including integration test structure and token analysis. |

### Supporting Files

| File | Description |
|------|-------------|
| `skills/systematic-debugging/SKILL.md` | 4-phase debugging skill that requires a failing test case in Phase 4 before any fix. |
| `skills/finishing-a-development-branch/SKILL.md` | Requires all tests to pass before offering merge/PR/keep/discard options. |
| `hooks/hooks.json` | Only has a SessionStart hook. No test-related automation hooks. |
| `skills/using-superpowers/SKILL.md` | Meta-skill that makes skill invocation mandatory (even 1% chance = must invoke). |
