// Command: bugfix-teams — English version

export const CMD_BUGFIX_TEAMS_EN = `Run the bug fix pipeline.

User input: $ARGUMENTS

## Target Selection

1. If $ARGUMENTS contains a BUG-ID (e.g., BUG-001), select that bug
2. If $ARGUMENTS is empty, auto-select the first [ ] entry from wiki/bugs/README.md
3. If no incomplete entries exist or the file is missing: output "/add-bug command to add bugs first." and exit

Output the selected item's ID and description, then start the pipeline.

## Prerequisites

- Check wiki/ subdirectory structure and create missing directories
- Check existing files in each category (bugfix, specs, tests, tdd, deploy) to determine the next sequence number (NNNN)
- Read wiki/knowledge/ files to understand existing project knowledge

## Pipeline

Each step must be executed in order. Proceed to the next step only after verification passes.

> **Sub-agent principle**: Each step's actual work is executed by creating a sub-agent with the Agent tool.
> The main agent acts only as orchestrator and verifies output file existence after sub-agent completion.
> This prevents the main context from being polluted by step-level details.

### Step 1: bugfix — Bug Root Cause Analysis

1. Create a sub-agent with the **Agent tool** and instruct it to run the bugfix skill
   - Pass the selected bug ID and the relevant entry from wiki/bugs/README.md as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/bugfix/{NNNN}.md\` exists and is > 100 bytes
3. On failure: re-invoke sub-agent to complete the output. Do not proceed until passed.

### Step 2: dev-design — Fix Design

1. Create a sub-agent and instruct it to run the dev-design skill
   - Pass \`wiki/bugfix/{NNNN}.md\` path as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/specs/{NNNN}.md\` exists and is > 100 bytes
3. On failure: re-invoke sub-agent

### Step 3: test-design — Regression Test Design

1. Create a sub-agent and instruct it to run the test-design skill
   - Pass \`wiki/specs/{NNNN}.md\` path as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/tests/{NNNN}.md\` exists and is > 100 bytes
3. On failure: re-invoke sub-agent

### Step 4: tdd-cycle — TDD-Based Fix

1. Create a sub-agent and instruct it to run the tdd-cycle skill
   - Pass \`wiki/specs/{NNNN}.md\` and \`wiki/tests/{NNNN}.md\` paths as context
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/tdd/{NNNN}.md\` exists and is > 100 bytes
   - **Verify**: Run the test runner and confirm all tests pass
3. On failure: re-invoke sub-agent to fix the code

### Step 5: deploy — Build and Verify

1. Create a sub-agent and instruct it to run the deploy skill
2. After sub-agent completion, verify:
   - **Verify**: \`wiki/deploy/{NNNN}.md\` exists and is > 100 bytes
   - **Verify**: Build artifacts exist
3. On failure: re-invoke sub-agent

### Step 6: wiki-views — Update Wiki Viewer (haiku model)

1. If \`wiki/views/index.html\` does not exist, create a sub-agent and run wiki-views skill with \`claude-haiku-4-5-20251001\` model
2. If it already exists, update directly:
   - Use Glob to find \`wiki/mockups/{NNNN}-*.html\` pattern to get actual mockup filenames
   - If the cycle entry (\`<!-- Cycle: {NNNN} -->\`) already exists, verify and fix mockup link paths
   - If not, add an entry for the current cycle (NNNN) with prd, specs, tests, tdd, deploy, mockup links
3. **Verify**: \`wiki/views/index.html\` file exists

### Step 7: project-knowledge — Record Project Knowledge

1. Create a sub-agent and instruct it to run the project-knowledge skill
   - Pass a summary of key findings from the entire pipeline (architecture, conventions, dependencies, notes)
2. **Verify**: Confirm new content does not duplicate existing entries

## Completion

1. Update the item status in wiki/bugs/README.md from [ ] to [x]
2. Output a final pipeline summary:
   - Output path for each step
   - Verification result (PASS/FAIL)

## Execution Rules

- All documentation artifacts must be written only under \`wiki/\` — never elsewhere
- Execute each step in order; proceed to the next only after verification passes
- Always use the previous step's output (wiki/ docs) as input for the next step
- Never modify existing wiki/ files (append-only, status updates are the exception)
`
