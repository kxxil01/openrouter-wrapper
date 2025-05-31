import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * Get all conversations
 * GET /api/conversations
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM conversations ORDER BY updated_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * Get a conversation by ID
 * GET /api/conversations/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * Create a new conversation
 * POST /api/conversations
 */
router.post('/', async (req, res) => {
  try {
    const { title, model_id } = req.body;
    
    if (!title || !model_id) {
      return res.status(400).json({ error: 'Title and model_id are required' });
    }
    
    const result = await query(
      'INSERT INTO conversations (title, model_id) VALUES ($1, $2) RETURNING *',
      [title, model_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * Update a conversation
 * PUT /api/conversations/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, model_id } = req.body;
    
    if (!title && !model_id) {
      return res.status(400).json({ error: 'At least one field to update is required' });
    }
    
    let updateQuery = 'UPDATE conversations SET ';
    const queryParams = [];
    const updates = [];
    
    if (title) {
      queryParams.push(title);
      updates.push(`title = $${queryParams.length}`);
    }
    
    if (model_id) {
      queryParams.push(model_id);
      updates.push(`model_id = $${queryParams.length}`);
    }
    
    queryParams.push(id);
    updateQuery += updates.join(', ') + ` WHERE id = $${queryParams.length} RETURNING *`;
    
    const result = await query(updateQuery, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

/**
 * Delete a conversation
 * DELETE /api/conversations/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete all messages in the conversation
    await query('DELETE FROM messages WHERE conversation_id = $1', [id]);
    
    // Then delete the conversation
    const result = await query(
      'DELETE FROM conversations WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ message: 'Conversation deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
