// Skill: project-knowledge — Project knowledge documentation

export const SKILL_PROJECT_KNOWLEDGE = `---
name: project-knowledge
description: This skill should be used when the user asks to "record project knowledge", "document architecture", "note a discovery". Investigate the project and progressively accumulate knowledge in wiki/knowledge/.
---

# project-knowledge

## Purpose

Progressively accumulate project knowledge discovered during development. Incremental additions as new facts are discovered.

## Trigger

Activate when project investigation findings need to be recorded, or when invoked by other skills.

## Prerequisites

Ensure the following directories and files exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/knowledge/discoveries
touch wiki/knowledge/architecture.md
touch wiki/knowledge/conventions.md
touch wiki/knowledge/dependencies.md
touch wiki/knowledge/gotchas.md
\`\`\`

If any of the category files are newly created (empty), initialize them with a header:
- \`architecture.md\` → \`# Architecture\\n\`
- \`conventions.md\` → \`# Conventions\\n\`
- \`dependencies.md\` → \`# Dependencies\\n\`
- \`gotchas.md\` → \`# Gotchas\\n\`

## Workflow

1. **Read existing knowledge**
   - Read all files in \`wiki/knowledge/\` to check for duplicates

2. **Classify the knowledge**
   - Determine the appropriate category:
     - \`architecture\` — Components, layers, patterns, data flow
     - \`conventions\` — Naming rules, coding style, file organization
     - \`dependencies\` — Packages, versions, external services
     - \`gotchas\` — Pitfalls, workarounds, non-obvious behavior

3. **Record**
   - If it fits an existing category: **append** to that file (never overwrite existing content)
   - If it's a standalone discovery: create \`wiki/knowledge/discoveries/{NNNN}.md\` using the template below

4. **Verify output**
   - Confirm the knowledge was written (file exists, new content appended)
   - Confirm it's not a duplicate of existing entries

## Category Append Format

When appending to a category file, use this format:

\`\`\`markdown

## {Discovery Title} ({YYYY-MM-DD})

{Specific finding}

- Evidence: {which code/file/config confirmed this}
- Impact: {how this affects future work}
\`\`\`

## Discovery Template

For standalone discoveries in \`wiki/knowledge/discoveries/{NNNN}.md\`:

\`\`\`markdown
# {Discovery Title}

> Category: {architecture|conventions|dependencies|gotchas}
> Discovered: {YYYY-MM-DD HH:mm}
> Context: {What task led to this discovery}

## Content

{Specific finding}

## Evidence

{Which code/file/config confirmed this}

## Impact

{How this knowledge affects future work}
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/knowledge/{category}.md\` — Appended knowledge
- \`wiki/knowledge/discoveries/{NNNN}.md\` — Standalone discovery

## Completion Checklist

- [ ] Knowledge is not a duplicate of existing entries
- [ ] Knowledge was appended to the correct category or created as new discovery
- [ ] Content is specific and evidence-based (not vague)

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify or delete existing content.
- Check existing files before adding to avoid duplicates.
- Prefer appending to category files over creating standalone discoveries.
`

export const SKILL_PROJECT_KNOWLEDGE_EN = SKILL_PROJECT_KNOWLEDGE  // Already in English
