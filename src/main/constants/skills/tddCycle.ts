// Skill: tdd-cycle — TDD (Red-Green-Refactor) cycle implementation

export const SKILL_TDD_CYCLE = `---
name: tdd-cycle
description: This skill should be used when the user asks to "implement with TDD", "run TDD cycle", "red-green-refactor". Execute TDD (Red-Green-Refactor) cycle implementation.
---

# tdd-cycle

## Purpose

Implement features or fixes using the TDD cycle: Red (failing test) -> Green (make it pass) -> Refactor.

## Trigger

Activate when TDD implementation, red-green-refactor cycle, or test-first development is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/tdd wiki/knowledge
\`\`\`

## Workflow

1. **Read context**
   - Read the test design from \`wiki/tests/{NNNN}.md\`
   - Read the SDD from \`wiki/specs/{NNNN}.md\`
   - Read \`wiki/tdd/\` to determine the next sequential 4-digit number
   - Read \`wiki/knowledge/\` for known conventions and gotchas

2. **Execute TDD cycles**
   For each test case from the test design:

   a. **RED** — Write a failing test. Run it. Confirm it fails.
   b. **GREEN** — Write minimal code to make the test pass. Run it. Confirm it passes.
   c. **REFACTOR** — Clean up code while keeping tests green. Run tests. Confirm all pass.

3. **Final verification**
   - Run the full test suite to confirm no regressions

4. **Write TDD log**
   - Create \`wiki/tdd/{NNNN}.md\` using the template below

5. **Verify output**
   - Confirm \`wiki/tdd/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - Confirm all tests pass
   - If any check fails, fix before reporting completion

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
- \`wiki/tdd/{NNNN}.md\` — TDD cycle log

Source code and test files are written to the project's source directories (not wiki/).

## Completion Checklist

- [ ] All test cases from the test design are implemented
- [ ] All tests pass (full suite, no regressions)
- [ ] \`wiki/tdd/{NNNN}.md\` exists with RED/GREEN/REFACTOR details for each cycle
- [ ] Final test runner output is included in the log
## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's test framework and build tools automatically.
- Each RED-GREEN-REFACTOR cycle must be atomic and documented.
`

export const SKILL_TDD_CYCLE_EN = SKILL_TDD_CYCLE  // Already in English
