import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * Get all messages for a conversation
 * GET /api/messages?conversation_id=<uuid>
 */
router.get('/', async (req, res) => {
  try {
    const { conversation_id } = req.query;
    
    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id query parameter is required' });
    }
    
    const result = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversation_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * Create a new message
 * POST /api/messages
 */
router.post('/', async (req, res) => {
  try {
    const { conversation_id, role, content } = req.body;
    
    if (!conversation_id || !role || !content) {
      return res.status(400).json({ error: 'conversation_id, role, and content are required' });
    }
    
    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({ error: 'role must be either "user" or "assistant"' });
    }
    
    // Check if the conversation exists
    const conversationCheck = await query(
      'SELECT id FROM conversations WHERE id = $1',
      [conversation_id]
    );
    
    if (conversationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const result = await query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING *',
      [conversation_id, role, content]
    );
    
    // Update the conversation's updated_at timestamp
    await query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversation_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

export default router;
