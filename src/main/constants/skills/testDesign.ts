// Skill: test-design — Test design document creation

export const SKILL_TEST_DESIGN = `---
name: test-design
description: This skill should be used when the user asks to "design tests", "write test plan", "create test strategy". Write test design documents.
---

# test-design

## Purpose

Create a test design document that specifies test strategy, test cases, and coverage goals.

## Trigger

Activate when test design, test planning, or test strategy creation is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/tests wiki/knowledge
\`\`\`

## Workflow

1. **Read context**
   - Read the relevant SDD from \`wiki/specs/\`
   - Read \`wiki/tests/\` to determine the next sequential 4-digit number
   - Read \`wiki/knowledge/\` for known conventions and gotchas

2. **Identify testable units**
   - Functions, modules, integrations, edge cases from the SDD

3. **Design test cases**
   - Create test cases with ID, description, preconditions, steps, expected result
   - Define coverage goals (unit, integration, edge cases)
   - Identify the test framework to use (detect from project)

4. **Write test design**
   - Create \`wiki/tests/{NNNN}.md\` using the template below

5. **Verify output**
   - Confirm \`wiki/tests/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - If check fails, fix before reporting completion

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

### TC-02: {Test Case Name}

...

## 4. Coverage Goals

| Category | Target |
|----------|--------|
| Unit | {e.g., core business logic 100%} |
| Integration | {e.g., API endpoints} |
| Edge Cases | {e.g., error paths, boundary values} |

## 5. Test Data

{Test fixtures, mock data, sample inputs}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/tests/{NNNN}.md\` — Test Design Document

## Completion Checklist

- [ ] \`wiki/tests/{NNNN}.md\` exists with all template sections filled
- [ ] Test cases reference the source SDD
- [ ] Each test case has ID, steps, and expected result
## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's actual test framework automatically. Do not hardcode.
`

export const SKILL_TEST_DESIGN_EN = SKILL_TEST_DESIGN  // Already in English
