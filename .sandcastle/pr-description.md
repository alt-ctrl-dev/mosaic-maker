# Generate PR Description from Branch Commits

## Context

### Commits on this branch

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

### Full commit messages

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --format="%B" --reverse`

### Branch diff stats

!`git diff {{TARGET_BRANCH}}...{{BRANCH}} --stat`

## Task

Generate a PR description that:

1. **Summarizes what changed** — one or two sentences of high-level intent
2. **Lists key changes** — bullet points of what was added/fixed/improved
3. **References issues** — link to any GitHub issues mentioned in commits
4. **Explains the why** — briefly mention why these changes matter
5. **Highlights any breaking changes** — if applicable
6. **Notes any concerns** — dependencies added, performance implications, areas needing review

## Format

```markdown
## Summary
[One or two sentence high-level overview]

## Changes
- [Specific change 1]
- [Specific change 2]
- [Specific change 3]

## Issues Fixed
Closes #123, Closes #456

## Notes
[Any additional context, concerns, or review guidance]
```

## Output

Output the markdown-formatted PR description. Keep it concise but complete.
