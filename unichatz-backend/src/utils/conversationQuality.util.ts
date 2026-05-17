interface ConversationMetrics {
  startedAt: Date;
  endedAt: Date;
  totalMessages: number;
  user1Messages: number;
  user2Messages: number;
  wasReported: boolean;
  wasEarlySkipped: boolean;
}

export const isQualityConversation = (
  metrics: ConversationMetrics
): boolean => {
  const duration =
    new Date(metrics.endedAt).getTime() -
    new Date(metrics.startedAt).getTime();

  const minDuration = 3 * 60 * 1000; // 3 minutes
  const minTotalMessages = 15;
  const minPerUser = 5;

  if (duration < minDuration) return false;

  if (metrics.totalMessages < minTotalMessages) return false;

  if (
    metrics.user1Messages < minPerUser ||
    metrics.user2Messages < minPerUser
  )
    return false;

  if (metrics.wasReported) return false;

  if (metrics.wasEarlySkipped) return false;

  return true;
};