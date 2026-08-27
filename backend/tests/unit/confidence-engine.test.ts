import { describe, it, expect } from 'vitest';
import { computeConfidence } from '../../src/modules/confidence-engine/index';
import { ValidationResult } from '../../src/modules/jurisdiction-rule-engine/index';

describe('Confidence Engine — Hard Validation Gate Enforcements', () => {
  const freshDate = new Date().toISOString().split('T')[0];

  it('RULE: hard-failed validation NEVER achieves MEDIUM or HIGH confidence despite high quality source', () => {
    const failedValidation: ValidationResult = {
      passed: false,
      geographic_match: false,
      subject_match: true,
      level_consistency: true,
      failure_reasons: ['Authority jurisdiction does not cover the citizen location (MH)'],
      demotion_reason: 'Authority jurisdiction does not cover the citizen location (MH)',
    };

    const result = computeConfidence(
      failedValidation,
      'HIGH', // Even with official source
      freshDate, // Even with freshly verified data
      false
    );

    expect(result.level).toBe('LOW');
    expect(result.caveats.length).toBeGreaterThan(0);
    expect(result.caveats[0]).toContain('Authority jurisdiction does not cover');
  });

  it('RULE: Concurrent List conflict forces LOW confidence and dual-authority note', () => {
    const passedValidation: ValidationResult = {
      passed: true,
      geographic_match: true,
      subject_match: true,
      level_consistency: true,
      failure_reasons: [],
      demotion_reason: null,
    };

    const result = computeConfidence(
      passedValidation,
      'HIGH',
      freshDate,
      true // isConcurrentConflict = true
    );

    expect(result.level).toBe('LOW');
    expect(result.score).toBe(0.35);
    expect(result.reasons[0]).toContain('Concurrent List');
  });

  it('RULE: Full validation pass with HIGH source tier and fresh date scores HIGH confidence', () => {
    const passedValidation: ValidationResult = {
      passed: true,
      geographic_match: true,
      subject_match: true,
      level_consistency: true,
      failure_reasons: [],
      demotion_reason: null,
    };

    const result = computeConfidence(
      passedValidation,
      'HIGH',
      freshDate,
      false
    );

    expect(result.level).toBe('HIGH');
    expect(result.score).toBe(1.0);
  });
});
