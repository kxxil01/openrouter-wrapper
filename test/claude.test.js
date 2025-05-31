import { test } from 'node:test';
import assert from 'node:assert';
import { ClaudeOpus } from '../src/claude.js';

// These tests are designed to be run with a valid API key
// You can run them with: npm test

test('ClaudeOpus constructor validation', (t) => {
  // Should throw when no API key is provided
  assert.throws(() => {
    new ClaudeOpus({ apiKey: null });
  }, /OpenRouter API key is required/);
  
  // Should not throw with valid API key
  assert.doesNotThrow(() => {
    new ClaudeOpus({ apiKey: 'test_key' });
  });
});

test('Message preparation', (t) => {
  const client = new ClaudeOpus({ 
    apiKey: 'test_key',
    defaultSystemPrompt: 'You are a helpful assistant.'
  });
  
  // Should add system message when none exists
  const messagesWithoutSystem = [
    { role: 'user', content: 'Hello' }
  ];
  
  const prepared1 = client.prepareMessages(messagesWithoutSystem);
  assert.equal(prepared1.length, 2);
  assert.equal(prepared1[0].role, 'system');
  assert.equal(prepared1[0].content, 'You are a helpful assistant.');
  
  // Should not add system message when one already exists
  const messagesWithSystem = [
    { role: 'system', content: 'Custom system message' },
    { role: 'user', content: 'Hello' }
  ];
  
  const prepared2 = client.prepareMessages(messagesWithSystem);
  assert.equal(prepared2.length, 2);
  assert.equal(prepared2[0].role, 'system');
  assert.equal(prepared2[0].content, 'Custom system message');
});

// This test requires a valid API key to run
// Uncomment and add your API key to run it
/*
test('Basic completion', async (t) => {
  const client = new ClaudeOpus({ 
    apiKey: process.env.OPENROUTER_API_KEY 
  });
  
  const response = await client.createCompletion({
    messages: [
      { role: 'user', content: 'Say hello world' }
    ],
    temperature: 0,
    max_tokens: 100
  });
  
  assert.ok(response.id);
  assert.ok(response.choices[0].message.content.includes('hello'));
});
*/

// This test requires a valid API key to run
// Uncomment and add your API key to run it
/*
test('Streaming completion', async (t) => {
  const client = new ClaudeOpus({ 
    apiKey: process.env.OPENROUTER_API_KEY 
  });
  
  const chunks = [];
  
  const response = await client.createCompletion({
    messages: [
      { role: 'user', content: 'Count from 1 to 5' }
    ],
    temperature: 0,
    max_tokens: 100,
    stream: true,
    onProgress: (chunk) => {
      chunks.push(chunk);
    }
  });
  
  assert.ok(response.id);
  assert.ok(chunks.length > 0);
  assert.ok(response.choices[0].message.content.includes('1'));
  assert.ok(response.choices[0].message.content.includes('5'));
});
*/
