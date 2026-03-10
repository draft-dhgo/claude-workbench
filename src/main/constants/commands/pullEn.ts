// Command: pull — Fetch and merge latest changes from remote (English)

export const CMD_PULL_EN = `Fetch and merge latest changes from the remote repository into the current branch.

User input: $ARGUMENTS

## Procedure

1. Check the Git status of the current workspace
   - If not a Git repository, output "Not a Git repository." and stop
2. Check for uncommitted local changes
   - If uncommitted changes exist, warn the user and confirm whether to proceed
   - If the user cancels, stop
3. If $ARGUMENTS is empty:
   - Perform batch pull for all repositories (worktrees) in the current workspace
   - For each repository, execute fetch + merge from the remote for the current branch
4. If $ARGUMENTS is not empty:
   - Pull only the specified repository/path
5. For each repository:
   a. Run \`git fetch origin\` to fetch remote changes
   b. Run \`git merge origin/{current-branch}\` to merge
   c. If conflicts occur:
      - Show the list of conflicting files to the user
      - Guide the user on how to resolve conflicts (manual resolution needed)
      - Inform that \`git merge --abort\` can cancel the merge
6. Output results:
   - Pull result per repository (success/conflict/error)
   - Summary of fetched commits and changed files

## Rules

- Skip repositories with no remote configuration
- Do not auto-resolve conflicts; notify the user instead
- Report pull results individually for each repository
- When warning about uncommitted changes, suggest the stash option
`
