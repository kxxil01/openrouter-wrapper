import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getCookie } from 'hono/cookie';
import { v7 as uuidv7 } from 'uuid';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL_ID = process.env.DEFAULT_MODEL_ID || 'deepseek/deepseek-r1-0528:free';
const DISABLE_PAYWALL = process.env.DISABLE_PAYWALL === 'true';
const FREE_MESSAGE_LIMIT = 5;
const TITLE_GENERATION_THRESHOLDS = [1, 3, 5];

function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

async function streamOpenRouterCompletion(
  messages: Array<{ role: string; content: string }>,
  model: string,
  onChunk: (content: string) => void,
  onComplete: (fullContent: string) => void,
  onError: (error: Error) => void,
  temperature: number = 0.7
): Promise<void> {
  if (!OPENROUTER_API_KEY) {
    onError(new Error('OpenRouter API key is not configured'));
    return;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://claude-opus-wrapper.com',
        'X-Title': 'Claude Opus Wrapper',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    onComplete(fullContent);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

async function generateConversationTitle(
  conversationId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://claude-opus-wrapper.com',
        'X-Title': 'Claude Opus Wrapper',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'system',
            content:
              'Generate a short, concise title (max 6 words) for this conversation. Return ONLY the title, no quotes, no explanation.',
          },
          {
            role: 'user',
            content: `Conversation:\n${messages.map((m) => `${m.role}: ${m.content.substring(0, 200)}`).join('\n')}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 30,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const title = data.choices?.[0]?.message?.content?.trim();
      if (title && title.length > 0 && title.length <= 100) {
        await sql`UPDATE conversations SET title = ${title} WHERE id = ${conversationId}`;
        console.log(`[Title] Updated conversation ${conversationId}: "${title}"`);
      }
    }
  } catch (error) {
    console.error('[Title] Failed to generate title:', error);
  }
}

const chatRoutes = new Hono();

chatRoutes.post('/completions', async (c) => {
  const sessionToken = getCookie(c, 'session');
  let userId: string | null = null;
  let subscriptionStatus: string = 'free';
  let messageCount: number = 0;

  if (sessionToken) {
    const user = await auth.validateSession(sessionToken);
    if (user) {
      userId = user.id;
      subscriptionStatus = user.subscription_status || 'free';

      const todayUTC = getTodayUTC();
      const resetDate = user.message_count_reset_at
        ? new Date(user.message_count_reset_at).toISOString().split('T')[0]
        : null;

      if (resetDate !== todayUTC) {
        await sql`UPDATE users SET message_count = 0, message_count_reset_at = ${todayUTC} WHERE id = ${user.id}`;
        messageCount = 0;
      } else {
        messageCount = user.message_count || 0;
      }
    }
  }

  if (!DISABLE_PAYWALL && subscriptionStatus !== 'active' && messageCount >= FREE_MESSAGE_LIMIT) {
    return c.json(
      {
        error: {
          message: 'Subscription required. Please upgrade to continue chatting.',
          code: 'SUBSCRIPTION_REQUIRED',
        },
      },
      403
    );
  }

  const body = await c.req.json();
  const { messages, model, stream = false, conversation_id, temperature = 0.7 } = body;
  const requestId = uuidv7().substring(0, 8);

  console.log(`[${requestId}] Chat request, stream=${stream}, temperature=${temperature}`);

  if (!messages || !Array.isArray(messages)) {
    return c.json({ error: 'Valid messages array is required' }, 400);
  }

  const modelId = model || DEFAULT_MODEL_ID;

  if (stream) {
    return streamSSE(c, async (stream) => {
      await streamOpenRouterCompletion(
        messages,
        modelId,
        (chunk) => {
          const deltaFormat = {
            choices: [
              {
                delta: { content: chunk },
                index: 0,
                finish_reason: null,
              },
            ],
            id: requestId,
            model: modelId,
            object: 'chat.completion.chunk',
          };
          stream.writeSSE({ data: JSON.stringify(deltaFormat) });
        },
        async (content) => {
          stream.writeSSE({ data: '[DONE]' });

          let convId = conversation_id;
          try {
            if (!convId) {
              const id = uuidv7();
              await sql`
                INSERT INTO conversations (id, user_id, title, model_id, created_at, updated_at)
                VALUES (${id}, ${userId}, 'New Conversation', ${modelId}, NOW(), NOW())
              `;
              convId = id;
            }

            const [existing] = await sql`SELECT id FROM conversations WHERE id = ${convId}`;
            if (!existing) {
              await sql`
                INSERT INTO conversations (id, user_id, title, model_id, created_at, updated_at)
                VALUES (${convId}, ${userId}, 'New Conversation', ${modelId}, NOW(), NOW())
              `;
            }

            const messageId = uuidv7();
            await sql`
              INSERT INTO messages (id, conversation_id, role, content, created_at)
              VALUES (${messageId}, ${convId}, 'assistant', ${content}, NOW())
            `;
            await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${convId}`;

            if (userId && subscriptionStatus !== 'active') {
              await sql`UPDATE users SET message_count = message_count + 1 WHERE id = ${userId}`;
            }

            const msgCountResult =
              await sql`SELECT COUNT(*) as count FROM messages WHERE conversation_id = ${convId}`;
            const totalMessages = parseInt(String(msgCountResult[0]?.count || '0'), 10);

            if (TITLE_GENERATION_THRESHOLDS.includes(totalMessages)) {
              const allMessages = await sql`
                SELECT role, content FROM messages 
                WHERE conversation_id = ${convId} 
                ORDER BY created_at ASC
              `;
              generateConversationTitle(
                convId,
                allMessages.map((m) => ({
                  role: String(m.role),
                  content: String(m.content),
                }))
              );
            }

            console.log(`[${requestId}] Saved assistant response to database`);
          } catch (dbError) {
            console.error(`[${requestId}] Error saving to database:`, dbError);
          }
        },
        (error) => {
          console.error(`[${requestId}] Stream error:`, error);
          stream.writeSSE({
            data: JSON.stringify({
              error: { message: error.message, code: 'STREAM_ERROR', requestId },
            }),
          });
        },
        temperature
      );
    });
  } else {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://claude-opus-wrapper.com',
          'X-Title': 'Claude Opus Wrapper',
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: false,
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      const assistantContent = data.choices?.[0]?.message?.content;
      if (assistantContent && conversation_id) {
        try {
          const messageId = uuidv7();
          await sql`
            INSERT INTO messages (id, conversation_id, role, content, created_at)
            VALUES (${messageId}, ${conversation_id}, 'assistant', ${assistantContent}, NOW())
          `;
          await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${conversation_id}`;

          const msgCountResult =
            await sql`SELECT COUNT(*) as count FROM messages WHERE conversation_id = ${conversation_id}`;
          const totalMessages = parseInt(String(msgCountResult[0]?.count || '0'), 10);

          if (TITLE_GENERATION_THRESHOLDS.includes(totalMessages)) {
            const allMessages = await sql`
              SELECT role, content FROM messages 
              WHERE conversation_id = ${conversation_id} 
              ORDER BY created_at ASC
            `;
            generateConversationTitle(
              conversation_id,
              allMessages.map((m) => ({
                role: String(m.role),
                content: String(m.content),
              }))
            );
          }
        } catch (dbError) {
          console.error(`[${requestId}] Error saving to database:`, dbError);
        }
      }

      return c.json(data);
    } catch (error) {
      console.error(`[${requestId}] Claude API error:`, error);
      return c.json(
        {
          error: {
            message: error instanceof Error ? error.message : 'Failed to get response from Claude',
            code: 'CLAUDE_ERROR',
            requestId,
          },
        },
        500
      );
    }
  }
});

export default chatRoutes;
