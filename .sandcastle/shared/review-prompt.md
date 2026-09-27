# TASK

Review the code changes on branch `{{BRANCH}}` against both coding standards and the original specification/acceptance criteria and improve code clarity, consistency, and maintainability while preserving exact functionality.

# CONTEXT

## Branch diff

!`git diff {{TARGET_BRANCH}}...{{BRANCH}}`

## Commits on this branch

!`git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`

## Original Issue

!`gh issue view $(git branch --show-current | grep -oE '[0-9]+') --comments`

# REVIEW PROCESS

## 1. Identify the specification and acceptance criteria

First, identify the original issue or specification that this change addresses by:
- Looking at commit messages for issue references (e.g., "#123", "Fixes #45")
- Fetching the issue details using the GitHub CLI
- Understanding what acceptance criteria were defined

## 2. Standards Review (Code Quality)

Check the code against project standards:

- Does it follow the coding standards in @.sandcastle/shared/CODING_STANDARDS.md?
- Are exports properly documented with JSDoc?
- Is type safety maintained?
- Are there any security issues?
- Is the code clear and maintainable?

## 3. Specification Review (Functional Correctness)

Check the implementation against the original specification:

- Does the implementation fully address the issue requirements?
- Are all acceptance criteria met?
- Is there any scope creep or missing functionality?
- Are edge cases properly handled as specified?

## 4. Areas for improvement

**Analyze for improvements**: Look for opportunities to:
   - Reduce unnecessary complexity and nesting
   - Eliminate redundant code and abstractions
   - Improve readability through clear variable and function names
   - Consolidate related logic
   - Remove unnecessary comments that describe obvious code
   - Avoid nested ternary operators - prefer switch statements or if/else chains
   - Choose clarity over brevity - explicit code is often better than overly compact code

## 5. Check correctness
   - Does the implementation match the intent? Are edge cases handled?
   - Are new/changed behaviours covered by tests?
   - Are there unsafe casts, `any` types, or unchecked assumptions?
   - Does the change introduce injection vulnerabilities, credential leaks, or other security issues?

## 6. **Maintain balance**: Avoid over-simplification that could:
   - Reduce code clarity or maintainability
   - Create overly clever solutions that are hard to understand
   - Combine too many concerns into single functions or components
   - Remove helpful abstractions that improve code organization
   - Make the code harder to debug or extend

## 7. Test Coverage Review

Verify that the changes are properly tested:

- Are new behaviors covered by tests?
- Are edge cases tested?
- Do tests accurately reflect the acceptance criteria?
- Are there any missing test cases based on the specification?

# EXECUTION

If you find issues in either the standards or specification review OR if you find improvements to make:

1. Make the changes directly on this branch to address the issues
2. Run tests and type checking to ensure nothing is broken
3. Commit describing the refinements

If the code fully meets both standards and specification and is already clean and well-structured, do nothing.

Once complete, only output  <promise>COMPLETE</promise>.

# FINAL RULES

- Do not leave commented-out code or TODO comments in committed code.
- **Never modify `.npmrc` or `pnpm-workspace.yaml`.** These files enforce supply-chain security policies and must not be changed by automated tooling.
- ALWAYS use `pnpm` for all package management and script execution. Never use `npm` or `yarn`.
- **Always use the git-workflow-and-versioning skill for all commits.** Do not commit without invoking the skill.
- **NEVER** attempt to push the changes to remote config
