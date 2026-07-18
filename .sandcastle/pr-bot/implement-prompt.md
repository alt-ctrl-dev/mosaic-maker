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