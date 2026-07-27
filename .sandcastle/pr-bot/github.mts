import { execSync } from "child_process";
import fs from "fs";
import type { Comment, PR, Reactions } from "./types.mts";
import { ISSUE_COMMENTS_RESPONSE, REVIEW_COMMENTS_RESPONSE } from "./types.mts";

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

const hasSandcastleCommand = (comment: Comment): boolean => {
  return comment.sandcastleCommand != null;
};

const extractSandcastleCommand = (commentBody: string): string | undefined => {
  const match = commentBody.match(/\/sandcastle\s+(.*)/);
  return match ? match[1] : undefined;
};

const getUnresolvedReviewComments = (prNumber: number) => {
  const result = execSync('gh repo view --json owner,name --jq ".owner.login,.name"', { encoding: 'utf8' }).trim();
  const [owner, repo] = result.split('\n');

  const unresolvedIds = new Map<number, boolean>();
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
          comments(first: 10) {
            nodes { databaseId }
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
    const gqlData = JSON.parse(gqlOutput);
    const threads = gqlData.data.repository.pullRequest.reviewThreads;
    for (const t of threads.nodes) {
      for (const c of t.comments.nodes) {
          unresolvedIds.set(c.databaseId, t.isResolved);
        }
    }
    hasNextPage = threads.pageInfo.hasNextPage;
    cursor = threads.pageInfo.endCursor;
  }

  // Review comments (attached to files/lines)
  const reviewOutput = execSync(
    `gh api "repos/:owner/:repo/pulls/${prNumber}/comments"`,
    { encoding: "utf-8" }
  );

  const rawReviewComments = REVIEW_COMMENTS_RESPONSE.parse(JSON.parse(reviewOutput));
  const reviewComments: Comment[] = rawReviewComments
    .filter(c => !unresolvedIds.get(c.id))
    .map(c => ({
      id: String(c.id),
      author: c.user.login,
      body: c.body,
      createdAt: c.created_at,
      isReviewComment: true,
      file: c.path,
      line: c.line ?? undefined,
      diffHunk: c.diff_hunk,
      reactions: toReactions(c.reactions),
    }));

  return reviewComments
}

export const getUnresolvedSandcastleCommentsForPR = async (prNumber: number): Promise<Comment[]> => {
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

    
    const reviewComments = getUnresolvedReviewComments(prNumber)
    const allComments = [...issueComments, ...reviewComments].map(comment => ({
      ...comment,
      sandcastleCommand: extractSandcastleCommand(comment.body)
    }))
      .filter(hasSandcastleCommand)
      .filter(c => c.reactions.rocket === 0);

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
      commentId = String(JSON.parse(result).id);
    } else {
      const replyBody = replyTo
        ? `> ${replyTo.body.split('\n').join('\n> ')}\n\n@${replyTo.author} ${body}`
        : body;
      fs.writeFileSync(commentFileName, replyBody);
      const result = execSync(
        `gh api "repos/:owner/:repo/issues/${prNumber}/comments" -F body=@${commentFileName}`,
        { encoding: "utf-8" }
      );
      commentId = String(JSON.parse(result).id);
    }
    if (commentId) {
      const reactionEndpoint = replyTo?.isReviewComment
        ? `repos/:owner/:repo/pulls/comments/${commentId}/reactions`
        : `repos/:owner/:repo/issues/comments/${commentId}/reactions`;
      execSync(
        `gh api "${reactionEndpoint}" -f content=rocket`,
        { stdio: "inherit" }
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
