import { Router, Request, Response } from 'express';
import { getDb } from '../../db/connection';

export const router = Router();

// GET /api/portals
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const portals = db.prepare(`
    SELECT p.*, s.name as state_name FROM rti_portals p
    LEFT JOIN states s ON s.id = p.state_id
    ORDER BY p.government_level, p.name
  `).all();
  res.json({ portals });
});
