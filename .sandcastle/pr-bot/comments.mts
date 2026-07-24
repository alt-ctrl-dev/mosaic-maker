import type { Comment } from "./types.mts";
import { BOT_REPLY_PREFIX } from "./types.mts";

export const hasSandcastleCommand = (comment: Comment): boolean => {
  return comment.sandcastleCommand != null;
};

export const extractSandcastleCommand = (commentBody: string): string | undefined => {
  const match = commentBody.match(/\/sandcastle\s+(.*)/);
  return match ? match[1] : undefined;
};

export const findUnhandledSandcastleComments = (comments: Comment[]): Comment[] => {
  const sandcastleComments = comments.filter(hasSandcastleCommand);

  const latestBotReplyTime = Math.max(
    0,
    ...comments
      .filter(comment => comment.body.includes(BOT_REPLY_PREFIX))
      .map(comment => new Date(comment.createdAt).getTime())
  );

  if (latestBotReplyTime === 0) return sandcastleComments;

  return sandcastleComments.filter(
    comment => new Date(comment.createdAt).getTime() > latestBotReplyTime
  );
};
