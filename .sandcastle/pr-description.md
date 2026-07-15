# Generate PR Description from Branch Commits

## Context

### Commits on this branch

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

### Full commit messages with body

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --format="%B" --reverse`

### Branch diff stats

!`git diff {{TARGET_BRANCH}}...{{BRANCH}} --stat`

### Files changed

!`git diff {{TARGET_BRANCH}}...{{BRANCH}} --name-only`

## Task

Analyze the commits on this branch and generate a detailed PR body that follows the GitHub PR template. The description should:

1. **Summary** — Clear, concise explanation of what changed and why (2-3 sentences)
2. **Changes** — Bullet points of specific modifications organized by concern
3. **Verification** — Note what checks have been run (tests, typecheck, lint, format)
4. **Review notes** — Call out risks, trade-offs, architectural decisions, or areas needing careful review
5. **References** — Extract and list any issue numbers from commit messages using `Closes #<issue>`
6. **Breaking changes** — If applicable, document what breaks and migration path

## Template

Follow this structure exactly:

```markdown
## Summary
[What changed and why? 2-3 sentences]

## Changes
[Organized bullet points of specific changes]
- [Change 1]
- [Change 2]
- [Change 3]

## Verification

- [x] Tests pass
- [x] Typecheck passes
- [x] Lint and formatting pass

## Review notes

[Call out risks, trade-offs, architectural decisions, or areas reviewers should focus on.]

## References

Closes #<issue-id>
```

## Output

Output only the markdown-formatted PR body following the template above. Do not include the PR title. Be specific and detailed — reviewers should understand the full scope and intent of the changes from this description.
