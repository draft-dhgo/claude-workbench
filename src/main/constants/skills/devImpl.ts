// Skill: dev-impl — Design + UI implementation (merged dev-design + ui-mockup)

export const SKILL_DEV_IMPL = `---
name: dev-impl
description: This skill should be used when the user asks to "design and implement", "create SDD and mockup", "design the solution". Write SDD and generate UI mockups in a single pass.
---

# dev-impl

## Purpose

Create a Solution Design Document (SDD) and, if the feature has UI, generate standalone HTML mockups. This combines dev-design and ui-mockup into a single step to eliminate redundant file reads and context rebuilding.

## Trigger

Activate when development design + implementation is requested. Runs after PRD is complete.

## Prerequisites

\`\`\`bash
mkdir -p wiki/specs wiki/mockups wiki/knowledge
\`\`\`

## Workflow

### Phase 1: Design (SDD)

1. **Read context**
   - Read relevant PRD from \`wiki/prd/\`
   - Read \`wiki/specs/\` to determine the next sequential 4-digit number
   - Read \`wiki/knowledge/\` for known architecture, conventions, dependencies

2. **Analyze codebase**
   - Explore the existing codebase to understand current architecture
   - Identify tech stack, frameworks, patterns in use

3. **Design solution**
   - Define modules, interfaces, data flow, dependencies
   - Determine impact: which existing files change, which new files are created

4. **Write SDD**
   - Create \`wiki/specs/{NNNN}.md\` using the SDD template below
   - If the feature has UI, include the UI Design section

### Phase 2: UI Mockup (if applicable)

> Skip this phase if the feature has no user interface (API, CLI, backend logic only).

5. **Generate mockups** from the SDD UI Design section you just wrote
   - Create \`wiki/mockups/{NNNN}-{screen-name}.html\` per screen
   - Create \`wiki/mockups/index.html\` gallery index
   - Follow the mockup rules below

### Phase 3: Verify

6. **Verify output**
   - Confirm \`wiki/specs/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - If UI feature: confirm \`wiki/mockups/\` has HTML files
   - If any check fails, fix before reporting completion

## SDD Template

\`\`\`markdown
# SDD-{NNNN}: {Title}

> Source: PRD-{NNNN} / REQ-{XXX}
> Date: {YYYY-MM-DD}
> Status: Draft

## 1. Overview

{What this design accomplishes and why}

## 2. Architecture

{High-level architecture: components, layers, communication patterns}

## 3. Module Design

### 3.1 {Module Name}

- **Responsibility**: {what it does}
- **Location**: {file path}
- **Dependencies**: {what it depends on}

#### Interface

\\\`\\\`\\\`
// language-appropriate interface definition
\\\`\\\`\\\`

## 4. Data Flow

1. {Step 1}
2. {Step 2}

## 5. UI Design

> Skip this section if the feature has no user interface.
> HTML mockups will be generated in Phase 2 of this skill.

### Screens

| Screen | Description |
|--------|-------------|
| {Screen Name} | {purpose and key elements} |

### UI States

| State | Description |
|-------|-------------|
| Default | {normal state} |
| Loading | {loading indicator} |
| Empty | {no data state} |
| Error | {error display} |

### Component Hierarchy

\\\`\\\`\\\`
{ParentComponent}
├── {ChildA}
│   ├── {GrandchildA1}
│   └── {GrandchildA2}
└── {ChildB}
\\\`\\\`\\\`

## 6. Database / State Changes

{Schema changes, new tables, state management updates — if applicable}

## 7. Impact Analysis

| File | Change Type | Description |
|------|------------|-------------|
| {path} | New/Modified | {what changes} |

## 8. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| {edge case} | {how it's handled} |

## 9. Dependencies

{New packages, external services, or internal modules required}
\`\`\`

## Mockup Rules

### File Structure

Each mockup is a standalone HTML file:

\`\`\`html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{SDD-NNNN} — {Screen Name}</title>
  <style>/* All CSS inline */</style>
</head>
<body>
  <header class="mockup-header">
    <span class="mockup-badge">SDD-{NNNN}</span>
    <h1>{Screen Name}</h1>
    <nav>
      <a href="index.html">Gallery</a>
      <a href="#state-default">Default</a>
      <a href="#state-loading">Loading</a>
    </nav>
  </header>
  <main>
    <section id="state-default"><h2>Default State</h2><!-- UI --></section>
    <section id="state-loading"><h2>Loading State</h2><!-- UI --></section>
  </main>
</body>
</html>
\`\`\`

### Visual Principles

- Real-looking data (not lorem ipsum)
- All interactive elements (buttons, inputs, dropdowns)
- Faithful layout with flexbox/grid
- hover/focus states via CSS
- No external libraries, CDN, or JavaScript — pure HTML+CSS only

### Common CSS

\`\`\`css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #1f2328; background: #f6f8fa; }
.mockup-header { background: #24292f; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 16px; }
.mockup-header h1 { font-size: 1.1em; font-weight: 500; }
.mockup-header nav a { color: #7d8590; text-decoration: none; margin-left: 12px; font-size: 0.85em; }
.mockup-header nav a:hover { color: #fff; }
.mockup-badge { background: #238636; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: 600; }
main { max-width: 1200px; margin: 0 auto; padding: 24px; }
section { background: #fff; border: 1px solid #d0d7de; border-radius: 6px; padding: 24px; margin-bottom: 24px; }
section h2 { font-size: 0.9em; color: #57606a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #d0d7de; }
button { cursor: pointer; padding: 6px 16px; border-radius: 6px; border: 1px solid #d0d7de; background: #f6f8fa; font-size: 0.9em; }
button:hover { background: #eaeef2; }
button.primary { background: #238636; color: #fff; border-color: #238636; }
button.primary:hover { background: #2ea043; }
input, select, textarea { padding: 6px 12px; border: 1px solid #d0d7de; border-radius: 6px; font-size: 0.9em; width: 100%; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #0969da; box-shadow: 0 0 0 3px rgba(9,105,218,0.15); }
\`\`\`

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/specs/{NNNN}.md\` — Solution Design Document
- \`wiki/mockups/{NNNN}-{screen-name}.html\` — Per-screen HTML mockups (if UI)
- \`wiki/mockups/index.html\` — Mockup gallery index (if UI)

## Completion Checklist

- [ ] \`wiki/specs/{NNNN}.md\` exists with all template sections filled
- [ ] SDD references the source PRD/requirement
- [ ] Impact analysis section lists affected files
- [ ] If UI feature: mockup HTML files exist in \`wiki/mockups/\`
- [ ] If UI feature: \`wiki/mockups/index.html\` gallery exists

## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's actual tech stack automatically. Do not hardcode frameworks.
- UI mockups use pure HTML+CSS only. No external dependencies.
`

export const SKILL_DEV_IMPL_EN = SKILL_DEV_IMPL  // Already in English
