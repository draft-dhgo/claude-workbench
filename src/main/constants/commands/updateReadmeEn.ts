// Command: update-readme — Update README.md documentation and screenshots (English)

export const CMD_UPDATE_README_EN = `Update README.md documentation and screenshots to reflect the current state.

User input: $ARGUMENTS

## Procedure

1. Read the README.md file at the workspace root
   - If the file does not exist, output "README.md not found." and stop
2. If $ARGUMENTS is not empty:
   - Find the specified section (by markdown ## header) and analyze only that area
   - If the section is not found, show available section list and stop
3. If $ARGUMENTS is empty:
   - Scan the entire README.md and analyze all sections
4. For each section:
   - Compare document content with actual project code, features, and structure
   - List discrepancies (missing features, changed usage, outdated descriptions, etc.)
5. If screenshot references exist:
   - Check whether screenshot files exist
   - Note that screenshots may not match the current app state
6. Show the user what changes are needed:
   - Clearly present before/after for each change item
7. After user confirmation, apply changes to README.md
8. Output a change summary report:
   - Number of modified sections
   - Summary of additions/modifications/deletions

## Rules

- Do not modify any file other than README.md
- Always show changes to the user and get confirmation before applying
- Read project source code to verify consistency between features and documentation
- Preserve the existing document structure (header levels, order) as much as possible
`
