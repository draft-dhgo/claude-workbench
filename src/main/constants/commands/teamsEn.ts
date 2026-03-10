// Command: teams — English version

export const CMD_TEAMS_EN = `Run the team development pipeline.

User input: $ARGUMENTS

## Target Selection

1. If $ARGUMENTS contains a REQ-ID (e.g., REQ-001), select that requirement
2. If $ARGUMENTS is empty, auto-select the first [ ] entry from wiki/requirements/README.md
3. If no incomplete entries exist or the file is missing: output "/add-req command to add requirements first." and exit

Output the selected item's REQ-ID and title.

## Prerequisites

- Create missing wiki/ subdirectories (prd, specs, tests, tdd, deploy, mockups, views, knowledge)
- Check existing files in each category to determine the next sequence number (NNNN)

## Execution Principles

### Step 1 Inline
Step 1 (req-manage) is always executed main direct by the main agent. PRD writing is lightweight (file reads + document writing) and does not require a sub-agent.

### Mode Selection — Adaptive Pipeline

After Step 1 completes, read the PRD to assess task size. Classify as Small/Medium/Large based on affected files, new modules, and UI presence.

| Criterion | Small | Medium | Large |
|-----------|-------|--------|-------|
| Files changed | ≤3 | 4–10 | >10 |
| New modules | 0 | 1–2 | ≥3 |
| UI included | No | N/A | Yes → auto Large |

If any criterion qualifies for a higher mode, apply the higher mode.
When uncertain, default to Medium.

Output the Pipeline Mode: \`[Pipeline Mode: {Small|Medium|Large}] {N} sub-agents\`

### Sub-agent Usage Rules

When invoking a sub-agent:
- 1–2 line prompt: skill name + file paths + output number (NNNN) only
- Never include file contents, background explanations, or workflow instructions
- The main agent acts only as orchestrator and verifies output existence after completion

When running main direct (inline):
- The main agent executes the skill workflow directly

## Pipeline (4 steps) — Mode-based Execution

Execute each step in order. Proceed to the next only after verification passes.

### Mode Execution Matrix

| Step | Skill | Small | Medium | Large |
|------|-------|-------|--------|-------|
| 1 | /req-manage | main direct | main direct | main direct |
| 2 | /dev-impl | main direct | main direct | sub-agent |
| 3 | /test-impl | main direct | sub-agent | sub-agent |
| 4 | /finalize | main direct | main direct | sub-agent |

### Verification Criteria (same for all modes)

| Step | Verification |
|------|-------------|
| 1 | wiki/prd/{NNNN}.md exists (>100B) + wiki/requirements/REQ-NNN.md exists |
| 2 | wiki/specs/{NNNN}.md exists (>100B). If UI feature, wiki/mockups/ HTML also exists |
| 3 | wiki/tests/{NNNN}.md + wiki/tdd/{NNNN}.md exist (>100B) + tests pass |
| 4 | wiki/deploy/{NNNN}.md exists (>100B) + wiki/views/index.html exists |

### On verification failure

Re-execute regardless of execution method (main direct or sub-agent).

## Completion

1. Update the item status in wiki/requirements/README.md from [ ] to [x]
2. Output each step's artifact paths and verification result (PASS/FAIL)

## Execution Rules

- All documentation artifacts must be written only under \`wiki/\` — never elsewhere
- Never modify existing wiki/ files (append-only, status updates are the exception)
`
