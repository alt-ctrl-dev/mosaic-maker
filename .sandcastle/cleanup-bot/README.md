# Sandcastle Cleanup Bot

This bot automatically cleans up local Git branches that are associated with closed GitHub issues or pull requests.

## Functionality

The cleanup bot performs the following actions:

1. **Fetches closed PRs** - Gets a list of all closed (merged or closed) pull requests
2. **Fetches closed issues** - Gets a list of recently closed issues 
3. **Identifies local branches** - Scans the local repository for Git branches
4. **Matches and cleans up** - Removes local branches that match either:
   - Branch names that exactly match closed PR branch names
   - Branch names following the `sandcastle/issue-{number}` pattern for closed issues

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
- Provides clear console output of what was deleted

## Adding to CI/CD

To automatically run cleanup as part of your workflow, add a step to your GitHub Actions:

```yaml
- name: Cleanup closed branches
  run: pnpm run sandcastle-cleanup
```