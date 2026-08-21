# ISSUES

Here are the open issues in the repo:

<issues-json>

!`gh issue list --state open --label ready-for-agent --limit 100 --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

The list above has already been filtered to issues ready for work.

# OPEN PULL REQUESTS

<prs-json>

!`gh pr list --state open --limit 100 --json number,title,body,headRefName,closingIssuesReferences`

</prs-json>

# TASK

Analyze the open issues and build a dependency graph. For each issue, determine whether it **blocks** or **is blocked by** any other open issue.

An issue B is **blocked by** issue A if:

- B requires code or infrastructure that A introduces
- B and A modify overlapping files or modules, making concurrent work likely to produce merge conflicts
- B's requirements depend on a decision or API shape that A will establish

An issue is **unblocked** if it has zero blocking dependencies on other open issues.

For each unblocked issue, assign a branch name using the exact format `sandcastle/issue-{id}` (no slug or other suffix). This must be deterministic so that re-planning the same issue always produces the same branch name and accumulated progress is preserved.

## Priority order

Pick issues in this order:

1. **In-progress work** — resume any open issue tagged with the label `in-progress` from the previous iteration, unless an open pull request already uses its `sandcastle/issue-{id}` branch or references that exact issue number (including through `closingIssuesReferences`)
2. **Bug fixes** — broken behaviour affecting users
3. **Tracer bullets** — thin end-to-end slices that prove an approach works
4. **Polish** — improving existing functionality (error messages, UX, docs)
5. **Refactors** — internal cleanups with no user-visible change

Before selecting an in-progress issue, check the open pull requests above. Exclude the issue if a pull request already uses its branch or references its exact issue number; do not confuse it with partial number matches (for example, `#42` and `#142`). Then pick the highest-priority unblocked remaining issue, in the order above.

# OUTPUT

Include only unblocked issues. If every issue is blocked, include the single highest-priority candidate (the one with the fewest or weakest dependencies). If there are no issues to work on at all, emit an empty `issues` array — never omit the output block.

Reply with nothing but the output block below (no preamble, no restating these instructions), filling in the real issues:

<plan>
{"issues": [{"id": "42", "title": "Fix auth bug", "branch": "sandcastle/issue-42"}]}
</plan>