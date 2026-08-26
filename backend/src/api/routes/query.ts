import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/connection';
import { discoverAuthorities } from '../../modules/authority-discovery/index';
import { computeConfidence } from '../../modules/confidence-engine/index';
import { extractIntent, generateExplanation, AIUnavailableError } from '../../ai-gateway/index';
import { CitizenQuery } from '../../modules/jurisdiction-rule-engine/index';

export const router = Router();

// POST /api/query — Submit a new citizen query
router.post('/', async (req: Request, res: Response) => {
  const { raw_text, location_text, session_id } = req.body;

  if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length < 5) {
    return res.status(400).json({ error: 'Please describe your RTI query (at least 5 characters).' });
  }

  if (raw_text.length > 3000) {
    return res.status(400).json({ error: 'Query too long. Please keep it under 3000 characters.' });
  }

  const db = getDb();
  const queryId = uuidv4();

  // Create or reuse session
  const sid = session_id || uuidv4();
  db.prepare(`INSERT OR IGNORE INTO sessions (id, started_at) VALUES (?, datetime('now'))`).run(sid);

  db.prepare(
    `INSERT INTO queries (id, session_id, raw_text, location_text, status) VALUES (?, ?, ?, ?, 'pending')`
  ).run(queryId, sid, raw_text.trim(), location_text || null);

  res.status(201).json({ query_id: queryId, session_id: sid });
});

