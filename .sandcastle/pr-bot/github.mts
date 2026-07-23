import { execSync } from "child_process";
import fs from "fs";
import type { Comment, PR, Reactions } from "./types.mts";
import { ISSUE_COMMENTS_RESPONSE, REVIEW_COMMENTS_RESPONSE, BOT_REPLY_PREFIX } from "./types.mts";
import { extractSandcastleCommand, isBotReply } from "./comments.mts";

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
  totalCount: r.total_count,
  plusOne: r["+1"],
  minusOne: r["-1"],
  laugh: r.laugh,
  hooray: r.hooray,
  confused: r.confused,
  heart: r.heart,
  rocket: r.rocket,
  eyes: r.eyes,
});

export const getCommentsForPR = async (prNumber: number): Promise<Comment[]> => {
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
      isBotReply: false,
      reactions: toReactions(c.reactions),
    }));

    // Review comments (attached to files/lines)
    const reviewOutput = execSync(
      `gh api "repos/:owner/:repo/pulls/${prNumber}/comments"`,
      { encoding: "utf-8" }
    );

    const rawReviewComments = REVIEW_COMMENTS_RESPONSE.parse(JSON.parse(reviewOutput));
    const reviewComments: Comment[] = rawReviewComments.map(c => ({
      id: String(c.id),
      author: c.user.login,
      body: c.body,
      createdAt: c.created_at,
      isReviewComment: true,
      isBotReply: false,
      file: c.path,
      line: c.line ?? undefined,
      diffHunk: c.diff_hunk,
      reactions: toReactions(c.reactions),
    }));

    const allComments = [...issueComments, ...reviewComments];

    return allComments.map(comment => ({
      ...comment,
      isBotReply: isBotReply(comment),
      sandcastleCommand: extractSandcastleCommand(comment.body)
    }));
  } catch (error) {
    console.error(`Failed to fetch comments for PR #${prNumber}:`, error);
    return [];
  }
};

export const postComment = async (prNumber: number, body: string, replyTo?: Comment): Promise<void> => {
  const commentFileName = `pr-${prNumber}-comment-${Date.now()}.md`;
  try {
    if (replyTo?.isReviewComment) {
      // Reply to review comment via API; use file for body to avoid shell escaping
      fs.writeFileSync(commentFileName, body);
      execSync(
        `gh api "repos/:owner/:repo/pulls/${prNumber}/comments/${replyTo.id}/replies" -F body=@${commentFileName}`,
        { stdio: "inherit" }
      );
    } else {
      // Reply to issue comment via quote reply
      const replyBody = replyTo
        ? `> ${replyTo.body.split('\n').join('\n> ')}\n\n@${replyTo.author} ${body}`
        : body;
      fs.writeFileSync(commentFileName, replyBody);
      execSync(
        `gh pr comment ${prNumber} --body-file ${commentFileName}`,
        { stdio: "inherit" }
      );
    }
  } catch (error) {
    console.error(`Failed to post comment on PR #${prNumber}:`, error);
  } finally {
    try { fs.rmSync(commentFileName); } catch { /* best effort cleanup */ }
  }
};

export const extractLinkedIssueNumbers = (body: string | null): number[] => {
  if (!body) return [];
  const pattern = /(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi;
  return [...new Set([...body.matchAll(pattern)].map(m => parseInt(m[1], 10)))];
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
