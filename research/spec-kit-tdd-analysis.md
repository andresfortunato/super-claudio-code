# spec-kit TDD Analysis

Research date: 2026-03-13
Repository: https://github.com/github/spec-kit

---

## 1. TDD Implementation Summary

Spec-kit does **not** have a dedicated TDD skill, command, or automation. Instead, TDD is woven into the framework through **instructional text in templates and command prompts** that guide the LLM agent's behavior.

**Constitution Template** (`templates/constitution-template.md`): Includes a commented-out example principle called "III. Test-First (NON-NEGOTIABLE)" with the note: "TDD mandatory: Tests written -> User approved -> Tests fail -> Then implement; Red-Green-Refactor cycle strictly enforced." However, this is **just an example placeholder** -- each project creates its own constitution, and TDD is only enforced if the project constitution explicitly mandates it.

**The spec-driven.md methodology document** describes TDD as aspirational philosophy: "Article III: Test-First Imperative — This is NON-NEGOTIABLE: All implementation MUST follow strict Test-Driven Development." And "Article IX: Integration-First Testing — Tests MUST use realistic environments: Prefer real databases over mocks."

But critically, **these articles are the constitution of the example "Specify" project** (the dog-fooding example), not mandatory rules for all projects using spec-kit.

**Tasks template** (`templates/tasks-template.md`): "Tests are OPTIONAL - only include them if explicitly requested in the feature specification." When included, tests MUST be written and FAIL before implementation.

**Implement command** (`templates/commands/implement.md`): "Follow TDD approach: Execute test tasks before their corresponding implementation tasks." Phase ordering: "Setup first -> Tests before code -> Core development -> Integration work -> Polish and validation."

**The mechanism is purely instructional** -- no code, hook, CI gate, or automated enforcement.

---

## 2. Test Types & Granularity

Spec-kit references four test types in a clear hierarchy:

1. **Contract tests** -- Test interface contracts (API specs, schemas). Written first. File creation order: "contract -> integration -> e2e -> unit"
2. **Integration tests** -- Test user journeys across components. "Prefer real databases over mocks, Use actual service instances over stubs."
3. **E2E tests** -- End-to-end tests covering full user scenarios.
4. **Unit tests** -- Listed last in creation order. In "Polish & Cross-Cutting Concerns" phase.

The hierarchy is clearly **contract > integration > unit**, which inverts the traditional test pyramid. "Article IX: Integration-First Testing" prioritizes realistic integration environments over isolated mocks.

---

## 3. Test-Spec Integration

The relationship follows a clear pipeline: **Spec -> Plan -> Contracts -> Tests -> Implementation**

1. **`/speckit.specify`**: Creates user stories with acceptance scenarios in Given/When/Then format
2. **`/speckit.plan`**: Generates `contracts/` directory with API specifications
3. **`/speckit.tasks`**: Optionally includes test tasks **before** implementation tasks
4. **`/speckit.implement`**: Executes tasks respecting the ordering
5. **`/speckit.checklist`**: Creates "unit tests for requirements" -- validating spec quality
6. **`/speckit.analyze`**: Cross-artifact consistency checking coverage gaps

---

## 4. What We Can Learn

**Pattern 1: "Unit Tests for Requirements" (Checklists)** — The `/speckit.checklist` command treats specifications as code and applies unit-testing methodology to validate completeness, clarity, consistency, and measurability.

**Pattern 2: Contract-First Test Ordering** — contract -> integration -> e2e -> unit ensures interfaces are defined and tested before implementations exist.

**Pattern 3: Tests as Optional but Ordered** — Opt-in model avoids forcing TDD on quick prototypes while supporting it fully when desired.

**Pattern 4: Spec-to-Test Traceability** — Every user story has acceptance scenarios mapping to test cases. Every task has a user story label ([US1], [US2]).

**Pattern 5: Constitution as Architectural Constraint** — Making TDD a constitutional principle that all subsequent commands check against.

**Pattern 6: Cross-Artifact Validation** — `/speckit.analyze` performs consistency analysis across spec, plan, and tasks.

**Pattern 7: Progressive Quality Gates** — Multiple checkpoints: specify -> clarify -> plan -> analyze -> implement.

**Pattern 8: Hook System for Custom Testing** — Extension hooks (`before_implement`, `after_implement`) allow custom test/validation steps.

---

## 5. Gaps & Weaknesses

1. **No Mechanical TDD Enforcement** — Purely textual guidance for LLM. No hook, CI gate, or validation.
2. **Tests Are Optional by Default** — Despite "NON-NEGOTIABLE" in example constitution, tests are opt-in.
3. **No Test Execution or Verification** — No test runner integration. Relies on LLM running test commands.
4. **No Red-Green-Refactor Formalization** — Cycle is mentioned but tasks don't have explicit verify-fails/verify-passes steps.
5. **No Test Pyramid Strategy** — Four test types referenced but no guidance on balance or ratios.
6. **No Continuous Testing Loop** — No regression testing concept.
7. **No Test Generation from Acceptance Scenarios** — Given/When/Then scenarios ideal for auto-generation but nothing converts them.
8. **Checklist Validation is Manual** — LLM checks items, not automated validation.

---

## 6. Key File References

| File | Description |
|------|-------------|
| `templates/commands/implement.md` | TDD ordering instructions |
| `templates/commands/tasks.md` | Task generation; tests optional but ordered |
| `templates/tasks-template.md` | Test-first structure per user story phase |
| `templates/commands/checklist.md` | "Unit tests for requirements" |
| `templates/commands/analyze.md` | Cross-artifact consistency analysis |
| `templates/constitution-template.md` | Example TDD constitutional principles |
| `spec-driven.md` | Full methodology with TDD philosophy |
| `tests/hooks/TESTING.md` | Extension hook system documentation |
