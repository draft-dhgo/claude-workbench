// Skill: req-manage — Requirements definition and PRD writing

export const SKILL_REQ_MANAGE = `---
name: req-manage
description: This skill should be used when the user asks to "define requirements", "write a PRD", "manage requirements". Manage requirements definition and PRD writing, track progress status.
---

# req-manage

## Purpose

Manage project requirements and produce PRD (Product Requirements Document) artifacts.

## Trigger

Activate when requirements gathering, PRD writing, or requirement status tracking is requested.

## Prerequisites

Ensure the following directories exist. Create them if missing:

\`\`\`bash
mkdir -p wiki/prd wiki/requirements
\`\`\`

## Workflow

1. **Read context**
   - Read \`wiki/requirements/README.md\` to understand existing requirements
   - Read \`wiki/prd/\` to check existing PRDs and determine the next sequential 4-digit number (0001, 0002, ...)
   - Read the detailed requirement file \`wiki/requirements/REQ-NNN.md\` if it exists

2. **Gather requirements**
   - Collect requirements from the user through structured questions
   - Organize into functional and non-functional categories
   - Assign a REQ-ID (REQ-001, REQ-002, ...) based on existing entries

3. **Write PRD**
   - Create \`wiki/prd/{NNNN}.md\` using the template below
   - Fill in all sections with meaningful content

4. **Write detailed requirement**
   - Create \`wiki/requirements/REQ-NNN.md\` with the full requirement details using the requirement detail template below
   - This file contains all the detailed context that the PRD references

5. **Update tracker**
   - Add or update the requirement row in \`wiki/requirements/README.md\`
   - README.md에는 **제목(한 줄 요약)만** 기재한다. 상세 내용은 개별 파일에 작성한다

6. **Verify output**
   - Confirm \`wiki/prd/{NNNN}.md\` exists and has meaningful content (> 100 bytes)
   - Confirm \`wiki/requirements/REQ-NNN.md\` exists with detailed content
   - Confirm \`wiki/requirements/README.md\` contains the new/updated requirement row
   - If any check fails, fix the issue before reporting completion

## PRD Template

\`\`\`markdown
# PRD-{NNNN}: {Title}

> REQ-ID: {REQ-XXX}
> Date: {YYYY-MM-DD}
> Status: Draft

## 1. Overview

{Brief description of the requirement and its business value}

## 2. Background

{Context, motivation, and problem statement}

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | {description} | {Must/Should/Could} |

## 4. Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-01 | {description} | {measurable criteria} |

## 5. User Stories

- As a {role}, I want {action} so that {benefit}

## 6. Acceptance Criteria

- [ ] {Criterion 1}
- [ ] {Criterion 2}

## 7. Out of Scope

{Explicitly excluded items}

## 8. Dependencies

{External dependencies, related requirements}
\`\`\`

## Requirement Detail Template

\`wiki/requirements/REQ-NNN.md\` 파일 형식:

\`\`\`markdown
# REQ-{NNN}: {Title}

> Date: {YYYY-MM-DD}
> Status: [ ]
> PRD: PRD-{NNNN}

## 설명

{요구사항의 상세 설명}

## 배경

{왜 이 기능이 필요한지, 어떤 문제를 해결하는지}

## 주요 기능

- {기능 1}
- {기능 2}

## 제약 사항

- {제약 1}

## 관련 요구사항

- {관련 REQ-ID 목록}
\`\`\`

## Output

- \`wiki/prd/{NNNN}.md\` — PRD document
- \`wiki/requirements/REQ-NNN.md\` — Detailed requirement document
- \`wiki/requirements/README.md\` — Updated requirement tracker (title only)

## Completion Checklist

- [ ] \`wiki/prd/{NNNN}.md\` exists with all template sections filled
- [ ] \`wiki/requirements/REQ-NNN.md\` exists with detailed requirement content
- [ ] \`wiki/requirements/README.md\` has the requirement row (title only)

## Rules

- wiki/ files are append-only. Never modify existing files (except requirements/README.md status column).
- README.md에는 제목만 기재한다. 상세 내용은 \`wiki/requirements/REQ-NNN.md\`에 작성한다.
- Detect the project's actual tech stack automatically. Do not hardcode frameworks.
`

export const SKILL_REQ_MANAGE_EN = SKILL_REQ_MANAGE  // Already in English
