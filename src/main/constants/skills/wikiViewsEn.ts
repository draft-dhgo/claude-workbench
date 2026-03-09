// Skill: wiki-views — English version

export const SKILL_WIKI_VIEWS_EN = `---
name: wiki-views
description: This skill should be used when the user asks to "generate wiki views", "create HTML views", "update wiki HTML". Generate a single-page wiki viewer that dynamically renders markdown files.
model: claude-haiku-4-5-20251001
---

# wiki-views

## Purpose

Generate a single \`wiki/views/index.html\` file. This file is an SPA (Single Page Application) viewer
that dynamically loads and renders markdown files from the wiki/ directory in the browser.
Once generated, it automatically reflects additions and changes to markdown files.

## Trigger

Activate when wiki HTML generation or view updates are requested. Only needs to be generated once.

## Model

This skill runs with the \`claude-haiku-4-5-20251001\` model.

## Prerequisites

\`\`\`bash
mkdir -p wiki/views
\`\`\`

## Workflow

1. **Scan wiki structure**
   - Scan ALL categories under wiki/ without omission: requirements, prd, specs, tests, tdd, deploy, bugfix, knowledge, mockups
   - List the current files in each category

2. **Generate viewer**
   - Create \`wiki/views/index.html\` — a standalone SPA with sidebar navigation and content rendering
   - Use marked.js or similar to render markdown
   - Include cycle-based navigation linking all related artifacts (prd, specs, tests, tdd, deploy, mockup)

3. **Verify output**
   - Confirm \`wiki/views/index.html\` exists
   - If check fails, fix before reporting completion

## Output

- \`wiki/views/index.html\` — Single-page wiki viewer

## Completion Checklist

- [ ] \`wiki/views/index.html\` exists with navigation and content rendering
- [ ] All wiki categories are reflected in the sidebar

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
`
