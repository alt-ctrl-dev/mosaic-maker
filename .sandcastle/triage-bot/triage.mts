import { execSync } from "child_process";
import { z } from "zod";

const READY_LABELS = new Set(["ready-for-agent", "ready-for-human"]);

const ISSUES_RESPONSE = z.array(
  z.object({
    number: z.number(),
    title: z.string(),
    labels: z.array(z.object({ name: z.string() })),
  }),
);

export type Issue = z.infer<typeof ISSUES_RESPONSE>[number];

export const filterIssuesNeedingTriage = (issues: Issue[]): Issue[] =>
  issues.filter(
    (issue) => !issue.labels.some((label) => READY_LABELS.has(label.name)),
  );

export const getOpenIssuesNeedingTriage = (): Issue[] => {
  try {
    const output = execSync(
      "gh issue list --state open --limit 500 --json number,title,labels",
      { encoding: "utf-8" },
    );
    return filterIssuesNeedingTriage(ISSUES_RESPONSE.parse(JSON.parse(output)));
  } catch (error) {
    console.error("Failed to fetch open issues:", error);
    return [];
  }
};
