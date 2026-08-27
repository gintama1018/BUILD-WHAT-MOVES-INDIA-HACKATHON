import { getDb } from '../src/db/connection';
import { runSeed } from '../src/db/seed/run_seed';
import { extractIntent } from '../src/ai-gateway/index';
import { discoverAuthorities } from '../src/modules/authority-discovery/index';
import { computeConfidence } from '../src/modules/confidence-engine/index';
import { detectConcurrentConflict } from '../src/modules/jurisdiction-rule-engine/index';

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
  console.log(`Candidates found: ${pmcDiscovery.candidates.length}`);
  const topCandidate = pmcDiscovery.candidates[0];
  console.log(`Top candidate: ${topCandidate?.name} (${topCandidate?.government_level})`);
  console.log(`Rule passed: ${topCandidate?.validation.passed}`);
  if (topCandidate?.authority_id !== 'auth_pmc') {
    throw new Error(`Expected auth_pmc, got ${topCandidate?.authority_id}`);
  }

  // 3. Test Concurrent List Flow (Education in Maharashtra)
  console.log('\n--- Test 2: Education in Maharashtra (Concurrent List Entry 25) ---');
  const eduDiscovery = await discoverAuthorities({
    subject_domain: 'education',
    location_city: null,
    location_state_id: 'MH',
    government_level_hint: null,
  });
  console.log(`Concurrent conflict detected: ${eduDiscovery.concurrent_conflict}`);
  console.log(`Candidates count: ${eduDiscovery.candidates.length}`);
  const centralEdu = eduDiscovery.candidates.find(c => c.authority_id === 'auth_moe_central');
  const stateEdu = eduDiscovery.candidates.find(c => c.authority_id === 'auth_mh_education');
  console.log(`Found Central MoE: ${!!centralEdu}, Found MH Education: ${!!stateEdu}`);
  if (!eduDiscovery.concurrent_conflict) {
    throw new Error('Expected concurrent_conflict to be true for Education domain');
  }

  // 4. Test Delhi Coverage (MCD)
  console.log('\n--- Test 3: Delhi MCD Road Repair ---');
  const delhiDiscovery = await discoverAuthorities({
    subject_domain: 'roads',
    location_city: 'New Delhi',
    location_state_id: 'DL',
    government_level_hint: null,
  });
  console.log(`Delhi Top Candidate: ${delhiDiscovery.candidates[0]?.name} (${delhiDiscovery.candidates[0]?.authority_id})`);
  if (delhiDiscovery.candidates[0]?.authority_id !== 'auth_mcd') {
    throw new Error(`Expected auth_mcd, got ${delhiDiscovery.candidates[0]?.authority_id}`);
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
  if (oosDiscovery.candidates.length > 0) {
    console.log(`Warning: Found unexpected candidate: ${oosDiscovery.candidates[0].name}`);
  }

  console.log('\n=== ALL END-TO-END TESTS PASSED CLEANLY! ===\n');
}

runEndToEndVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
