// Command: explain — Discuss implementation direction with user (English)

export const CMD_EXPLAIN_EN = `Discuss and decide implementation direction for a requirement through conversation.

User input: $ARGUMENTS

## Target Selection

1. If $ARGUMENTS contains a REQ-ID (e.g., REQ-001), select that requirement
2. If $ARGUMENTS is empty, automatically select the first [ ] item from wiki/requirements/README.md
3. If no incomplete items exist: output "Please add a requirement first with /add-req command." and stop

## Procedure

1. Read the selected REQ detail file (wiki/requirements/REQ-NNN.md)
2. Explore the project codebase to understand the current structure and related code
3. **Propose implementation directions** for the following:
   - Architecture/design approach
   - Files and modules to be changed
   - UI changes (if applicable)
   - Data model changes (if applicable)
   - Other key decisions
4. Ask for user feedback on each proposal
5. Finalize direction through conversation with the user

## Important Rules

- **Do not decide unilaterally**: Always follow the propose → user feedback → confirm flow
- **Do not ask everything at once**: Propose key items in order and discuss
- **If the user says "just decide" or explicitly delegates**: Record that item as "TBD (Claude autonomous decision)"
- **It's okay if all items remain open**: Claude will decide autonomously when /teams runs

## Recording Results

When the conversation is complete, append the following section to the REQ file (wiki/requirements/REQ-NNN.md):

\`\`\`markdown
## Implementation Direction (explain)

> Date: {YYYY-MM-DD}

### Confirmed Decisions
- {Decision confirmed by user 1}
- {Decision confirmed by user 2}

### TBD (Autonomous decision when teams runs)
- {Open item 1}
- {Open item 2}
\`\`\`

## Completion

- After recording, inform: "You can start implementation with the /teams command."
- wiki/ path must always be referenced relative to the current working directory (cwd)
`
