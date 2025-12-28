import { getRedis, isRedisAvailable } from './redis';

export interface TeamUpdate {
  type: 'new_message' | 'message_edited' | 'conversation_created' | 'member_joined' | 'member_left';
  teamId: string;
  conversationId?: string;
  userId?: string;
  data?: Record<string, unknown>;
}

const TEAM_CHANNEL_PREFIX = 'team:updates:';

export function getTeamChannel(teamId: string): string {
  return `${TEAM_CHANNEL_PREFIX}${teamId}`;
}

export async function publishTeamUpdate(update: TeamUpdate): Promise<boolean> {
  if (!isRedisAvailable()) return false;

  try {
    const redis = getRedis();
    const channel = getTeamChannel(update.teamId);
    await redis.publish(channel, JSON.stringify(update));
    return true;
  } catch (error) {
    console.error('[Realtime] Failed to publish team update:', error);
    return false;
  }
}

export async function subscribeToTeam(
  teamId: string,
  callback: (update: TeamUpdate) => void
): Promise<() => void> {
  if (!isRedisAvailable()) {
    return () => {};
  }

  const redis = getRedis();
  const subscriber = redis.duplicate();
  const channel = getTeamChannel(teamId);

  await subscriber.subscribe(channel);

  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const update = JSON.parse(message) as TeamUpdate;
        callback(update);
      } catch (error) {
        console.error('[Realtime] Failed to parse team update:', error);
      }
    }
  });

  return async () => {
    await subscriber.unsubscribe(channel);
    await subscriber.quit();
  };
}

export async function publishNewMessage(
  teamId: string,
  conversationId: string,
  userId: string
): Promise<void> {
  await publishTeamUpdate({
    type: 'new_message',
    teamId,
    conversationId,
    userId,
  });
}

export async function publishConversationCreated(
  teamId: string,
  conversationId: string,
  userId: string
): Promise<void> {
  await publishTeamUpdate({
    type: 'conversation_created',
    teamId,
    conversationId,
    userId,
  });
}
