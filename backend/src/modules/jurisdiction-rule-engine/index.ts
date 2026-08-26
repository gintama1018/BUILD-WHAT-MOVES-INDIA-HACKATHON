/**
 * Jurisdiction Rule Engine
 * ─────────────────────────────────────────────────────────────
 * SAFETY-CRITICAL COMPONENT — PLAN.txt §20, §10, §45
 *
 * This module is:
 *  - Pure deterministic logic, ZERO external calls
 *  - The final authority on jurisdiction correctness (AI is advisory only)
 *  - Independently unit-tested (tests/unit/jurisdiction-rule-engine.test.ts)
 *
 * Rules enforced:
 *  1. Geographic containment — candidate's area must contain citizen's location
 *  2. Subject-domain match — candidate must handle the queried subject
 *  3. Government-level consistency — internal data integrity check
 *  4. Concurrent-list conflict detection — NEVER auto-resolve; surface both
 *  5. Section 6(3) transfer eligibility — only CENTRAL↔CENTRAL is reliable
 *     (see PLAN.txt §47 for the fully resolved legal finding)
 */

export type GovernmentLevel = 'CENTRAL' | 'STATE' | 'UNION_TERRITORY' | 'LOCAL' | 'UNKNOWN';

export interface AuthorityCandidate {
  id: string;
  name: string;
  government_level: GovernmentLevel;
  state_id: string | null;
  is_concurrent_list: boolean;
  subject_domain_ids: string[];
  geographic_area_ids: string[];  // e.g. ['geo_pune', 'geo_mh']
  geographic_area_types: string[]; // e.g. ['CITY', 'STATE']
  geographic_state_ids: string[]; // state_id for each geographic_area
  source_confidence_tier: 'HIGH' | 'MEDIUM' | 'LOW';
  last_verified_date: string;     // ISO date
}

export interface CitizenQuery {
  subject_domain: string;         // e.g. 'roads'
  location_state_id: string | null; // e.g. 'MH'
  location_city: string | null;   // e.g. 'Pune'
  government_level_hint: GovernmentLevel | null; // from AI intent extraction
}

export interface ValidationResult {
  passed: boolean;
  geographic_match: boolean;
  subject_match: boolean;
  level_consistency: boolean;
  failure_reasons: string[];
  demotion_reason: string | null;
}

export interface ConflictResult {
  has_conflict: boolean;
  conflict_type: 'CONCURRENT_LIST' | 'GEOGRAPHIC_AMBIGUITY' | null;
  explanation: string | null;
}

export interface TransferEligibility {
  eligible: boolean;
  reason: string;
  pitch_line: string; // Pre-written honest pitch line per PLAN.txt §47
}

// ── FRESHNESS THRESHOLD ──────────────────────────────────────
const STALENESS_DAYS = 180; // PLAN.txt §14

