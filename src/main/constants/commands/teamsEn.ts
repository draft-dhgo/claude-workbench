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

## Sub-agent Principle — Minimal Context

> **Key**: Pass only **skill name + file paths** to sub-agents.
> Do not read file contents and copy them into the prompt. Sub-agents read files themselves following the skill workflow.
> The main agent acts only as orchestrator and verifies output existence after sub-agent completion.

Sub-agent prompt rules:
- Write in 1-2 lines. Include only: skill name, input file path, output file number (NNNN)
- Example: \`"/req-manage run. REQ-ID: REQ-001. Output number: 0003"\`
- Example: \`"/dev-impl run. Input: wiki/prd/0003.md. Output number: 0003"\`
- Never include file contents, background explanations, or workflow instructions

## Pipeline (4 steps)

Execute each step in order. Proceed to the next only after verification passes.

| Step | Skill | Pass to sub-agent | Verification |
|------|-------|--------------------|--------------|
| 1 | /req-manage | REQ-ID, output number NNNN | wiki/prd/{NNNN}.md exists (>100B) + wiki/requirements/REQ-NNN.md exists |
| 2 | /dev-impl | wiki/prd/{NNNN}.md path, output number | wiki/specs/{NNNN}.md exists (>100B). If UI feature, wiki/mockups/ HTML also exists |
| 3 | /test-impl | wiki/specs/{NNNN}.md path, output number | wiki/tests/{NNNN}.md + wiki/tdd/{NNNN}.md exist (>100B) + tests pass |
| 4 | /finalize | output number NNNN | wiki/deploy/{NNNN}.md exists (>100B) + wiki/views/index.html exists |

### On verification failure

Re-invoke the sub-agent. Pass only paths in the retry prompt as well.

## Completion

1. Update the item status in wiki/requirements/README.md from [ ] to [x]
2. Output each step's artifact paths and verification result (PASS/FAIL)

## Execution Rules

- All documentation artifacts must be written only under \`wiki/\` — never elsewhere
- Never modify existing wiki/ files (append-only, status updates are the exception)
`
