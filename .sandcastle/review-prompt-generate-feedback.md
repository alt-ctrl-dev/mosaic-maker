# TASK

Review the code changes on branch `{{BRANCH}}` and generate structured feedback for a GitHub PR review.

# CONTEXT

## Branch diff

!`git diff {{TARGET_BRANCH}}...{{BRANCH}}`

## Commits on this branch

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

# REVIEW PROCESS

1. **Understand the change**: Read the diff and commits above to understand the intent.

2. **Analyze for improvements**: Look for opportunities to:
   - Reduce unnecessary complexity and nesting
   - Eliminate redundant code and abstractions
   - Improve readability through clear variable and function names
   - Consolidate related logic
   - Remove unnecessary comments that describe obvious code
   - Avoid nested ternary operators - prefer switch statements or if/else chains
   - Choose clarity over brevity - explicit code is often better than overly compact code

3. **Check correctness**:
   - Does the implementation match the intent? Are edge cases handled?
   - Are new/changed behaviours covered by tests?
   - Are there unsafe casts, `any` types, or unchecked assumptions?
   - Does the change introduce injection vulnerabilities, credential leaks, or other security issues?

4. **Maintain balance**: Avoid over-simplification that could:
   - Reduce code clarity or maintainability
   - Create overly clever solutions that are hard to understand
   - Combine too many concerns into single functions or components
   - Remove helpful abstractions that improve code organization
   - Make the code harder to debug or extend

5. **Apply project standards**: Follow the coding standards defined in @.sandcastle/CODING_STANDARDS.md

6. **Preserve functionality**: Never change what the code does - only how it does it. All original features, outputs, and behaviors must remain intact.

# OUTPUT FORMAT

Generate your review feedback in one of these formats:

## If no issues are found:
```
<review-type>approve</review-type>
<review-feedback>No issues found. Code looks good!</review-feedback>
```

## If minor issues or suggestions are found:
```
<review-type>comment</review-type>
<review-feedback>
[Your detailed feedback here. Be specific about what could be improved and why.]
</review-feedback>
```

## If major issues are found that need to be addressed:
```
<review-type>request-changes</review-type>
<review-feedback>
[Your detailed feedback here. Clearly explain what issues need to be addressed and why.]
</review-feedback>
```

# EXECUTION

Focus on quality and accuracy rather than speed. Provide thoughtful, actionable feedback that will help improve the code quality.

Once complete, only output the review feedback in the specified format above.

# FINAL RULES

- Do not leave commented-out code or TODO comments in committed code.
- **Never modify `.npmrc` or `pnpm-workspace.yaml`.** These files enforce supply-chain security policies and must not be changed by automated tooling.
- ALWAYS use `pnpm` for all package management and script execution. Never use `npm` or `yarn`.
- **Always use the git-workflow-and-versioning skill for all commits.** Do not commit without invoking the skill.