export function isFresh(last_verified_date: string): boolean {
  const verified = new Date(last_verified_date);
  const now = new Date();
  const diffDays = (now.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= STALENESS_DAYS;
}

// ── RULE 1: GEOGRAPHIC CONTAINMENT ──────────────────────────
/**
 * Returns true if the candidate's geographic coverage includes the citizen's location.
 * Logic:
 *   - If candidate covers NATIONAL → always matches
 *   - If candidate covers a STATE and citizen's state_id matches → matches
 *   - If candidate covers a CITY and citizen's city name matches (case-insensitive) → matches
 *   - If candidate covers a STATE and citizen has no location → partial match (not a hard fail)
 */
export function validateGeographic(
  candidate: AuthorityCandidate,
  query: CitizenQuery
): { match: boolean; partial: boolean; reason: string } {
  // NATIONAL coverage always matches
  if (candidate.geographic_area_types.includes('NATIONAL')) {
    return { match: true, partial: false, reason: 'Authority has national jurisdiction' };
  }

  // No location provided — cannot definitively match geographic, but don't reject outright
  if (!query.location_state_id && !query.location_city) {
    return {
      match: false,
      partial: true,
      reason: 'No location provided — cannot confirm geographic match. Consider asking for state/city.'
    };
  }

  // STATE-level match: citizen's state must be in candidate's geographic states
  if (query.location_state_id && candidate.geographic_state_ids.includes(query.location_state_id)) {
    return { match: true, partial: false, reason: `Authority covers ${query.location_state_id}` };
  }

  // CITY-level match: if candidate is city-scoped, check city name
  if (query.location_city && candidate.geographic_area_ids.some(id => id.toLowerCase().includes(query.location_city!.toLowerCase().replace(/\s/g, '_')))) {
    return { match: true, partial: false, reason: `Authority covers ${query.location_city}` };
  }

  return {
    match: false,
    partial: false,
    reason: `Authority jurisdiction does not cover the citizen's location (${query.location_state_id ?? query.location_city ?? 'unknown'})`
  };
}

// ── RULE 2: SUBJECT-DOMAIN MATCH ────────────────────────────
export function validateSubjectMatch(
  candidate: AuthorityCandidate,
  query: CitizenQuery
): { match: boolean; partial: boolean; reason: string } {
  if (!query.subject_domain) {
    return { match: false, partial: true, reason: 'No subject domain extracted from query' };
  }

  const exact = candidate.subject_domain_ids.includes(query.subject_domain);
  if (exact) {
    return { match: true, partial: false, reason: `Authority handles '${query.subject_domain}'` };
  }

  // Partial/adjacent match check — broad domains that overlap
  const adjacencyMap: Record<string, string[]> = {
    roads:       ['municipal', 'property'],
    municipal:   ['roads', 'water', 'health'],
    water:       ['municipal'],
    electricity: [],
    passport:    [],
    education:   [],
    police:      [],
    pension:     [],
    health:      ['municipal'],
    property:    ['municipal', 'roads'],
  };
  const adjacent = adjacencyMap[query.subject_domain] ?? [];
  const partialMatch = candidate.subject_domain_ids.some(d => adjacent.includes(d));

  if (partialMatch) {
    return { match: false, partial: true, reason: `Adjacent subject match only — authority handles related domains` };
  }

  return { match: false, partial: false, reason: `Authority does not handle '${query.subject_domain}'` };
}

// ── RULE 3: GOVERNMENT-LEVEL CONSISTENCY ────────────────────
/**
 * Data integrity check: if a candidate claims to be STATE, it must have a state_id.
 * If it claims CENTRAL, it must have no state_id.
 * Catches bad seed data before it reaches the user.
 */
export function validateGovLevelConsistency(candidate: AuthorityCandidate): {
  consistent: boolean;
  reason: string;
} {
  if (candidate.government_level === 'CENTRAL' && candidate.state_id !== null) {
    return { consistent: false, reason: `Data integrity error: CENTRAL authority '${candidate.name}' has a state_id set — check seed data` };
  }
  if ((candidate.government_level === 'STATE' || candidate.government_level === 'LOCAL') && candidate.state_id === null) {
    return { consistent: false, reason: `Data integrity error: ${candidate.government_level} authority '${candidate.name}' has no state_id — check seed data` };
  }
  return { consistent: true, reason: 'Government-level data is internally consistent' };
}

// ── RULE 4: CONCURRENT LIST CONFLICT DETECTION ──────────────
/**
 * PLAN.txt §20: If two+ candidates pass validation and one is CENTRAL + one is STATE
 * for the SAME subject domain (Concurrent List case) → NEVER auto-resolve.
 * Surface both with the "it depends" explanation.
 *
 * This is the CORRECT behavior, not a bug.
 */
export function detectConcurrentConflict(
  passedCandidates: AuthorityCandidate[],
  query: CitizenQuery
): ConflictResult {
  const concurrentCandidates = passedCandidates.filter(c => c.is_concurrent_list);
  if (concurrentCandidates.length < 2) {
    return { has_conflict: false, conflict_type: null, explanation: null };
  }

  const hascentral = concurrentCandidates.some(c => c.government_level === 'CENTRAL');
  const hasState = concurrentCandidates.some(c => c.government_level === 'STATE');

  if (hascentral && hasState) {
    return {
      has_conflict: true,
      conflict_type: 'CONCURRENT_LIST',
      explanation: `This topic falls under India's Concurrent List — both Central and State governments legitimately hold relevant records. ` +
        `For '${query.subject_domain}': the Central authority handles national policies and centrally-sponsored schemes; ` +
        `the State authority handles day-to-day administration and state-level schemes. ` +
        `Please specify what information you need to determine the correct authority.`
    };
  }

  return { has_conflict: false, conflict_type: null, explanation: null };
}

// ── RULE 5: SECTION 6(3) TRANSFER ELIGIBILITY ───────────────
/**
 * PLAN.txt §47 (fully resolved finding, 2026-08-26):
 *   - RTI Act §6(3) text itself is level-agnostic (does not say Central-only)
 *   - BUT: DoPT 2008 OM treats Central↔State transfer as optional, not required
 *   - CIC case law is inconsistent — decided case-by-case, not a settled rule
 *   → Transfer is NOT reliably guaranteed across Central↔State lines
 *   → Product must prevent misfiling, not rely on post-filing correction
 *
 * This function is used in the "Why does this matter?" explanation.
 */
export function validateSection6_3Transfer(
  fromLevel: GovernmentLevel,
  toLevel: GovernmentLevel
): TransferEligibility {
  const sameLevelCentral = fromLevel === 'CENTRAL' && toLevel === 'CENTRAL';

  if (sameLevelCentral) {
    return {
      eligible: true,
      reason: 'Both authorities are Central Government — §6(3) transfer within the same level is well-established.',
      pitch_line: ''
    };
  }

  return {
    eligible: false,
    reason: `Cross-level transfer (${fromLevel} → ${toLevel}) is not reliably guaranteed.`,
    pitch_line: `The RTI Act's own transfer mechanism doesn't name Central vs. State at all — ` +
      `but government's own administrative practice (a DoPT circular) treats cross-jurisdiction ` +
      `hand-offs as optional, not guaranteed, and even the Information Commission's own case law ` +
      `on this point is inconsistent. That uncertainty is exactly why getting the jurisdiction ` +
      `right BEFORE filing matters more than hoping the system corrects it afterward.`
  };
}

// ── FULL CANDIDATE VALIDATION ────────────────────────────────
/**
 * Runs all validation rules against a single candidate.
 * Used by the Authority Discovery pipeline — candidates that fail are demoted.
 * THIS IS THE FLOW D SAFETY MECHANIC (PLAN.txt §19D, §40).
 */
export function validateCandidate(
  candidate: AuthorityCandidate,
  query: CitizenQuery
): ValidationResult {
  const failures: string[] = [];

  const geo = validateGeographic(candidate, query);
  const subj = validateSubjectMatch(candidate, query);
  const lvl = validateGovLevelConsistency(candidate);
  const fresh = isFresh(candidate.last_verified_date);

  if (!lvl.consistent) {
    failures.push(lvl.reason);
  }

  if (!geo.match && !geo.partial) {
    failures.push(geo.reason);
  }

  if (!subj.match && !subj.partial) {
    failures.push(subj.reason);
  }

  if (!fresh) {
    failures.push(`Source data not verified in over ${STALENESS_DAYS} days — please double-check on the official portal before filing`);
  }

  const hardFail = !lvl.consistent || (!geo.match && !geo.partial) || (!subj.match && !subj.partial);

  return {
    passed: failures.length === 0,
    geographic_match: geo.match,
    subject_match: subj.match,
    level_consistency: lvl.consistent,
    failure_reasons: failures,
    demotion_reason: hardFail ? failures[0] : null
  };
}
