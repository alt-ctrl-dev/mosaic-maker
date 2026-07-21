import { execSync } from "child_process";
import fs from "fs";
import type { Comment, PR } from "./types.mts";
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

export const getCommentsForPR = async (prNumber: number): Promise<Comment[]> => {
  try {
    // Issue-level comments
    const issueOutput = execSync(
      `gh pr view ${prNumber} --json comments`,
      { encoding: "utf-8" }
    );

    const issueResponse = ISSUE_COMMENTS_RESPONSE.parse(JSON.parse(issueOutput));
    const issueComments: Comment[] = issueResponse.comments.map(c => ({
      id: c.id,
      author: c.author.login,
      body: c.body,
      createdAt: c.createdAt,
      isReviewComment: false,
      isBotReply: false,
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
  const commentFileName = `pr-${prNumber}-comment.md`;
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
