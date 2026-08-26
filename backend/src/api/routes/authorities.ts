import { Router, Request, Response } from 'express';
import { getDb } from '../../db/connection';

export const router = Router();

// GET /api/authorities/search?q=...&domain=...&state=...
router.get('/search', (req: Request, res: Response) => {
  const { q, domain, state } = req.query;
  const db = getDb();

  let sql = `
    SELECT pa.id, pa.name, pa.short_name, pa.government_level, pa.state_id,
           pa.filing_method, pa.last_verified_date, pa.is_concurrent_list,
           p.url as portal_url, p.fee_amount,
           src.title as source_title, src.url as source_url
    FROM public_authorities pa
    JOIN rti_portals p ON p.id = pa.rti_portal_id
    JOIN source_documents src ON src.id = pa.source_document_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (q) {
    sql += ` AND (LOWER(pa.name) LIKE ? OR LOWER(pa.short_name) LIKE ?)`;
    params.push(`%${(q as string).toLowerCase()}%`, `%${(q as string).toLowerCase()}%`);
  }
  if (domain) {
    sql += ` AND pa.id IN (SELECT authority_id FROM authority_subject_domains WHERE domain_id = ?)`;
    params.push(domain);
  }
  if (state) {
    sql += ` AND (pa.state_id = ? OR pa.government_level = 'CENTRAL')`;
    params.push(state);
  }

  sql += ` ORDER BY pa.government_level, pa.name LIMIT 20`;

  const results = db.prepare(sql).all(...params);
  res.json({ authorities: results, count: results.length });
});

// GET /api/authorities/:id
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const authority = db.prepare(`
    SELECT pa.*, p.url as portal_url, p.fee_amount, p.accepts_online,
           src.title as source_title, src.url as source_url, src.retrieved_date, src.confidence_tier
    FROM public_authorities pa
    JOIN rti_portals p ON p.id = pa.rti_portal_id
    JOIN source_documents src ON src.id = pa.source_document_id
    WHERE pa.id = ?
  `).get(id) as any;

  if (!authority) return res.status(404).json({ error: 'Authority not found.' });

  const domains = db.prepare(`
    SELECT sd.id, sd.label FROM authority_subject_domains asd
    JOIN subject_domains sd ON sd.id = asd.domain_id
    WHERE asd.authority_id = ?
  `).all(id);

  const geoAreas = db.prepare(`
    SELECT ga.id, ga.type, ga.name FROM authority_geographic_areas aga
    JOIN geographic_areas ga ON ga.id = aga.geographic_area_id
    WHERE aga.authority_id = ?
  `).all(id);

  res.json({ ...authority, subject_domains: domains, geographic_areas: geoAreas });
});
