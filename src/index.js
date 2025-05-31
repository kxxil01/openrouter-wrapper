import dotenv from 'dotenv';
import { ClaudeOpus } from './claude.js';
import { validateEnv } from './utils.js';

// Load environment variables
dotenv.config();

// Validate environment variables
try {
  validateEnv();
} catch (error) {
  console.warn(`Environment validation warning: ${error.message}`);
  console.warn('Make sure to provide required environment variables or pass them directly to the constructor.');
}

// Export the ClaudeOpus class
export { ClaudeOpus };

// Export a default instance for convenience
export default new ClaudeOpus();
