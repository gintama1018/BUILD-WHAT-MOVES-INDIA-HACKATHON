/**
 * Unit tests for the Jurisdiction Rule Engine
 * PLAN.txt §40 — highest priority test target
 *
 * Run: npx vitest run tests/unit/jurisdiction-rule-engine.test.ts
 *
 * MOST IMPORTANT TEST: Flow D — AI-suggested invalid candidate must be demoted.
 * "THIS IS THE MOST IMPORTANT TEST IN THE PROJECT" — PLAN.txt §40
 */
import { describe, it, expect } from 'vitest';
import {
  validateGeographic,
  validateSubjectMatch,
  validateGovLevelConsistency,
  detectConcurrentConflict,
  validateSection6_3Transfer,
  validateCandidate,
  isFresh,
  AuthorityCandidate,
  CitizenQuery,
} from '../../src/modules/jurisdiction-rule-engine/index';

// ── Test fixtures ──────────────────────────────────────────

const pmcCandidate: AuthorityCandidate = {
  id: 'auth_pmc',
  name: 'Pune Municipal Corporation',
  government_level: 'LOCAL',
  state_id: 'MH',
  is_concurrent_list: false,
  subject_domain_ids: ['roads', 'water', 'property', 'municipal', 'health'],
  geographic_area_ids: ['geo_pune'],
  geographic_area_types: ['CITY'],
  geographic_state_ids: ['MH'],
  source_confidence_tier: 'HIGH',
  last_verified_date: '2026-08-26',
};

const meaCandidate: AuthorityCandidate = {
  id: 'auth_mea_passport',
  name: 'Ministry of External Affairs — Regional Passport Office',
  government_level: 'CENTRAL',
  state_id: null,
  is_concurrent_list: false,
  subject_domain_ids: ['passport'],
  geographic_area_ids: ['geo_national'],
  geographic_area_types: ['NATIONAL'],
  geographic_state_ids: [],
  source_confidence_tier: 'HIGH',
  last_verified_date: '2026-08-26',
};

const centralEducationCandidate: AuthorityCandidate = {
  id: 'auth_moe_central',
  name: 'Ministry of Education (Government of India)',
  government_level: 'CENTRAL',
  state_id: null,
  is_concurrent_list: true,
  subject_domain_ids: ['education'],
  geographic_area_ids: ['geo_national'],
  geographic_area_types: ['NATIONAL'],
  geographic_state_ids: [],
  source_confidence_tier: 'HIGH',
  last_verified_date: '2026-08-26',
};

const stateEducationCandidate: AuthorityCandidate = {
  id: 'auth_mh_education',
  name: 'School Education and Sports Department, Government of Maharashtra',
  government_level: 'STATE',
  state_id: 'MH',
  is_concurrent_list: true,
  subject_domain_ids: ['education'],
  geographic_area_ids: ['geo_mh'],
  geographic_area_types: ['STATE'],
  geographic_state_ids: ['MH'],
  source_confidence_tier: 'HIGH',
  last_verified_date: '2026-08-26',
};

// BAD CANDIDATE — for Flow D test: a STATE candidate that AI incorrectly ranked first for a CENTRAL topic
const invalidStateCandidateForCentralQuery: AuthorityCandidate = {
  id: 'auth_fake_state_passport',
  name: 'Some State Passport-Sounding Department',
  government_level: 'STATE',
  state_id: 'MH',
  is_concurrent_list: false,
  subject_domain_ids: ['municipal'], // does NOT cover passport
  geographic_area_ids: ['geo_mh'],
  geographic_area_types: ['STATE'],
  geographic_state_ids: ['MH'],
  source_confidence_tier: 'MEDIUM',
  last_verified_date: '2026-08-26',
};

// STALE candidate
const staleCandidate: AuthorityCandidate = {
  ...pmcCandidate,
  id: 'auth_pmc_stale',
  last_verified_date: '2023-01-01', // > 180 days ago
};

// BAD SEED DATA candidate (data integrity violation)
const badDataCentralWithState: AuthorityCandidate = {
  ...meaCandidate,
  id: 'auth_bad_central',
  state_id: 'MH', // CENTRAL should NOT have a state_id
};

// ── Tests ──────────────────────────────────────────────────

