import { ClaudeOpus } from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a client instance
const claude = new ClaudeOpus();

async function runExample() {
  console.log('🤖 Claude Opus 4 Example');
  console.log('------------------------');
  
  try {
    console.log('Sending request to Claude Opus...');
    
    const response = await claude.createCompletion({
      messages: [
        { 
          role: 'system', 
          content: 'You are Claude, a helpful AI assistant created by Anthropic. You provide concise, accurate responses.' 
        },
        { 
          role: 'user', 
          content: 'Explain the concept of quantum entanglement in 3 sentences.' 
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    console.log('\n✅ Response received!');
    console.log('------------------------');
    console.log(response.choices[0].message.content);
    console.log('------------------------');
    console.log(`Model: ${response.model}`);
    console.log(`Tokens used: ${response.usage.total_tokens}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the example
runExample();
