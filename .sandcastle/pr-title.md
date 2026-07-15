# Generate PR Title from Branch Commits

## Context

### Commits on this branch

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

### Commit messages in detail

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --format="%B" --reverse`

## Task

Analyze the commits on this branch and generate a concise PR title that:

1. **Follows semantic commit type** — start with `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, or `chore:`
2. **Is descriptive but brief** — 50 characters or less (after the type prefix)
3. **Captures the primary intent** — if multiple commits, summarize the main theme
4. **References the issue** — if commits mention issue numbers, include them (e.g., "feat: add auth validation #42")
5. **Uses imperative mood** — "add" not "adds" or "added"

## Examples

```
feat: add email validation to registration #123
fix: resolve duplicate task creation race condition
refactor: consolidate auth middleware into single handler
test: add integration tests for payment flow
```

## Output

Output only the PR title, nothing else. No explanation, no markdown formatting.

Example output:
```
feat: add task creation with validation
```