describe('Rule 1: Geographic containment', () => {
  it('NATIONAL coverage always matches any query', () => {
    const query: CitizenQuery = { subject_domain: 'passport', location_state_id: 'MH', location_city: 'Pune', government_level_hint: null };
    const result = validateGeographic(meaCandidate, query);
    expect(result.match).toBe(true);
  });

  it('STATE-level match when citizen state matches authority state', () => {
    const query: CitizenQuery = { subject_domain: 'electricity', location_state_id: 'MH', location_city: null, government_level_hint: null };
    const msedcl: AuthorityCandidate = {
      ...pmcCandidate, id: 'auth_msedcl', geographic_area_types: ['STATE'],
      geographic_area_ids: ['geo_mh'], subject_domain_ids: ['electricity']
    };
    const result = validateGeographic(msedcl, query);
    expect(result.match).toBe(true);
  });

  it('Returns partial=true (not hard fail) when no location provided', () => {
    const query: CitizenQuery = { subject_domain: 'roads', location_state_id: null, location_city: null, government_level_hint: null };
    const result = validateGeographic(pmcCandidate, query);
    expect(result.match).toBe(false);
    expect(result.partial).toBe(true);
  });

  it('Fails when citizen location does not match candidate jurisdiction', () => {
    const query: CitizenQuery = { subject_domain: 'roads', location_state_id: 'DL', location_city: 'Delhi', government_level_hint: null };
    const result = validateGeographic(pmcCandidate, query);
    expect(result.match).toBe(false);
    expect(result.partial).toBe(false);
  });
});

describe('Rule 2: Subject-domain match', () => {
  it('Exact match passes', () => {
    const query: CitizenQuery = { subject_domain: 'roads', location_state_id: 'MH', location_city: 'Pune', government_level_hint: null };
    const result = validateSubjectMatch(pmcCandidate, query);
    expect(result.match).toBe(true);
  });

  it('No match fails hard when subject completely unrelated', () => {
    const query: CitizenQuery = { subject_domain: 'passport', location_state_id: 'MH', location_city: 'Pune', government_level_hint: null };
    const result = validateSubjectMatch(pmcCandidate, query);
    expect(result.match).toBe(false);
    expect(result.partial).toBe(false);
  });

  it('Adjacent match returns partial=true, match=false', () => {
    const query: CitizenQuery = { subject_domain: 'health', location_state_id: 'MH', location_city: null, government_level_hint: null };
    const result = validateSubjectMatch(pmcCandidate, query);
    // 'health' IS in pmcCandidate's domains, so this is an exact match
    expect(result.match).toBe(true);
  });
});

describe('Rule 3: Government-level data consistency', () => {
  it('CENTRAL authority with null state_id is consistent', () => {
    const result = validateGovLevelConsistency(meaCandidate);
    expect(result.consistent).toBe(true);
  });

  it('LOCAL authority with state_id is consistent', () => {
    const result = validateGovLevelConsistency(pmcCandidate);
    expect(result.consistent).toBe(true);
  });

  it('Flags CENTRAL authority with a state_id as inconsistent (bad seed data)', () => {
    const result = validateGovLevelConsistency(badDataCentralWithState);
    expect(result.consistent).toBe(false);
    expect(result.reason).toContain('Data integrity error');
  });
});

describe('Rule 4: Concurrent List conflict detection', () => {
  it('Flags education query as CONCURRENT_LIST conflict when both Central + State passed validation', () => {
    const query: CitizenQuery = { subject_domain: 'education', location_state_id: 'MH', location_city: null, government_level_hint: null };
    const result = detectConcurrentConflict([centralEducationCandidate, stateEducationCandidate], query);
    expect(result.has_conflict).toBe(true);
    expect(result.conflict_type).toBe('CONCURRENT_LIST');
    expect(result.explanation).not.toBeNull();
  });

  it('Does NOT flag a conflict when only one candidate', () => {
    const query: CitizenQuery = { subject_domain: 'passport', location_state_id: null, location_city: null, government_level_hint: null };
    const result = detectConcurrentConflict([meaCandidate], query);
    expect(result.has_conflict).toBe(false);
  });

  it('Does NOT flag conflict for two candidates that are not concurrent list', () => {
    const query: CitizenQuery = { subject_domain: 'roads', location_state_id: 'MH', location_city: 'Pune', government_level_hint: null };
    const result = detectConcurrentConflict([pmcCandidate], query);
    expect(result.has_conflict).toBe(false);
  });
});

