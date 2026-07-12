# Issue tracker: GitHub

Issues, PRDs, and epics for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Work hierarchy

- Parent issues are epics.
- Break epics into implementation tasks using native GitHub sub-issues.
- Sub-issues should be independently implementable and declare blocking relationships when ordering matters.
- Do not create separate standalone tasks when they belong to an epic.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."`
- Close: `gh issue close <number> --comment "..."`
- Link a task to an epic using GitHub's native sub-issues API.
- Represent task dependencies using GitHub's native issue dependencies.

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue. If it is part of an epic, link it as a sub-issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Use one parent issue as the map and native GitHub sub-issues for investigation tickets. Use native issue dependencies for blocking relationships. If either feature is unavailable, fall back to task lists and `Blocked by: #<number>` lines.
