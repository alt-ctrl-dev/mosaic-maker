# TASK

Fix issue {{ISSUE_ID}}: {{ISSUE_TITLE}}

Pull in the issue using `gh issue view <ISSUE_ID>`. If it has a parent PRD, pull that in too.

Only work on the issue specified.

Work on branch {{BRANCH}}. Make commits and run tests.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# PLAN 
Decide what to change and why. Keep the change as small as possible.


# EXECUTION

Mark the task as in progress.
!`gh issue edit $ISSUE_ID --add-label "in-progress"`

If applicable, use RGR to complete the task.

1. RED: write one test
2. GREEN: write the implementation to pass that test
3. REPEAT until done
4. REFACTOR the code

# FEEDBACK LOOPS

Before committing, run the following to ensure the code is upto standard.

- `pnpm run typecheck` 
- `pnpm run test`
- `pnpm run format`
- `pnpm run lint`

# COMMIT

Make a git commit. Load the /git-workflow-and-versioning skill. The commit message must:

1. Include task completed + PRD reference
2. Key decisions made
3. Files changed
4. Blockers or notes for next iteration

Keep it concise.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done.

Do not close the issue - this will be done later.

Once complete, output <promise>COMPLETE</promise>.

# FINAL RULES

- **ONLY WORK ON A SINGLE TASK.**
- Do not stop until you have committed the fix and verified the feedback loop has passed.
- Do not leave commented-out code or TODO comments in committed code.
- ALWAYS use `pnpm` for all package management and script execution. Never use `npm` or `yarn`.
- **Always use the git-workflow-and-versioning skill for all commits.** Do not commit without invoking the skill.
- **If blocked:** Leave a detailed comment on the issue stating:
  - What was attempted
  - What failed and why
  - What is needed to proceed (missing context, external dependency, decision needed, etc.)
  - Concrete next steps
- **Never close a blocked issue.**
