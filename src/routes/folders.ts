import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { v7 as uuidv7 } from 'uuid';
import * as auth from '../lib/auth';
import { sql } from '../lib/db';

const folderRoutes = new Hono();

folderRoutes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const folders = await sql`
      SELECT * FROM folders 
      WHERE user_id = ${user.id}
      ORDER BY sort_order ASC, created_at ASC
    `;
    return c.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    return c.json({ error: 'Failed to fetch folders' }, 500);
  }
});

folderRoutes.post('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, color = '#6b7280' } = body;

    if (!name?.trim()) {
      return c.json({ error: 'Folder name is required' }, 400);
    }

    const id = uuidv7();
    const [folder] = await sql`
      INSERT INTO folders (id, user_id, name, color, created_at, updated_at)
      VALUES (${id}, ${user.id}, ${name.trim()}, ${color}, NOW(), NOW())
      RETURNING *
    `;

    return c.json(folder, 201);
  } catch (error) {
    console.error('Error creating folder:', error);
    return c.json({ error: 'Failed to create folder' }, 500);
  }
});

folderRoutes.put('/:id', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, color, sort_order } = body;

    const [folder] = await sql`
      UPDATE folders 
      SET 
        name = COALESCE(${name ?? null}, name),
        color = COALESCE(${color ?? null}, color),
        sort_order = COALESCE(${sort_order ?? null}, sort_order),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `;

    if (!folder) {
      return c.json({ error: 'Folder not found' }, 404);
    }

    return c.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    return c.json({ error: 'Failed to update folder' }, 500);
  }
});

folderRoutes.delete('/:id', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await auth.validateSession(sessionToken);
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const id = c.req.param('id');

    const [folder] = await sql`
      SELECT id FROM folders WHERE id = ${id} AND user_id = ${user.id}
    `;

    if (!folder) {
      return c.json({ error: 'Folder not found' }, 404);
    }

    await sql`UPDATE conversations SET folder_id = NULL WHERE folder_id = ${id}`;
    await sql`DELETE FROM folders WHERE id = ${id} AND user_id = ${user.id}`;

    return c.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return c.json({ error: 'Failed to delete folder' }, 500);
  }
});

export default folderRoutes;
