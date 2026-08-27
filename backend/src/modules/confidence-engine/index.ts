/**
 * Confidence Engine — PLAN.txt §14, §21
 *
 * Computes a structured confidence score from multiple signals.
 * HIGH = rule passed + geo + subject match + source fresh
 * MEDIUM = rule passed + one partial match + source within window
 * LOW = rule failed or multiple conflicts or stale source
 * NONE = no candidates at all
 */
import { ValidationResult } from '../jurisdiction-rule-engine/index';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface ConfidenceScore {
  level: ConfidenceLevel;
  score: number; // 0.0 - 1.0
  reasons: string[];
  caveats: string[];
}

const STALENESS_DAYS = 180;

function daysSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

export function computeConfidence(
  validation: ValidationResult,
  sourceConfidenceTier: 'HIGH' | 'MEDIUM' | 'LOW',
  lastVerifiedDate: string,
  isConcurrentConflict: boolean,
): ConfidenceScore {
  if (isConcurrentConflict) {
    return {
      level: 'LOW',
      score: 0.35,
      reasons: ['Multiple authorities have overlapping jurisdiction (Concurrent List)'],
      caveats: ['The correct authority depends on what specific information you need. See the "Why This?" panel.']
    };
  }

  const reasons: string[] = [];
  const caveats: string[] = [];
  let score = 0;

  // Validation weight (50%)
  if (validation.passed) {
    score += 0.50;
    reasons.push('All jurisdiction rules passed');
  } else {
    // Subject-only match with a geographic hard-fail is NOT a partial pass — it's the
    // exact wrong-jurisdiction harm this product exists to prevent
    const partialPass = validation.geographic_match;
    if (partialPass) {
      score += 0.25;
      reasons.push('Partial jurisdiction match');
      caveats.push(...validation.failure_reasons);
    } else {
      score += 0.05;
      caveats.push(...validation.failure_reasons);
    }
  }

  // Source quality (25%)
  if (sourceConfidenceTier === 'HIGH') {
    score += 0.25;
    reasons.push('Sourced from official government portal');
  } else if (sourceConfidenceTier === 'MEDIUM') {
    score += 0.12;
    reasons.push('Sourced from expert/NGO source');
  } else {
    caveats.push('Source confidence is low — please verify on official portal');
  }

  // Freshness (25%)
  const age = daysSince(lastVerifiedDate);
  if (age <= STALENESS_DAYS) {
    score += 0.25;
    reasons.push(`Data verified within last ${Math.round(age)} days`);
  } else {
    caveats.push(`Source data is ${Math.round(age)} days old — please verify current details before filing`);
  }

  // Determine level — PLAN.txt §20: Rule validation has final say.
  let level: ConfidenceLevel;
  if (!validation.passed) {
    // Rule Engine hard-failed this candidate — no combination of good source/freshness
    // metadata may present it as MEDIUM or HIGH.
    level = score > 0 ? 'LOW' : 'NONE';
  } else if (score >= 0.85) {
    level = 'HIGH';
  } else if (score >= 0.55) {
    level = 'MEDIUM';
  } else if (score > 0) {
    level = 'LOW';
  } else {
    level = 'NONE';
  }

  return { level, score: Math.min(score, 1.0), reasons, caveats };
}
