// Command: add-req — English version

export const CMD_ADD_REQ_EN = `Register a new requirement.

User input: $ARGUMENTS

If $ARGUMENTS is empty, ask the user what requirement they want to add.

## Registration Steps

1. Read wiki/requirements/README.md
   - If the file does not exist, create it with the following header:
     \`\`\`
     # Requirements

     | ID | Title | Status |
     |----|-------|--------|
     \`\`\`
2. Count existing entries to determine the next REQ-ID (REQ-001, REQ-002, ...)
3. Add only the title to the README.md table: \`| REQ-NNN | {title} | [ ] |\`
4. Create the detailed file \`wiki/requirements/REQ-NNN.md\`:
   \`\`\`markdown
   # REQ-{NNN}: {Title}

   > Date: {YYYY-MM-DD}
   > Status: [ ]

   ## Description

   {Detailed description from user input}

   ## Key Features

   - {Feature 1}

   ## Constraints

   - {If any}

   ## Related Requirements

   - {If any}
   \`\`\`
5. Output a registration complete message with the assigned ID

## Rules

- Always register with [ ] (incomplete) status
- Only record the title in README.md; detailed content goes in \`wiki/requirements/REQ-NNN.md\`
- Do not modify existing file content (append-only)
- Inform the user that the /teams command can run the pipeline
`
