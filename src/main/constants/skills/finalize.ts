// Skill: finalize — Deploy + wiki-views + project-knowledge (merged)

export const SKILL_FINALIZE = `---
name: finalize
description: This skill should be used when the user asks to "deploy and finalize", "build and update wiki", "finalize the cycle". Build, update wiki viewer, and record project knowledge in a single pass.
---

# finalize

## Purpose

Final step of the pipeline cycle. Build the project, update the wiki viewer, and record project knowledge. Combines deploy + wiki-views + project-knowledge into a single step.

## Trigger

Activate when deployment and finalization is requested. Runs after TDD implementation is complete.

## Prerequisites

\`\`\`bash
mkdir -p wiki/deploy wiki/views wiki/knowledge wiki/knowledge/discoveries
\`\`\`

## Workflow

### Phase 1: Deploy

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
   - Verify build artifacts exist

5. **Write deploy log**
   - Create \`wiki/deploy/{NNNN}.md\` using the deploy log template below

### Phase 2: Wiki Views Update

6. **Update wiki viewer**
   - If \`wiki/views/index.html\` does not exist: scan wiki/ and generate it using the wiki-views template
   - If it already exists: update only the \`WIKI_FILES\` block with current file listings
   - Check \`wiki/mockups/{NNNN}-*.html\` for actual mockup filenames via Glob

### Phase 3: Project Knowledge

7. **Record knowledge**
   - Read existing \`wiki/knowledge/\` files to check for duplicates
   - Record any notable findings from this cycle:
     - Architecture decisions
     - Conventions discovered
     - Dependencies added
     - Gotchas encountered
   - Append to category files (\`architecture.md\`, \`conventions.md\`, \`dependencies.md\`, \`gotchas.md\`) or create discovery files

### Phase 4: Verify

8. **Verify all output**
   - Confirm \`wiki/deploy/{NNNN}.md\` exists (> 100 bytes)
   - Confirm build artifacts exist
   - Confirm \`wiki/views/index.html\` exists
   - Confirm knowledge was recorded (if applicable)

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

## 5. Artifacts

| Path | Size | Type |
|------|------|------|
| {path} | {size} | {file type} |

## 6. Notes

{Any issues encountered, warnings, manual steps needed}
\`\`\`

## Knowledge Append Format

When appending to a category file:

\`\`\`markdown

## {Discovery Title} ({YYYY-MM-DD})

{Specific finding}

- Evidence: {which code/file/config confirmed this}
- Impact: {how this affects future work}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/deploy/{NNNN}.md\` — Deployment log
- \`wiki/views/index.html\` — Updated wiki viewer
- \`wiki/knowledge/*.md\` — Appended knowledge (if applicable)

## Completion Checklist

- [ ] Build succeeds and artifacts exist
- [ ] \`wiki/deploy/{NNNN}.md\` exists with build details
- [ ] \`wiki/views/index.html\` exists and reflects current wiki/ state
- [ ] Project knowledge recorded (if any new findings)

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files (except wiki/views/index.html WIKI_FILES block).
- Detect the project's build system automatically. Do not hardcode build commands.
- Check existing knowledge files before adding to avoid duplicates.
`

export const SKILL_FINALIZE_EN = SKILL_FINALIZE  // Already in English
