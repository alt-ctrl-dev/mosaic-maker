import { execSync } from "child_process";
import fs from "fs";
import type { Comment, PR, Reactions } from "./types.mts";
import { ISSUE_COMMENTS_RESPONSE, REVIEW_THREADS_GRAPHQL } from "./types.mts";

export const getOpenPRs = async (): Promise<PR[]> => {
  try {
    const output = execSync(
      `gh pr list --state open --limit 100 --json number,title,body,headRefName`,
      { encoding: "utf-8" }
    );
    return JSON.parse(output);
  } catch (error) {
    console.error("Failed to fetch open PRs:", error);
    return [];
  }
};

const toReactions = (r: Record<string, number>): Reactions => ({
  rocket: r.rocket,
  eyes: r.eyes,
});

const hasSandcastle = (body: string): boolean =>
  /\/sandcastle/.test(body);

const fromReactionGroups = (groups: Array<{ content: string; users: { totalCount: number } }>): Reactions => ({
  rocket: groups.find(g => g.content === 'ROCKET')?.users.totalCount ?? 0,
  eyes: groups.find(g => g.content === 'EYES')?.users.totalCount ?? 0,
});

const getUnresolvedReviewComments = (prNumber: number): Comment[] => {
  const result = execSync('gh repo view --json owner,name --jq ".owner.login,.name"', { encoding: 'utf8' }).trim();
  const [owner, repo] = result.split('\n');

  const comments: Comment[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const cursorArg = cursor ? `, after: "${cursor}"` : '';
    const query = `query {
  repository(owner: "${owner}", name: "${repo}") {
    pullRequest(number: ${prNumber}) {
      reviewThreads(first: 100${cursorArg}) {
        pageInfo { hasNextPage endCursor }
        nodes {
          isResolved
          isOutdated
          comments(first: 50) {
            nodes {
              databaseId
              body
              author { login }
              createdAt
              path
              originalPosition
              diffHunk
              reactionGroups {
                content
                users { totalCount }
              }
            }
          }
        }
      }
    }
  }
}`;
    const gqlOutput = execSync('gh api graphql --input -', {
      encoding: 'utf8',
      input: JSON.stringify({ query }),
    });
    const gqlData = REVIEW_THREADS_GRAPHQL.parse(JSON.parse(gqlOutput));
    const threads = gqlData.data.repository.pullRequest.reviewThreads;
    for (const t of threads.nodes) {
      if (t.isResolved || t.isOutdated) continue;
      for (const c of t.comments.nodes) {
        comments.push({
          id: String(c.databaseId),
          author: c.author.login,
          body: c.body,
          createdAt: c.createdAt,
          isReviewComment: true,
          file: c.path,
          line: c.originalPosition ?? undefined,
          diffHunk: c.diffHunk,
          reactions: fromReactionGroups(c.reactionGroups),
        });
      }
    }
    hasNextPage = threads.pageInfo.hasNextPage;
    cursor = threads.pageInfo.endCursor;
  }

  return comments;
}

const getUnresolvedPrComments = (prNumber:number) =>{
  try {
    // Issue-level comments (REST API includes reactions)
    const issueOutput = execSync(
      `gh api "repos/:owner/:repo/issues/${prNumber}/comments"`,
      { encoding: "utf-8" }
    );

    const rawIssueComments = ISSUE_COMMENTS_RESPONSE.parse(JSON.parse(issueOutput));
    const issueComments: Comment[] = rawIssueComments.map(c => ({
      id: String(c.id),
      author: c.user.login,
      body: c.body,
      createdAt: c.created_at,
      isReviewComment: false,
      reactions: toReactions(c.reactions),
    }));
    return issueComments
  } catch (error) {
    console.error("getUnresolvedPrComments failed",error)
    return []
  }
}

export const getUnresolvedSandcastleCommentsForPR = async (prNumber: number): Promise<Comment[]> => {
  try {
    const issueComments = getUnresolvedPrComments(prNumber)
    const reviewComments = getUnresolvedReviewComments(prNumber);
    const allComments = [...issueComments, ...reviewComments]
      .filter(c => c.reactions.rocket === 0)
      .filter(c => hasSandcastle(c.body));

    return allComments;
  } catch (error) {
    console.error(`Failed to fetch comments for PR #${prNumber}:`, error);
    return [];
  }
};

export const postComment = async (prNumber: number, body: string, replyTo?: Comment): Promise<void> => {
  const commentFileName = `pr-${prNumber}-comment-${Date.now()}.md`;
  try {
    let commentId: string | undefined;
    if (replyTo?.isReviewComment) {
      fs.writeFileSync(commentFileName, body);
      const result = execSync(
        `gh api "repos/:owner/:repo/pulls/${prNumber}/comments/${replyTo.id}/replies" -F body=@${commentFileName}`,
        { encoding: "utf-8" }
      );
      const parsed = JSON.parse(result);
      if (!parsed || !parsed.id) {
        throw new Error(`gh api returned unexpected: ${result.slice(0, 200)}`);
      }
      commentId = String(parsed.id);
    } else {
      const replyBody = replyTo
        ? `> ${replyTo.body.split('\n').join('\n> ')}\n\n@${replyTo.author} ${body}`
        : body;
      fs.writeFileSync(commentFileName, replyBody);
      const result = execSync(
        `gh api "repos/:owner/:repo/issues/${prNumber}/comments" -F body=@${commentFileName}`,
        { encoding: "utf-8" }
      );
      const parsed = JSON.parse(result);
      if (!parsed || !parsed.id) {
        throw new Error(`gh api returned unexpected: ${result.slice(0, 200)}`);
      }
      commentId = String(parsed.id);
    }
    if (commentId) {
      const reactionEndpoint = replyTo?.isReviewComment
        ? `repos/:owner/:repo/pulls/comments/${commentId}/reactions`
        : `repos/:owner/:repo/issues/comments/${commentId}/reactions`;
      execSync(
        `gh api "${reactionEndpoint}" -f content=rocket`,
        { encoding: "utf-8" }
      );
    }
  } catch (error) {
    console.error(`Failed to post comment on PR #${prNumber}:`, error);
  } finally {
    try { fs.rmSync(commentFileName); } catch { /* best effort cleanup */ }
  }
};

export const getIssueContext = (issueNumber: number): string | null => {
  try {
    return execSync(
      `gh issue view ${issueNumber} --json title,body,state,comments`,
      { encoding: "utf-8" }
    );
  } catch {
    return null;
  }
};
