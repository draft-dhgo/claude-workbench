// Skill: bugfix — Bug root cause analysis and fix reporting

export const SKILL_BUGFIX = `---
name: bugfix
description: This skill should be used when the user asks to "fix a bug", "debug this issue", "investigate the error". Bug root cause analysis and fix pipeline entry point.
---

# bugfix

## Purpose

Entry point for the bugfix cycle. Collect bug report, investigate root cause, and document findings.

## Trigger

Activate when bug fixing, debugging, or error investigation is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/bugfix wiki/knowledge
\`\`\`

## Workflow

1. **Read context**
   - Read \`wiki/bugs/README.md\` for the bug description (if available)
   - Read \`wiki/bugfix/\` to determine the next sequential 4-digit number
   - Read \`wiki/knowledge/\` for known gotchas and architecture

2. **Collect bug report**
   - Symptoms, error messages, stack traces
   - Reproduction steps
   - Expected vs actual behavior

3. **Investigate root cause**
   - Explore code paths related to the bug
   - Analyze logs and error output
   - Reproduce the bug and confirm the issue

4. **Document findings**
   - Create \`wiki/bugfix/{NNNN}.md\` using the template below

5. **Verify output**
   - Confirm \`wiki/bugfix/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - If check fails, fix before reporting completion

## Bugfix Report Template

\`\`\`markdown
# Bugfix-{NNNN}: {Bug Title}

> Source: BUG-{XXX}
> Date: {YYYY-MM-DD}
> Severity: {Critical / High / Medium / Low}
> Status: Investigated

## 1. Bug Description

{What is happening — symptoms, error messages}

## 2. Reproduction Steps

1. {step}
2. {step}
3. {observe: error/unexpected behavior}

## 3. Expected vs Actual

- **Expected**: {what should happen}
- **Actual**: {what happens instead}

## 4. Root Cause Analysis

{Why the bug occurs — specific code path, logic error, race condition, etc.}

### Affected Code

| File | Line(s) | Issue |
|------|---------|-------|
| {path} | {lines} | {what's wrong} |

## 5. Proposed Fix

{How to fix it — approach, which files to change}

## 6. Risk Assessment

{What else might break, regression risk}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/bugfix/{NNNN}.md\` — Bug report and root cause analysis

## Completion Checklist

- [ ] \`wiki/bugfix/{NNNN}.md\` exists with root cause analysis
- [ ] Reproduction steps documented
- [ ] Affected files identified
- [ ] Proposed fix strategy described
## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
`

export const SKILL_BUGFIX_EN = SKILL_BUGFIX  // Already in English
