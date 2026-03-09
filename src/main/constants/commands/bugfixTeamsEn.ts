// Command: bugfix-teams — English version

export const CMD_BUGFIX_TEAMS_EN = `Run the bug fix pipeline.

User input: $ARGUMENTS

## Target Selection

1. If $ARGUMENTS contains a BUG-ID (e.g., BUG-001), select that bug
2. If $ARGUMENTS is empty, auto-select the first [ ] entry from wiki/bugs/README.md
3. If no incomplete entries exist or the file is missing: output "/add-bug command to add bugs first." and exit

Output the selected item's BUG-ID and description.

## Prerequisites

- Create missing wiki/ subdirectories (bugfix, specs, tests, tdd, deploy, views, knowledge)
- Check existing files in each category to determine the next sequence number (NNNN)

## Sub-agent Principle — Minimal Context

> **Key**: Pass only **skill name + file paths** to sub-agents.
> Do not read file contents and copy them into the prompt. Sub-agents read files themselves following the skill workflow.
> The main agent acts only as orchestrator and verifies output existence after sub-agent completion.

Sub-agent prompt rules:
- Write in 1-2 lines. Include only: skill name, input file path, output file number (NNNN)
- Example: \`"/bugfix run. BUG-ID: BUG-001. Output number: 0005"\`
- Example: \`"/dev-impl run. Input: wiki/bugfix/0005.md. Output number: 0005"\`
- Never include file contents, background explanations, or workflow instructions

## Pipeline (4 steps)

Execute each step in order. Proceed to the next only after verification passes.

| Step | Skill | Pass to sub-agent | Verification |
|------|-------|--------------------|--------------|
| 1 | /bugfix | BUG-ID, output number NNNN | wiki/bugfix/{NNNN}.md exists (>100B) |
| 2 | /dev-impl | wiki/bugfix/{NNNN}.md path, output number | wiki/specs/{NNNN}.md exists (>100B) |
| 3 | /test-impl | wiki/specs/{NNNN}.md path, output number | wiki/tests/{NNNN}.md + wiki/tdd/{NNNN}.md exist (>100B) + tests pass |
| 4 | /finalize | output number NNNN | wiki/deploy/{NNNN}.md exists (>100B) + wiki/views/index.html exists |

### On verification failure

Re-invoke the sub-agent. Pass only paths in the retry prompt as well.

## Completion

1. Update the item status in wiki/bugs/README.md from [ ] to [x]
2. Output each step's artifact paths and verification result (PASS/FAIL)

## Execution Rules

- All documentation artifacts must be written only under \`wiki/\` — never elsewhere
- Never modify existing wiki/ files (append-only, status updates are the exception)
`
