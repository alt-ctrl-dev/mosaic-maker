# Sandcastle Cleanup Bot

This bot automatically cleans up local Git branches that are associated with closed GitHub issues or pull requests.

## Functionality

The cleanup bot performs the following actions:

1. **Identifies local branches** - Scans the local repository for Git branches
2. **Queries GitHub per-branch** - For each branch, determines whether it is cleanable:
   - Branches following the `sandcastle/issue-{number}` pattern are cleanable when issue `{number}` is closed (`gh issue view`)
   - Other branches are cleanable when they are the head ref of a merged pull request (`gh pr list --head <branch> --state merged`)
3. **Cleans up on demand** - For each cleanable branch, the bot then:
   - Removes the registered git worktree for the branch, if any (e.g. `.sandcastle/worktrees/sandcastle-issue-N`)
   - Deletes matching log files `.sandcastle/logs/sandcastle-issue-N-*` for closed issues
   - Deletes the local branch

GitHub is queried lazily per-branch rather than fetching all closed PRs and issues upfront, and worktree/log cleanup happen on demand as part of each branch's removal.

## Usage

### Run manually

```bash
pnpm run sandcastle-cleanup
```

### Run via VS Code debugger

Use the "Launch sandcastle-cleanup" launch configuration in VS Code.

## Safety Features

- Never deletes the `main` branch
- Never deletes remote tracking branches (those starting with `origin/`)
- Only deletes fully merged or closed branches
- Only removes worktrees that git actually tracks; orphaned directories under `.sandcastle/worktrees` that are not registered with git are skipped with a warning
- Provides clear console output of what was deleted

## Adding to CI/CD

To automatically run cleanup as part of your workflow, add a step to your GitHub Actions:

```yaml
- name: Cleanup closed branches
  run: pnpm run sandcastle-cleanup
```