// Skill: test-impl — Test design + TDD implementation (merged test-design + tdd-cycle)

export const SKILL_TEST_IMPL = `---
name: test-impl
description: This skill should be used when the user asks to "design and implement tests", "run test cycle", "write tests and implement". Design test cases and implement them via TDD in a single pass.
---

# test-impl

## Purpose

Design test cases from the SDD, then implement them via TDD (Red-Green-Refactor). This combines test-design and tdd-cycle into a single step. The SDD's interfaces are given — implement them as-is, do not redesign.

## Trigger

Activate when test design + TDD implementation is requested. Runs after SDD is complete.

## Prerequisites

\`\`\`bash
mkdir -p wiki/tests wiki/tdd wiki/knowledge
\`\`\`

## Key Principle

> **인터페이스는 SDD에 정의된 것을 그대로 사용한다.** 구현 시 인터페이스를 변경하거나 재설계하지 않는다.
> SDD의 Module Design, Interface 섹션에 명시된 시그니처, 타입, 데이터 흐름을 그대로 따른다.

## Workflow

### Phase 1: Test Design

1. **Read context**
   - Read the SDD from \`wiki/specs/{NNNN}.md\`
   - Read \`wiki/tests/\` to determine the next sequential 4-digit number
   - Read \`wiki/knowledge/\` for known conventions and gotchas

2. **Identify testable units**
   - Functions, modules, integrations, edge cases from the SDD
   - Use the SDD's interfaces as the test surface

3. **Design test cases**
   - Create test cases with ID, description, preconditions, steps, expected result
   - Define coverage goals (unit, integration, edge cases)
   - Detect the test framework from the project

4. **Write test design**
   - Create \`wiki/tests/{NNNN}.md\` using the test design template below

### Phase 2: TDD Implementation

5. **Execute TDD cycles** for each test case:

   a. **RED** — Write a failing test based on the SDD interface. Run it. Confirm it fails.
   b. **GREEN** — Write minimal code to make the test pass. Use the SDD's interface definitions as-is. Run it. Confirm it passes.
   c. **REFACTOR** — Clean up code while keeping tests green. Run tests. Confirm all pass.

6. **Final verification** — Run the full test suite to confirm no regressions

7. **Write TDD log**
   - Create \`wiki/tdd/{NNNN}.md\` using the TDD log template below

### Phase 3: Verify

8. **Verify output**
   - Confirm \`wiki/tests/{NNNN}.md\` exists (> 100 bytes)
   - Confirm \`wiki/tdd/{NNNN}.md\` exists (> 100 bytes)
   - Confirm all tests pass
   - If any check fails, fix before reporting completion

## Test Design Template

\`\`\`markdown
# Test Design-{NNNN}: {Title}

> Source: SDD-{NNNN}
> Date: {YYYY-MM-DD}
> Test Framework: {detected framework}

## 1. Test Strategy

{Overall approach: unit tests, integration tests, e2e tests}

## 2. Test Environment

- Runtime: {e.g., Node.js 20}
- Framework: {e.g., vitest, jest, pytest}
- Dependencies: {test utilities needed}

## 3. Test Cases

### TC-01: {Test Case Name}

- **Category**: Unit / Integration / E2E
- **Target**: {function/module being tested}
- **Preconditions**: {setup required}
- **Steps**:
  1. {step}
  2. {step}
- **Expected Result**: {what should happen}
- **Edge Cases**: {boundary conditions}

### TC-02: ...

## 4. Coverage Goals

| Category | Target |
|----------|--------|
| Unit | {e.g., core business logic 100%} |
| Integration | {e.g., API endpoints} |
| Edge Cases | {e.g., error paths, boundary values} |

## 5. Test Data

{Test fixtures, mock data, sample inputs}
\`\`\`

## TDD Log Template

\`\`\`markdown
# TDD Log-{NNNN}: {Title}

> Source: SDD-{NNNN}, Test Design-{NNNN}
> Date: {YYYY-MM-DD}
> Test Framework: {framework}

## Summary

- Total cycles: {N}
- Tests written: {N}
- Tests passing: {N}
- Files created: {N}
- Files modified: {N}

## Cycles

### Cycle 1: {Test Case ID} — {Description}

**RED**
- Test file: \\\`{path}\\\`
- Test: \\\`{test name}\\\`
- Result: FAIL (expected)
- Error: \\\`{error message}\\\`

**GREEN**
- Implementation: \\\`{path}\\\`
- Changes: {what was added/changed}
- Result: PASS

**REFACTOR**
- Changes: {what was cleaned up}
- Result: All tests PASS

### Cycle 2: ...

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| {path} | Created/Modified | {what} |

## Final Test Results

\\\`\\\`\\\`
{paste full test runner output}
\\\`\\\`\\\`
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/tests/{NNNN}.md\` — Test Design Document
- \`wiki/tdd/{NNNN}.md\` — TDD cycle log

Source code and test files are written to the project's source directories (not wiki/).

## Completion Checklist

- [ ] \`wiki/tests/{NNNN}.md\` exists with test cases
- [ ] \`wiki/tdd/{NNNN}.md\` exists with RED/GREEN/REFACTOR details
- [ ] All tests pass (full suite, no regressions)
- [ ] SDD interfaces were used as-is (not redesigned)
- [ ] Final test runner output included in TDD log

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's test framework and build tools automatically.
- Each RED-GREEN-REFACTOR cycle must be atomic and documented.
- **Do NOT change interfaces defined in the SDD.** Implement them as given.
`

export const SKILL_TEST_IMPL_EN = SKILL_TEST_IMPL  // Already in English
