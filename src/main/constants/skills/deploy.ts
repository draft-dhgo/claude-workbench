// Skill: deploy — Build, verification, and deployment

export const SKILL_DEPLOY = `---
name: deploy
description: This skill should be used when the user asks to "deploy", "build for production", "run the build". Handle build, database integration, and local hosting.
---

# deploy

## Purpose

Execute production build, verify deployment artifacts, and log results.

## Trigger

Activate when build, deployment, or local hosting is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/deploy
\`\`\`

## Workflow

1. **Detect build system**
   - Read \`package.json\`, \`Makefile\`, \`Cargo.toml\`, or equivalent
   - Identify build commands, type checker, test runner

2. **Read context**
   - Read \`wiki/deploy/\` to determine the next sequential 4-digit number

3. **Run checks**
   - Run type checking if available (e.g., \`tsc --noEmit\`)
   - Run the full test suite

4. **Build**
   - Run the production build command
   - Verify build artifacts exist (check output directory, file count, sizes)

5. **Write deploy log**
   - Create \`wiki/deploy/{NNNN}.md\` using the template below

6. **Verify output**
   - Confirm \`wiki/deploy/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - Confirm build artifacts exist
   - If any check fails, fix before reporting completion

## Deploy Log Template

\`\`\`markdown
# Deploy Log-{NNNN}: {Title}

> Date: {YYYY-MM-DD HH:mm}
> Status: {SUCCESS / FAILED}

## 1. Environment

- OS: {detected}
- Runtime: {e.g., Node.js 20.x}
- Build tool: {e.g., vite, webpack, tsc}

## 2. Type Check

- Command: \\\`{command}\\\`
- Result: {PASS / FAIL}
- Errors: {count or "none"}

## 3. Tests

- Command: \\\`{command}\\\`
- Result: {N passed, N failed, N skipped}

## 4. Build

- Command: \\\`{command}\\\`
- Result: {SUCCESS / FAILED}
- Duration: {if available}
- Error output: {if failed}

## 5. Artifacts

| Path | Size | Type |
|------|------|------|
| {path} | {size} | {file type} |

## 6. Notes

{Any issues encountered, warnings, manual steps needed}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/deploy/{NNNN}.md\` — Deployment log

## Completion Checklist

- [ ] Type check passes (if available)
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Build artifacts exist in the output directory
- [ ] \`wiki/deploy/{NNNN}.md\` exists with build details

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's build system automatically. Do not hardcode build commands.
- Report build errors clearly with actionable information.
`

export const SKILL_DEPLOY_EN = SKILL_DEPLOY  // Already in English
