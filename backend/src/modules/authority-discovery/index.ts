/**
 * Authority Discovery Module
 * Queries the Knowledge Base and passes candidates through the Rule Engine.
 * Returns validated, ranked candidates — never raw AI output.
 */
import { getDb } from '../../db/connection';
import {
  AuthorityCandidate,
  CitizenQuery,
  validateCandidate,
  detectConcurrentConflict,
  ValidationResult,
} from '../jurisdiction-rule-engine/index';

export interface DiscoveryResult {
  candidates: ValidatedCandidate[];
  concurrent_conflict: boolean;
  concurrent_explanation: string | null;
  keyword_fallback_used: boolean;
}

export interface ValidatedCandidate {
  authority_id: string;
  name: string;
  short_name: string | null;
  government_level: string;
  state_id: string | null;
  is_concurrent_list: boolean;
  rti_portal_id: string;
  portal_url: string;
  fee_amount: number;
  filing_method: string;
  last_verified_date: string;
  source_document_title: string;
  source_document_url: string;
  pio_designation: string | null;
  pio_contact_note: string | null;
  subject_domain_ids: string[];
  geographic_area_ids: string[];
  notes: string | null;
  validation: ValidationResult;
  match_reasons: string[];
}

function buildCandidate(row: any, db: any): AuthorityCandidate {
  const domains = db.prepare(`SELECT domain_id FROM authority_subject_domains WHERE authority_id = ?`).all(row.id).map((r: any) => r.domain_id);
  const geoRows = db.prepare(`
    SELECT ga.id, ga.type, COALESCE(ga.state_id, '') as state_id
    FROM authority_geographic_areas aga
    JOIN geographic_areas ga ON ga.id = aga.geographic_area_id
    WHERE aga.authority_id = ?
  `).all(row.id);

  return {
    id: row.id,
    name: row.name,
    government_level: row.government_level,
    state_id: row.state_id,
    is_concurrent_list: !!row.is_concurrent_list,
    subject_domain_ids: domains,
    geographic_area_ids: geoRows.map((g: any) => g.id),
    geographic_area_types: geoRows.map((g: any) => g.type),
    geographic_state_ids: geoRows.filter((g: any) => g.state_id).map((g: any) => g.state_id),
    source_confidence_tier: (row.confidence_tier as 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM',
    last_verified_date: row.last_verified_date,
  };
}

function computeMatchReasons(validation: ValidationResult, query: CitizenQuery): string[] {
  const reasons: string[] = [];
  if (validation.geographic_match) reasons.push(`Jurisdiction matches your location${query.location_city ? ` (${query.location_city})` : query.location_state_id ? ` (${query.location_state_id})` : ''}`);
  if (validation.subject_match) reasons.push(`Handles '${query.subject_domain}' matters`);
  if (validation.level_consistency) reasons.push('Verified government authority');
  return reasons;
}

export async function discoverAuthorities(query: CitizenQuery): Promise<DiscoveryResult> {
  const db = getDb();

  // Primary search: subject domain match
  const rows = db.prepare(`
    SELECT pa.*, sd.confidence_tier, p.url as portal_url, p.fee_amount,
           src.title as source_title, src.url as source_url
    FROM public_authorities pa
    JOIN authority_subject_domains asd ON asd.authority_id = pa.id
    JOIN rti_portals p ON p.id = pa.rti_portal_id
    JOIN source_documents src ON src.id = pa.source_document_id
    LEFT JOIN (SELECT confidence_tier, 'HIGH' as confidence_tier FROM source_documents LIMIT 1) sd ON 1=1
    WHERE asd.domain_id = ?
  `).all(query.subject_domain || '');

  // Fallback: keyword search on name if no domain results
  let fallbackUsed = false;
  let candidateRows = rows;
  if (candidateRows.length === 0 && query.subject_domain) {
    fallbackUsed = true;
    candidateRows = db.prepare(`
      SELECT pa.*, p.url as portal_url, p.fee_amount,
             src.title as source_title, src.url as source_url
      FROM public_authorities pa
      JOIN rti_portals p ON p.id = pa.rti_portal_id
      JOIN source_documents src ON src.id = pa.source_document_id
      WHERE LOWER(pa.name) LIKE ? OR LOWER(pa.notes) LIKE ?
    `).all(`%${query.subject_domain}%`, `%${query.subject_domain}%`);
  }

  // Build + validate each candidate through the Rule Engine
  const validated: ValidatedCandidate[] = [];
  for (const row of candidateRows) {
    const authorityCandidate = buildCandidate(row, db);
    const validation = validateCandidate(authorityCandidate, query);
    const match_reasons = computeMatchReasons(validation, query);

    // Get source doc info
    const src = db.prepare(`SELECT title, url FROM source_documents WHERE id = ?`).get(row.source_document_id) as any;
    const portal = db.prepare(`SELECT url, fee_amount FROM rti_portals WHERE id = ?`).get(row.rti_portal_id) as any;

    validated.push({
      authority_id: row.id,
      name: row.name,
      short_name: row.short_name,
      government_level: row.government_level,
      state_id: row.state_id,
      is_concurrent_list: !!row.is_concurrent_list,
      rti_portal_id: row.rti_portal_id,
      portal_url: portal?.url ?? '',
      fee_amount: portal?.fee_amount ?? 10,
      filing_method: row.filing_method,
      last_verified_date: row.last_verified_date,
      source_document_title: src?.title ?? '',
      source_document_url: src?.url ?? '',
      pio_designation: row.pio_designation ?? null,
      pio_contact_note: row.pio_contact_note ?? null,
      subject_domain_ids: authorityCandidate.subject_domain_ids,
      geographic_area_ids: authorityCandidate.geographic_area_ids,
      notes: row.notes ?? null,
      validation,
      match_reasons,
    });
  }

  // Sort: passed first, then partial, then failed; within each group by specificity
  validated.sort((a, b) => {
    const aScore = a.validation.passed ? 2 : (a.validation.failure_reasons.length === 0 ? 1 : 0);
    const bScore = b.validation.passed ? 2 : (b.validation.failure_reasons.length === 0 ? 1 : 0);
    return bScore - aScore;
  });

  // Detect concurrent conflict among PASSED candidates
  const passedCandidates = validated.filter(v => v.validation.passed || v.validation.geographic_match);
  const concurrentCheck = detectConcurrentConflict(
    passedCandidates.map(v => ({ ...v, id: v.authority_id }) as any),
    query
  );

  return {
    candidates: validated,
    concurrent_conflict: concurrentCheck.has_conflict,
    concurrent_explanation: concurrentCheck.explanation,
    keyword_fallback_used: fallbackUsed,
  };
}