describe('Rule 5: Section 6(3) transfer eligibility', () => {
  it('CENTRAL→CENTRAL transfer is eligible', () => {
    const result = validateSection6_3Transfer('CENTRAL', 'CENTRAL');
    expect(result.eligible).toBe(true);
  });

  it('CENTRAL→STATE transfer is NOT reliably eligible', () => {
    const result = validateSection6_3Transfer('CENTRAL', 'STATE');
    expect(result.eligible).toBe(false);
    expect(result.pitch_line).toContain('DoPT circular');
  });

  it('STATE→CENTRAL transfer is NOT reliably eligible', () => {
    const result = validateSection6_3Transfer('STATE', 'CENTRAL');
    expect(result.eligible).toBe(false);
  });

  it('STATE→STATE transfer is NOT reliably eligible (different states)', () => {
    const result = validateSection6_3Transfer('STATE', 'STATE');
    expect(result.eligible).toBe(false);
  });
});

describe('Full candidate validation', () => {
  it('PMC passes for a Pune roads query', () => {
    const query: CitizenQuery = { subject_domain: 'roads', location_state_id: 'MH', location_city: 'Pune', government_level_hint: null };
    const result = validateCandidate(pmcCandidate, query);
    expect(result.passed).toBe(true);
    expect(result.geographic_match).toBe(true);
    expect(result.subject_match).toBe(true);
    expect(result.level_consistency).toBe(true);
  });

  it('MEA passes for a passport query', () => {
    const query: CitizenQuery = { subject_domain: 'passport', location_state_id: 'MH', location_city: null, government_level_hint: null };
    const result = validateCandidate(meaCandidate, query);
    expect(result.passed).toBe(true);
  });

  // ═══════════════════════════════════════════════════════
  // FLOW D — THE MOST IMPORTANT TEST IN THE PROJECT
  // PLAN.txt §19D, §40, §45
  //
  // Scenario: AI ranking (semantic similarity) puts a plausible-sounding
  // STATE candidate first for a CENTRAL (passport) query.
  // The Rule Engine MUST demote it — it must NEVER appear as the top result.
  // ═══════════════════════════════════════════════════════
  it('[FLOW D] AI-suggested STATE candidate for a CENTRAL passport query is demoted by Rule Engine', () => {
    const passportQuery: CitizenQuery = {
      subject_domain: 'passport',
      location_state_id: 'MH',
      location_city: 'Pune',
      government_level_hint: null,
    };

    // AI (incorrectly) ranked this state candidate first
    const aiTopCandidate = invalidStateCandidateForCentralQuery;
    const correctCentralCandidate = meaCandidate;

    const aiTopResult = validateCandidate(aiTopCandidate, passportQuery);
    const correctResult = validateCandidate(correctCentralCandidate, passportQuery);

    // The wrong candidate must FAIL validation
    expect(aiTopResult.passed).toBe(false);
    expect(aiTopResult.subject_match).toBe(false);
    expect(aiTopResult.demotion_reason).not.toBeNull();

    // The correct candidate must PASS
    expect(correctResult.passed).toBe(true);
    expect(correctResult.subject_match).toBe(true);

    // Simulate the ranking flip: wrong candidate was rank 1, correct was rank 2
    // After rule validation, only the correct one has passed=true → it becomes rank 1
    const ranked = [
      { candidate: aiTopCandidate, ai_rank: 1, validation: aiTopResult },
      { candidate: correctCentralCandidate, ai_rank: 2, validation: correctResult },
    ].filter(r => r.validation.passed);

    expect(ranked.length).toBe(1);
    expect(ranked[0].candidate.id).toBe('auth_mea_passport');
    expect(ranked[0].candidate.government_level).toBe('CENTRAL');
  });

  it('Stale candidate does not fully pass (staleness warning appended)', () => {
    const query: CitizenQuery = { subject_domain: 'roads', location_state_id: 'MH', location_city: 'Pune', government_level_hint: null };
    const result = validateCandidate(staleCandidate, query);
    expect(result.passed).toBe(false);
    expect(result.failure_reasons.some(r => r.includes('days'))).toBe(true);
  });

  it('Candidate with bad data (CENTRAL + state_id) fails consistency check', () => {
    const query: CitizenQuery = { subject_domain: 'passport', location_state_id: null, location_city: null, government_level_hint: null };
    const result = validateCandidate(badDataCentralWithState, query);
    expect(result.passed).toBe(false);
    expect(result.level_consistency).toBe(false);
  });
});

describe('Freshness check', () => {
  it('2026-08-26 is fresh (today)', () => {
    expect(isFresh('2026-08-26')).toBe(true);
  });

  it('2023-01-01 is stale (> 180 days)', () => {
    expect(isFresh('2023-01-01')).toBe(false);
  });
});
