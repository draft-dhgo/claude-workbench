// Skill: ui-mockup — English version

export const SKILL_UI_MOCKUP_EN = `---
name: ui-mockup
description: This skill should be used when the user asks to "create UI mockup", "design the screen", "make HTML mockup". Generate standalone HTML mockups from SDD UI specifications.
---

# ui-mockup

## Purpose

Accept the UI design from an SDD (Solution Design Document) as input and generate a standalone HTML mockup
that can be viewed directly in a browser. Visually represents the layout and states of each screen,
similar to a storybook.

## Trigger

Activate when UI mockup creation, screen design visualization, or HTML prototype is requested. Typically runs after dev-design.

## Prerequisites

\`\`\`bash
mkdir -p wiki/mockups
\`\`\`

## Workflow

1. **Read context**
   - Read the relevant SDD from \`wiki/specs/{NNNN}.md\`
   - Identify screen list, component structure, and UI states from the SDD UI Design section
   - If no UI Design section, infer from Module Design and Data Flow
   - Read \`wiki/knowledge/\` for known UI conventions

2. **Identify screens**
   - List the screens/views to implement
   - Define UI states for each screen (default, loading, empty, error, etc.)

3. **Generate mockups**
   - Create \`wiki/mockups/{NNNN}-{screen-name}.html\` for each screen
   - Follow the mockup writing guidelines below

4. **Create gallery index**
   - Create \`wiki/mockups/index.html\` listing all mockups as cards
   - Include SDD number, screen name, and mockup link

5. **Verify output**
   - Confirm HTML files exist under \`wiki/mockups/\`
   - Confirm each file is a standalone file that can be opened in a browser
   - If check fails, fix before reporting completion

## Mockup Writing Guidelines

### Visual Representation Principles

- **Realistic data** — use scenario-appropriate data instead of lorem ipsum
- **All interactive elements** — buttons, input fields, dropdowns, toggles, checkboxes, etc.
- **Layout fidelity** — implement actual layout with flexbox/grid
- **Colors/Typography** — follow project design system if available; otherwise use system fonts + neutral colors
- **Responsive** — max-width container; mobile support is optional
- **Hover/focus states** — provide interaction hints via CSS :hover, :focus

## Output

- \`wiki/mockups/{NNNN}-{screen-name}.html\` — Standalone mockup files
- \`wiki/mockups/index.html\` — Gallery index

## Completion Checklist

- [ ] Mockup HTML files exist under \`wiki/mockups/\`
- [ ] Each file is standalone (no external dependencies)
- [ ] Gallery index \`wiki/mockups/index.html\` updated

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
`
