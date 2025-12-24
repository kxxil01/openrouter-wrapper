import { DEFAULT_RETRY_ATTEMPTS, DEFAULT_RETRY_DELAY } from './config';

export async function retryFetch(
  url,
  options = {},
  maxRetries = DEFAULT_RETRY_ATTEMPTS,
  baseDelay = DEFAULT_RETRY_DELAY
) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (
        response.ok ||
        (response.status !== 429 && (response.status < 500 || response.status >= 600))
      ) {
        return response;
      }

      console.warn(`Request failed (${response.status}), attempt ${attempt + 1}/${maxRetries + 1}`);
      lastError = new Error(
        `Server responded with status: ${response.status} ${response.statusText}`
      );

      if (attempt === maxRetries) {
        return response;
      }
    } catch (error) {
      console.warn(`Network error, attempt ${attempt + 1}/${maxRetries + 1}:`, error.message);
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }
    }

    const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000) * (0.8 + Math.random() * 0.4);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError || new Error('Retry attempt count exceeded');
}
