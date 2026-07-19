# IMPLEMENT PR CHANGE REQUEST

You are implementing a requested change based on a `/sandcastle` command in a GitHub PR comment.

## CONTEXT

### PR Information
PR Number: {{PR_NUMBER}}
PR Title: {{PR_TITLE}}
PR Branch: {{PR_BRANCH}}

### Change Request
{{CHANGE_REQUEST}}

### Additional Context
{{CONTEXT}}

## YOUR TASK

Implement the requested change on the PR branch. Follow these steps:

1. **Rebase from Main** - Rebase the PR branch onto the latest `origin/main` before making changes
2. **Understand the Request** - Carefully read the change request and context to understand what needs to be implemented
3. **Make the Changes** - Implement the requested functionality while following project coding standards
4. **Add Tests** - If appropriate, add or update tests for the new functionality
5. **Verify Changes** - Run relevant tests and checks to ensure the implementation is correct

**IMPORTANT: All work happens in the sandboxed environment. Never create a new branch on the host. Always use the existing PR branch within the sandbox.**

## GUIDELINES

### Implementation
- Keep changes focused on the specific request
- Follow the existing code style and patterns in the project
- Write clear, maintainable code
- Add comments only when necessary to explain complex logic

### Testing
- Add tests for new functionality
- Ensure existing tests still pass
- Consider edge cases and error conditions

### Project Standards
- Follow the coding standards defined in @.sandcastle/shared/CODING_STANDARDS.md
- Ensure all code passes type checking
- Maintain existing architecture patterns

## OUTPUT

When you are finished implementing the change, output:
<promise>COMPLETE</promise>

This will signal that the implementation is complete and the branch can be pushed.

# FINAL RULES

- **ONLY WORK ON A SINGLE TASK.**
- **Never modify `.npmrc` or `pnpm-workspace.yaml`.** These files enforce supply-chain security policies and must not be changed by automated tooling.
- Do not stop until you have committed the fix and verified the feedback loop has passed.
- Do not leave commented-out code or TODO comments in committed code.
- ALWAYS use `pnpm` for all package management and script execution. Never use `npm` or `yarn`.
- **Always use the git-workflow-and-versioning skill for all commits.** Do not commit without invoking the skill.
- **NEVER** skip or bypass git hooks
- **If blocked:** Leave a detailed comment on the issue stating:
  - What was attempted
  - What failed and why
  - What is needed to proceed (missing context, external dependency, decision needed, etc.)
  - Concrete next steps
- **Never close a blocked issue.**
- **NEVER create a new branch on the host.** All branch operations (checkout, create, rebase) happen exclusively in the sandboxed environment. Use the existing PR branch only.