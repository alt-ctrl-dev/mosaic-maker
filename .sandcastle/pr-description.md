# Generate PR Description from Branch Commits

## Context

### Commits on this branch

!`git log {{BASE_BRANCH}}..{{BRANCH}} --oneline`

### Full commit messages with body

!`git log {{BASE_BRANCH}}..{{BRANCH}} --format="%B" --reverse`

### Branch diff stats

!`git diff {{BASE_BRANCH}}...{{BRANCH}} --stat`

### Files changed

!`git diff {{BASE_BRANCH}}...{{BRANCH}} --name-only`

### Full code diff

!`git diff {{BASE_BRANCH}}...{{BRANCH}}`

## Task

Analyze the commits and code changes on this branch and generate a detailed PR body that follows the GitHub PR template. Review both the commit messages AND the actual code diff to understand what was changed.

The description should:

1. **Summary** — Clear, concise explanation of what changed and why (2-3 sentences), based on commits and code diff
2. **Changes** — Bullet points of specific modifications organized by file/concern, including:
   - New files or modules
   - Modified functions or logic with the key intent
   - Added/removed dependencies
   - Configuration or schema changes
3. **Code Analysis** — Technical insight from the actual diff:
   - New patterns, utilities, or architectural changes
   - Refactoring or consolidation of logic
   - Error handling or validation improvements
   - Performance implications or trade-offs
   - Complexity or maintainability impact
4. **Verification** — Note what checks have been run (tests, typecheck, lint, format)
5. **Review notes** — Call out risks, trade-offs, architectural decisions, or areas needing careful review:
   - Complexity hotspots or hard-to-understand code
   - Edge cases or potential bugs
   - Areas that need thorough testing
   - Security considerations
6. **References** — Extract and list any issue numbers from commit messages using `Closes #<issue>`
7. **Breaking changes** — If applicable, document what breaks and migration path

## Template

Follow this structure exactly:

```markdown
## Summary
[What changed and why? 2-3 sentences, explaining the high-level intent]


## Code Analysis

### Key changes
- [Function/logic changes with before/after intent]
- [New patterns or utilities]
- [Refactoring or consolidation]

### Technical considerations
- [Performance implications]
- [Edge cases or error handling]
- [Architectural decisions or trade-offs]
- [Complexity or maintainability impact]

## Verification

- [x] Tests pass
- [x] Typecheck passes
- [x] Lint and formatting pass

## Changes

- `src/file1.ts`: [Specific change with context]
- `src/file2.ts`: [Specific change with context]
- [New files, removed files, etc.]

## Review notes

[Call out risks, trade-offs, complexity hotspots, or areas reviewers should focus on based on code analysis.]

## References (if {{ISSUE_ID}} is provided)

Closes #{{ISSUE_ID}}
```

## Output

Wrap the final markdown-formatted PR body in `<pr-description>` tags. Do not include the PR title or any text outside the tags.

**Requirements:**
- Be specific and detailed — reference actual file names and functions where applicable
- Analyze the diff, not just the commit messages
- Explain *why* changes were made, not just *what* changed
- Highlight non-obvious code patterns, refactorings, or trade-offs
- Flag areas needing extra review attention based on code complexity or risk
- Include technical details that help reviewers understand the implementation

Example:
```
<pr-description>
## Summary
...
</pr-description>
```
