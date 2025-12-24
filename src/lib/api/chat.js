import { API_BASE_URL } from './config';

export async function sendMessageToClaudeAPI(
  modelId,
  messages,
  stream = true,
  conversationId = null,
  onStreamChunk = null,
  onStreamError = null,
  onStreamComplete = null,
  temperature = 0.7
) {
  const requestBody = {
    model: modelId,
    messages: messages,
    stream: stream,
    conversation_id: conversationId,
    temperature: temperature,
  };

  if (stream && onStreamChunk) {
    const controller = new AbortController();
    let streamedContent = '';

    try {
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
        throw new Error(
          errorData.error?.message || `Request failed with status ${response.status}`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              if (onStreamComplete) onStreamComplete(streamedContent);
              return { controller, content: streamedContent };
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                streamedContent += content;
                onStreamChunk(content);
              }
            } catch (_e) {
              // Skip invalid JSON
            }
          }
        }
      }

      if (onStreamComplete) onStreamComplete(streamedContent);
      return { controller, content: streamedContent };
    } catch (error) {
      if (onStreamError) onStreamError(error);
      throw error;
    }
  } else {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
      throw new Error(errorData.error?.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }
}
