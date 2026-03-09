// Command: add-bug — English version

export const CMD_ADD_BUG_EN = `Register a new bug in wiki/bugs/README.md.

User input: $ARGUMENTS

If $ARGUMENTS is empty, ask the user to describe the bug symptoms.

## Registration Steps

1. Read wiki/bugs/README.md
   - If the file does not exist, create it with the following header:
     \`\`\`
     # Bug Reports

     | ID | Description | Status |
     |----|-------------|--------|
     \`\`\`
2. Count existing entries to determine the next BUG-ID (BUG-001, BUG-002, ...)
3. Add a new row to the table: \`| BUG-NNN | {description} | [ ] |\`
4. Output a registration complete message with the assigned ID

## Rules

- Always register with [ ] (incomplete) status
- Do not modify existing file content (append-only)
- Inform the user that the /bugfix-teams command can run the pipeline
`
