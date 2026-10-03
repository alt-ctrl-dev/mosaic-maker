import { describe, expect, it } from "vitest";
import { filterIssuesNeedingTriage } from "./triage.mts";

describe("filterIssuesNeedingTriage", () => {
  it("keeps an issue with no labels", () => {
    const issues = [{ number: 1, title: "No labels", labels: [] }];
    expect(filterIssuesNeedingTriage(issues)).toEqual(issues);
  });

  it("excludes an issue labelled ready-for-agent", () => {
    const issues = [
      {
        number: 2,
        title: "Ready for agent",
        labels: [{ name: "ready-for-agent" }],
      },
    ];
    expect(filterIssuesNeedingTriage(issues)).toEqual([]);
  });

  it("excludes an issue labelled ready-for-human", () => {
    const issues = [
      {
        number: 3,
        title: "Ready for human",
        labels: [{ name: "ready-for-human" }],
      },
    ];
    expect(filterIssuesNeedingTriage(issues)).toEqual([]);
  });

  it("keeps issues with other triage labels", () => {
    const issues = [
      {
        number: 4,
        title: "Bug needing triage",
        labels: [{ name: "bug" }, { name: "needs-triage" }],
      },
    ];
    expect(filterIssuesNeedingTriage(issues)).toEqual(issues);
  });

  it("handles a mixed list", () => {
    const issues = [
      { number: 5, title: "Unlabeled", labels: [] },
      { number: 6, title: "Ready", labels: [{ name: "ready-for-agent" }] },
      { number: 7, title: "Other", labels: [{ name: "enhancement" }] },
    ];

    expect(filterIssuesNeedingTriage(issues)).toEqual([issues[0], issues[2]]);
  });
});
