import { getDb } from '../src/db/connection';
import { runSeed } from '../src/db/seed/run_seed';
import { discoverAuthorities } from '../src/modules/authority-discovery/index';
import { computeConfidence } from '../src/modules/confidence-engine/index';

async function runEndToEndVerification() {
  console.log('=== Starting End-to-End API & Engine Verification ===');

  // 1. Ensure seed is fresh
  runSeed();

  // 2. Test PMC Flow (Pune road repair)
  console.log('\n--- Test 1: Pune Road Repair (Municipal Single Jurisdiction) ---');
  const pmcDiscovery = await discoverAuthorities({
    subject_domain: 'roads',
    location_city: 'Pune',
    location_state_id: 'MH',
    government_level_hint: null,
  });

  const scoredCandidates = pmcDiscovery.candidates.map(c => ({
    ...c,
    confidence: computeConfidence(
      c.validation,
      c.source_document_title.toLowerCase().includes('official') ? 'HIGH' : 'MEDIUM',
      c.last_verified_date,
      pmcDiscovery.concurrent_conflict && c.is_concurrent_list,
    )
  }));

  console.log(`Candidates found: ${scoredCandidates.length}`);
  const topCandidate = scoredCandidates[0];
  console.log(`Top candidate: ${topCandidate?.name} (${topCandidate?.government_level}) -> Confidence: ${topCandidate?.confidence.level} (${topCandidate?.confidence.score})`);
  console.log(`Rule passed: ${topCandidate?.validation.passed}`);

  if (topCandidate?.authority_id !== 'auth_pmc') {
    throw new Error(`Expected auth_pmc, got ${topCandidate?.authority_id}`);
  }
  if (topCandidate?.confidence.level !== 'HIGH') {
    throw new Error(`Expected HIGH confidence for PMC, got ${topCandidate?.confidence.level}`);
  }

  // Check MCD candidate in the same query (should be demoted to LOW)
  const mcdCandidate = scoredCandidates.find(c => c.authority_id === 'auth_mcd');
  if (mcdCandidate) {
    console.log(`MCD candidate under Pune query -> Rule passed: ${mcdCandidate.validation.passed}, Geo match: ${mcdCandidate.validation.geographic_match}, Confidence: ${mcdCandidate.confidence.level} (Score: ${mcdCandidate.confidence.score})`);
    if (mcdCandidate.validation.passed !== false) {
      throw new Error('Expected MCD validation.passed to be FALSE for Pune query');
    }
    if (mcdCandidate.confidence.level !== 'LOW') {
      throw new Error(`Expected MCD confidence to be LOW, but got ${mcdCandidate.confidence.level}`);
    }
  }

  // 3. Test Concurrent List Flow (Education in Maharashtra)
  console.log('\n--- Test 2: Education in Maharashtra (Concurrent List Entry 25) ---');
  const eduDiscovery = await discoverAuthorities({
    subject_domain: 'education',
    location_city: null,
    location_state_id: 'MH',
    government_level_hint: null,
  });

  const scoredEduCandidates = eduDiscovery.candidates.map(c => ({
    ...c,
    confidence: computeConfidence(
      c.validation,
      c.source_document_title.toLowerCase().includes('official') ? 'HIGH' : 'MEDIUM',
      c.last_verified_date,
      eduDiscovery.concurrent_conflict && c.is_concurrent_list,
    )
  }));

  console.log(`Concurrent conflict detected: ${eduDiscovery.concurrent_conflict}`);
  console.log(`Candidates count: ${scoredEduCandidates.length}`);
  const centralEdu = scoredEduCandidates.find(c => c.authority_id === 'auth_moe_central');
  const stateEdu = scoredEduCandidates.find(c => c.authority_id === 'auth_mh_education');
  console.log(`Central MoE Confidence: ${centralEdu?.confidence.level}, MH Education Confidence: ${stateEdu?.confidence.level}`);

  if (!eduDiscovery.concurrent_conflict) {
    throw new Error('Expected concurrent_conflict to be true for Education domain');
  }
  if (centralEdu?.confidence.level !== 'LOW' || stateEdu?.confidence.level !== 'LOW') {
    throw new Error('Expected both Concurrent List education candidates to have LOW confidence');
  }

  // 4. Test Delhi Coverage (MCD)
  console.log('\n--- Test 3: Delhi MCD Road Repair ---');
  const delhiDiscovery = await discoverAuthorities({
    subject_domain: 'roads',
    location_city: 'New Delhi',
    location_state_id: 'DL',
    government_level_hint: null,
  });
  const scoredDelhiCandidates = delhiDiscovery.candidates.map(c => ({
    ...c,
    confidence: computeConfidence(
      c.validation,
      c.source_document_title.toLowerCase().includes('official') ? 'HIGH' : 'MEDIUM',
      c.last_verified_date,
      delhiDiscovery.concurrent_conflict && c.is_concurrent_list,
    )
  }));

  console.log(`Delhi Top Candidate: ${scoredDelhiCandidates[0]?.name} (${scoredDelhiCandidates[0]?.authority_id}) -> Confidence: ${scoredDelhiCandidates[0]?.confidence.level}`);
  if (scoredDelhiCandidates[0]?.authority_id !== 'auth_mcd') {
    throw new Error(`Expected auth_mcd, got ${scoredDelhiCandidates[0]?.authority_id}`);
  }
  if (scoredDelhiCandidates[0]?.confidence.level !== 'HIGH') {
    throw new Error(`Expected HIGH confidence for MCD in Delhi, got ${scoredDelhiCandidates[0]?.confidence.level}`);
  }

  // 5. Test Out of Scope Query (Zero Candidates / Clarify Path)
  console.log('\n--- Test 4: Out-of-Scope Query ---');
  const oosDiscovery = await discoverAuthorities({
    subject_domain: 'monetary_policy_central_bank',
    location_city: null,
    location_state_id: null,
    government_level_hint: null,
  });
  console.log(`Out-of-scope Candidates count: ${oosDiscovery.candidates.length}`);
  if (oosDiscovery.candidates.length !== 0) {
    throw new Error(`Expected 0 candidates, got ${oosDiscovery.candidates.length}`);
  }

  console.log('\n=== ALL END-TO-END TESTS PASSED CLEANLY! ===\n');
}

runEndToEndVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
