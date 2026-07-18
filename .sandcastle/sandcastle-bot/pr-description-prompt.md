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

1. **Summary** — Clear explanation of *what* changed and *why* (2-3 sentences): the high-level intent and the problem it solves
2. **Code Analysis** — Technical insight from the actual diff:
   - New patterns, utilities, or architectural changes (and why this approach was chosen)
   - Refactoring or consolidation of logic
   - Error handling or validation improvements
   - Performance implications or measurable impact
   - Complexity or maintainability changes
3. **Review focus areas** — Based on code analysis, call out:
   - Logic complexity hotspots or hard-to-follow code paths
   - Risky edge cases, potential bugs, or assumptions
   - Areas needing thorough testing or manual verification
   - Security or data integrity considerations
4.  **Changes** — Organized by file/module:
   - New files or modules (with purpose)
   - Modified functions or logic (with key intent)
   - Added/removed dependencies
   - Configuration or schema changes
5. **Breaking changes** — If applicable:
   - What breaks and why
   - Migration path for users/consumers
6. **References** — Only if issue numbers (e.g., `#123`, `org/repo#123`) are present in commit messages: extract them and add links. If none found, omit this section entirely. Do not fabricate, guess, or reference a spec/prd unless explicitly linked in the commits.

## Template

Follow this structure exactly:

```markdown
## Summary
[What changed (concretely) and why (the intent/problem solved). 2-3 sentences.]


## Code Analysis

### Key changes

- [Short and brief summary of key changes. Do not mention which file or how many lines of code]
- [File/function with specific change and architectural rationale]
- [New patterns or utilities and when to use them]
- [Refactoring or consolidation: what was simplified and by how much]

### Technical considerations
- **Performance/metrics**: [measurable impact or none if negligible]
- **Complexity**: [cognitive load, edge cases, or assumptions]
- **Error handling**: [added safeguards or validation]
- **Trade-offs**: [what was chosen and what was not, and why]


<details>
<summary>
<strong>
Review focus areas
</strong>
</summary>
- [Named complexity hotspot: why it's hard to understand and suggestions for review]
- [Edge case or risky assumption requiring scrutiny]
- [Testing or manual verification needed]
</details>


<details>
<summary>
<strong>
Changes
</strong>
</summary>
- **src/path/file.ts**: [What changed]
  - `functionName()`: [Specific modification and intent]
  - New export: `helperUtil()` [Purpose]
- **tests/...** [Test coverage for changes]
</details>

<details>
<summary>
<strong>
Breaking changes
</strong>
</summary>
[If none, omit. If present, list what breaks and supply migration guidance.]
</details>

```

## Output

Wrap the final markdown-formatted PR body in `<pr-description>` tags. Do not include the PR title or any text outside the tags.

**Requirements:**
- Be specific and detailed — name files, functions, types, and metrics
- Analyze the diff, not speculation — quote code patterns where helpful
- Explain architectural choices and trade-offs, not just what changed
- Flag cognitive complexity and risky assumptions by name
- Include measurable impact (perf, bundle, coverage) or note if negligible
- Make it navigable for intermediate and senior reviewers

Example:
```
<pr-description>
## Summary
...
</pr-description>
```
