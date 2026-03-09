// Skill: dev-design — Development design document (SDD) creation

export const SKILL_DEV_DESIGN = `---
name: dev-design
description: This skill should be used when the user asks to "write a design document", "create an SDD", "design the implementation". Write development design documents (SDD).
---

# dev-design

## Purpose

Create a Solution Design Document (SDD) that specifies architecture, module structure, interfaces, and data flow.

## Trigger

Activate when development design, architecture planning, or SDD creation is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/specs wiki/knowledge
\`\`\`

## Workflow

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
   - Create \`wiki/specs/{NNNN}.md\` using the template below
   - UI가 있는 기능이면 UI Design 섹션을 포함한다 (목업 HTML은 별도 ui-mockup 스킬에서 생성)

5. **Verify output**
   - Confirm \`wiki/specs/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - If check fails, fix before reporting completion

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
> HTML mockups are generated separately by the ui-mockup skill.

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

## Output

All output MUST be written under \`wiki/\` only:
- \`wiki/specs/{NNNN}.md\` — Solution Design Document

## Completion Checklist

- [ ] \`wiki/specs/{NNNN}.md\` exists with all template sections filled
- [ ] SDD references the source PRD/requirement
- [ ] Impact analysis section lists affected files
## Rules

- ALL documentation output goes under \`wiki/\` — nowhere else.
- wiki/ files are append-only. Never modify existing files.
- Detect the project's actual tech stack automatically. Do not hardcode frameworks.
`

export const SKILL_DEV_DESIGN_EN = SKILL_DEV_DESIGN  // Already in English
