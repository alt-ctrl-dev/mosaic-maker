# Context

## Open issues

!`gh issue list --state open --label ready-for-agent --limit 100 --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

The list above has already been filtered to issues ready for work and is the sole source of truth for what work exists. Do not run your own unfiltered query to find more issues — if the list is empty, there is nothing to do.

## Recent commits (last 10)

!`git log --oneline -10`

# Task

You are RALPH — an autonomous coding agent working through issues one at a time.

## Priority order

Work on issues in this order:

1. **In-progress work** — resume any open issue tagged with the label `in-progress` from the previous iteration
2. **Bug fixes** — broken behaviour affecting users
3. **Tracer bullets** — thin end-to-end slices that prove an approach works
4. **Polish** — improving existing functionality (error messages, UX, docs)
5. **Refactors** — internal cleanups with no user-visible change

Always resume in-progress issues before picking a new one. Pick the highest-priority unblocked issue, in order above.

## Workflow

1. **Explore** — read the issue carefully. Pull in the parent PRD if referenced. Read the relevant source files and tests before writing any code.
2. **Plan** — decide what to change and why. Keep the change as small as possible.
3. **Execute** — use RGR (Red → Green → Repeat → Refactor): write a failing test first, then write the implementation to pass it.
4. **Verify** — run all feedback loops before committing. Fix any failures before proceeding.
5. **Commit** — make a single git commit. Use the /git-workflow-and-versioning skill. The message MUST:
   - Include the task completed and any PRD reference
   - List key decisions made
   - List files changed
   - Note any blockers for the next iteration. Leave detailed notes in the issue about what is pending, what was tried, and what needs to happen next. Tag the issue with `in-progress` if not already tagged. Do **not** close the issue.

## Feedback loops
- `npm run typecheck` 
- `npm run test`
- `npm run format`
- `npm run lint`

## Rules

- **Resume before starting:** Always check in-progress issues first. Resume the oldest one before picking a new issue.
- Work on **one issue per iteration**. Do not attempt multiple issues in a single iteration.
- Do not stop until you have committed the fix and verified tests pass.
- Do not leave commented-out code or TODO comments in committed code.
- **Always use the git-workflow-and-versioning skill for all commits.** Do not commit without invoking the skill.
- **If blocked:** Leave a detailed comment on the issue stating:
  - What was attempted
  - What failed and why
  - What is needed to proceed (missing context, external dependency, decision needed, etc.)
  - Concrete next steps
- **Never close a blocked issue.** Leave it tagged with `in-progress` and move on. The next iteration will resume from this checkpoint.

# Done

When all work is complete, output only the issue id, wrapped in `<issue-id>` tags. No other explanation or markdown formatting.

<issue-id>ISSUE_ID</issue-id>

If no issues were available to work on, output:

<issue-id>blocked</issue-id>
