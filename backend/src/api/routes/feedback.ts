import { Router, Request, Response } from 'express';
import { getDb } from '../../db/connection';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

// POST /api/feedback
router.post('/', (req: Request, res: Response) => {
  const { query_id, comment } = req.body;
  const db = getDb();

  if (!comment || typeof comment !== 'string') {
    return res.status(400).json({ error: 'Comment is required.' });
  }
  if (comment.length > 1000) {
    return res.status(400).json({ error: 'Comment too long (max 1000 chars).' });
  }

  db.prepare(`INSERT INTO feedback (id, query_id, comment) VALUES (?, ?, ?)`).run(
    uuidv4(), query_id || null, comment.trim()
  );

  res.json({ submitted: true });
});