// POST /api/query/:id/analyze — Run the full pipeline
router.post('/:id/analyze', async (req: Request, res: Response) => {
  const { id: queryId } = req.params;
  const db = getDb();

  const query = db.prepare(`SELECT * FROM queries WHERE id = ?`).get(queryId) as any;
  if (!query) return res.status(404).json({ error: 'Query not found.' });

  // Step 1: Intent extraction (AI → fallback to keyword if unavailable)
  let intentData: CitizenQuery;
  let aiAvailable = true;

  try {
    const aiIntent = await extractIntent(queryId, query.raw_text);
    intentData = {
      subject_domain: aiIntent.subject_domain || '',
      location_state_id: aiIntent.location_state_id,
      location_city: aiIntent.location_city,
      government_level_hint: aiIntent.government_level_hint as any,
    };

    // Save intent record
    db.prepare(
      `INSERT OR REPLACE INTO intent_records (id, query_id, subject_domain_guess, location_text, government_level_hint, ai_confidence)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), queryId, intentData.subject_domain, intentData.location_state_id || intentData.location_city, intentData.government_level_hint, aiIntent.confidence);

  } catch (err) {
    if (err instanceof AIUnavailableError) {
      aiAvailable = false;
      // Keyword fallback: simple pattern matching on raw_text
      intentData = keywordFallbackIntent(query.raw_text, query.location_text);
    } else {
      throw err;
    }
  }

  // Step 2: Authority discovery + Rule Engine validation
  const discovery = await discoverAuthorities(intentData);

  // Step 3: Confidence scoring for each candidate
  const scoredCandidates = discovery.candidates.map(c => ({
    ...c,
    confidence: computeConfidence(
      c.validation,
      c.source_document_title.toLowerCase().includes('official') ? 'HIGH' : 'MEDIUM',
      c.last_verified_date,
      discovery.concurrent_conflict && c.is_concurrent_list,
    )
  }));

  // Step 4: Save candidates to DB
  db.prepare(`DELETE FROM authority_candidates WHERE query_id = ?`).run(queryId);
  const insertCandidate = db.prepare(
    `INSERT INTO authority_candidates (id, query_id, public_authority_id, rank, confidence_score, confidence_level, match_reasons, rule_validation_passed, is_concurrent_conflict)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  scoredCandidates.forEach((c, i) => {
    insertCandidate.run(
      uuidv4(), queryId, c.authority_id, i + 1, c.confidence.score,
      c.confidence.level, JSON.stringify(c.match_reasons),
      c.validation.passed ? 1 : 0,
      discovery.concurrent_conflict && c.is_concurrent_list ? 1 : 0
    );
  });

  db.prepare(`UPDATE queries SET status = 'analyzed' WHERE id = ?`).run(queryId);

  res.json({
    query_id: queryId,
    intent: intentData,
    ai_available: aiAvailable,
    keyword_fallback_used: !aiAvailable || discovery.keyword_fallback_used,
    concurrent_conflict: discovery.concurrent_conflict,
    concurrent_explanation: discovery.concurrent_explanation,
    candidates: scoredCandidates.slice(0, 5), // Return top 5 max
    total_found: scoredCandidates.length,
  });
});

// GET /api/query/:id/explain — Get grounded explanation for top candidate
router.get('/:id/explain', async (req: Request, res: Response) => {
  const { id: queryId } = req.params;
  const candidateIndex = parseInt(req.query.candidate as string || '0');
  const db = getDb();

  const query = db.prepare(`SELECT * FROM queries WHERE id = ?`).get(queryId) as any;
  if (!query) return res.status(404).json({ error: 'Query not found.' });

  const candidate = db.prepare(`
    SELECT ac.*, pa.name, pa.government_level, pa.notes, pa.pio_designation, pa.pio_contact_note,
           pa.last_verified_date, pa.filing_method, pa.is_concurrent_list,
           p.url as portal_url, p.fee_amount,
           src.title as source_title, src.url as source_url
    FROM authority_candidates ac
    JOIN public_authorities pa ON pa.id = ac.public_authority_id
    JOIN rti_portals p ON p.id = pa.rti_portal_id
    JOIN source_documents src ON src.id = pa.source_document_id
    WHERE ac.query_id = ?
    ORDER BY ac.rank
    LIMIT 1 OFFSET ?
  `).get(queryId, candidateIndex) as any;

  if (!candidate) return res.status(404).json({ error: 'No candidate found for this query.' });

  let explanation: string;
  try {
    explanation = await generateExplanation(
      queryId,
      {
        name: candidate.name,
        government_level: candidate.government_level,
        portal_url: candidate.portal_url,
        fee_amount: candidate.fee_amount,
        filing_method: candidate.filing_method,
        pio_designation: candidate.pio_designation,
        last_verified_date: candidate.last_verified_date,
        source_url: candidate.source_url,
      },
      query.raw_text,
      JSON.parse(candidate.match_reasons || '[]')
    );
  } catch {
    explanation = `${candidate.name} is the correct authority for your query because it handles ${candidate.government_level === 'CENTRAL' ? 'Central Government' : candidate.government_level} matters in the relevant jurisdiction. File at ${candidate.portal_url}. Fee: ₹${candidate.fee_amount}. Source: ${candidate.source_url} (verified ${candidate.last_verified_date}).`;
  }

  res.json({ query_id: queryId, candidate_id: candidate.id, explanation });
});

// POST /api/query/:id/confirm — User confirms an authority choice
router.post('/:id/confirm', async (req: Request, res: Response) => {
  const { id: queryId } = req.params;
  const { candidate_id } = req.body;
  const db = getDb();

  const candidate = db.prepare(`SELECT * FROM authority_candidates WHERE id = ? AND query_id = ?`).get(candidate_id, queryId);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found for this query.' });

  db.prepare(
    `INSERT INTO user_confirmations (id, query_id, authority_candidate_id) VALUES (?, ?, ?)`
  ).run(uuidv4(), queryId, candidate_id);

  db.prepare(`UPDATE queries SET status = 'confirmed' WHERE id = ?`).run(queryId);

  res.json({ confirmed: true, query_id: queryId, candidate_id });
});

// ── Keyword fallback intent ──────────────────────────────────
function keywordFallbackIntent(rawText: string, locationText: string | null): CitizenQuery {
  const text = rawText.toLowerCase();
  const domainKeywords: Record<string, string[]> = {
    roads:       ['road', 'street', 'pothole', 'repair', 'construction', 'highway', 'footpath', 'pavement'],
    water:       ['water', 'supply', 'pipe', 'drainage', 'sewage', 'sanitation'],
    electricity: ['electricity', 'power', 'bill', 'meter', 'msedcl', 'voltage', 'outage', 'connection'],
    passport:    ['passport', 'visa', 'mea', 'ministry of external', 'emigration', 'renewal'],
    education:   ['school', 'education', 'college', 'university', 'mid-day meal', 'scholarship', 'teacher'],
    police:      ['police', 'fir', 'complaint', 'crime', 'law and order', 'station', 'constable'],
    pension:     ['pension', 'retirement', 'gratuity', 'provident fund', 'ppf', 'nps'],
    property:    ['property', 'tax', 'building', 'construction', 'mutation', 'plot'],
    municipal:   ['corporation', 'municipality', 'pmc', 'bmc', 'panchayat', 'ward'],
    health:      ['hospital', 'health', 'clinic', 'doctor', 'medicine', 'vaccination'],
  };

  let matched_domain: string | null = null;
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(kw => text.includes(kw))) { matched_domain = domain; break; }
  }

  const stateKeywords: Record<string, string> = {
    'maharashtra': 'MH', 'pune': 'MH', 'mumbai': 'MH', 'nagpur': 'MH',
    'delhi': 'DL', 'karnataka': 'KA', 'bangalore': 'KA', 'bengaluru': 'KA',
    'tamil nadu': 'TN', 'chennai': 'TN', 'gujarat': 'GJ', 'ahmedabad': 'GJ',
  };
  const cityKeywords: Record<string, string> = {
    'pune': 'Pune', 'mumbai': 'Mumbai', 'delhi': 'Delhi',
    'bangalore': 'Bangalore', 'bangalore': 'Bengaluru', 'chennai': 'Chennai',
  };

  const combinedText = (rawText + ' ' + (locationText || '')).toLowerCase();
  let location_state_id: string | null = null;
  let location_city: string | null = null;
  for (const [kw, state] of Object.entries(stateKeywords)) {
    if (combinedText.includes(kw)) { location_state_id = state; break; }
  }
  for (const [kw, city] of Object.entries(cityKeywords)) {
    if (combinedText.includes(kw)) { location_city = city; break; }
  }

  return { subject_domain: matched_domain || '', location_state_id, location_city, government_level_hint: null };
}
