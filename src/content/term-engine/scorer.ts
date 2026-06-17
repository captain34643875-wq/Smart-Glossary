/**
 * Scoring Algorithm for Term Candidates
 * 
 * This module calculates relevance scores for term candidates based on
 * various factors. Scores range from 0 to 1, with higher scores indicating
 * more likely technical/domain-specific terms.
 * 
 * Scoring is based on pattern-based heuristics, not domain knowledge.
 */

import { FilteredCandidate, ScoredCandidate, ScoringFactor, PatternType } from './types';

/**
 * Pattern type weights (higher = more likely to be technical)
 */
const PATTERN_WEIGHTS: Record<PatternType, number> = {
  acronym: 0.85,        // Acronyms are often technical
  pascal_case: 0.90,   // PascalCase is very common in programming
  camel_case: 0.82,    // camelCase is common in programming
  kebab_case: 0.75,    // kebab-case is common in URLs/identifiers
  version_string: 0.70, // Version numbers are technical but not always terms
  noun_phrase: 0.88,   // Multi-word phrases are often domain-specific
};

/**
 * Calculate pattern type score
 * 
 * @param patternType - Pattern type of the candidate
 * @returns Score based on pattern type (0-1)
 */
function calculatePatternScore(patternType: PatternType): number {
  return PATTERN_WEIGHTS[patternType] || 0.5;
}

/**
 * Calculate word length score
 * Longer terms are more likely to be technical
 * 
 * @param text - Candidate text
 * @returns Score based on length (0-1)
 */
function calculateLengthScore(text: string): number {
  const length = text.length;
  
  // Too short (< 3): low score
  if (length < 3) return 0.2;
  // Short (3-5): moderate score
  if (length <= 5) return 0.5;
  // Medium (6-10): good score
  if (length <= 10) return 0.8;
  // Long (11-20): high score
  if (length <= 20) return 0.9;
  // Very long (> 20): slightly lower (might be a sentence)
  return 0.7;
}

/**
 * Calculate uppercase ratio score
 * Higher uppercase ratio suggests technical term
 * 
 * @param text - Candidate text
 * @returns Score based on uppercase ratio (0-1)
 */
function calculateUppercaseScore(text: string): number {
  if (text.length === 0) return 0;
  
  const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
  const ratio = uppercaseCount / text.length;
  
  // All uppercase: high score (acronyms)
  if (ratio === 1) return 0.9;
  // Mostly uppercase: high score
  if (ratio > 0.7) return 0.85;
  // Mixed case: good score (camelCase, PascalCase)
  if (ratio > 0.3 && ratio < 0.7) return 0.8;
  // Some uppercase: moderate score
  if (ratio > 0.1) return 0.6;
  // No uppercase: low score
  return 0.3;
}

/**
 * Calculate complexity score
 * Based on character diversity and special patterns
 * Optimized to use single pass through text instead of multiple regex calls
 * 
 * @param text - Candidate text
 * @returns Score based on complexity (0-1)
 */
function calculateComplexityScore(text: string): number {
  let score = 0;
  let hasNumbers = false;
  let hasLower = false;
  let hasUpper = false;
  let hasHyphen = false;
  let hasUnderscore = false;
  let wordCount = 1; // Start with 1 (at least one word)
  
  // Single pass through text to collect features
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    if (code >= 48 && code <= 57) {
      hasNumbers = true;
    } else if (code >= 97 && code <= 122) {
      hasLower = true;
    } else if (code >= 65 && code <= 90) {
      hasUpper = true;
      // Count word boundaries for PascalCase/camelCase
      if (i > 0) {
        const prevCode = text.charCodeAt(i - 1);
        if (prevCode >= 97 && prevCode <= 122) {
          wordCount++;
        }
      }
    } else if (char === '-') {
      hasHyphen = true;
      wordCount++;
    } else if (char === '_') {
      hasUnderscore = true;
      wordCount++;
    }
  }
  
  // Calculate score based on collected features
  if (hasNumbers) score += 0.2;
  if (hasLower && hasUpper) score += 0.3;
  if (hasHyphen || hasUnderscore) score += 0.2;
  if (wordCount > 1) score += 0.3;
  
  return Math.min(score, 1);
}

/**
 * Calculate context length score
 * Longer context suggests the term is being discussed in detail
 * 
 * @param context - Context text
 * @returns Score based on context length (0-1)
 */
function calculateContextScore(context: string): number {
  const length = context.length;
  
  // No context: low score
  if (length === 0) return 0.3;
  // Short context (< 20): moderate score
  if (length < 20) return 0.5;
  // Medium context (20-100): good score
  if (length < 100) return 0.7;
  // Long context (100+): high score
  return 0.85;
}

/**
 * Calculate position score
 * Terms appearing earlier in text might be more important
 * 
 * @param start - Start position in text
 * @param totalLength - Total text length
 * @returns Score based on position (0-1)
 */
function calculatePositionScore(start: number, totalLength: number): number {
  if (totalLength === 0) return 0.5;
  
  const positionRatio = start / totalLength;
  
  // Earlier in text: higher score
  // Inverse of position ratio (0 at end, 1 at start)
  return 1 - (positionRatio * 0.5); // Max reduction of 0.5
}

/**
 * Calculate frequency score
 * This would require tracking occurrences across the document
 * For now, returns a neutral score as frequency tracking is done elsewhere
 * 
 * @returns Neutral score (0.5)
 */
function calculateFrequencyScore(): number {
  return 0.5; // Neutral, as frequency is tracked separately
}

/**
 * Calculate overall score for a candidate
 * 
 * @param candidate - Filtered candidate to score
 * @param totalTextLength - Total length of the source text
 * @returns Scored candidate with detailed breakdown
 */
export function scoreCandidate(
  candidate: FilteredCandidate,
  totalTextLength: number = 1000
): ScoredCandidate {
  if (!candidate.passed) {
    // Failed candidates get a score of 0
    return {
      ...candidate,
      score: 0,
      scoreBreakdown: {
        pattern_type: 0,
        frequency: 0,
        context_length: 0,
        uppercase_ratio: 0,
        word_length: 0,
        complexity: 0,
      },
    };
  }

  const patternScore = calculatePatternScore(candidate.patternType);
  const lengthScore = calculateLengthScore(candidate.text);
  const uppercaseScore = calculateUppercaseScore(candidate.text);
  const complexityScore = calculateComplexityScore(candidate.text);
  const contextScore = calculateContextScore(candidate.context);
  const positionScore = calculatePositionScore(candidate.start, totalTextLength);
  const frequencyScore = calculateFrequencyScore();

  // Weighted average of all factors
  // Pattern type and complexity are most important
  const weights = {
    pattern_type: 0.3,
    frequency: 0.1,
    context_length: 0.1,
    uppercase_ratio: 0.15,
    word_length: 0.15,
    complexity: 0.2,
  };

  const overallScore =
    patternScore * weights.pattern_type +
    frequencyScore * weights.frequency +
    contextScore * weights.context_length +
    uppercaseScore * weights.uppercase_ratio +
    lengthScore * weights.word_length +
    complexityScore * weights.complexity;

  return {
    ...candidate,
    score: overallScore,
    scoreBreakdown: {
      pattern_type: patternScore,
      frequency: frequencyScore,
      context_length: contextScore,
      uppercase_ratio: uppercaseScore,
      word_length: lengthScore,
      complexity: complexityScore,
    },
  };
}

/**
 * Score multiple candidates
 * 
 * @param candidates - Array of filtered candidates
 * @param totalTextLength - Total length of the source text
 * @returns Array of scored candidates
 */
export function scoreCandidates(
  candidates: FilteredCandidate[],
  totalTextLength: number = 1000
): ScoredCandidate[] {
  return candidates.map(candidate => scoreCandidate(candidate, totalTextLength));
}

/**
 * Get candidates above a score threshold
 * 
 * @param scoredCandidates - Array of scored candidates
 * @param threshold - Minimum score threshold (0-1)
 * @returns Array of candidates above threshold
 */
export function filterByScore(
  scoredCandidates: ScoredCandidate[],
  threshold: number = 0.5
): ScoredCandidate[] {
  return scoredCandidates.filter(c => c.score >= threshold);
}

/**
 * Get average score of candidates
 * 
 * @param scoredCandidates - Array of scored candidates
 * @returns Average score (0-1)
 */
export function getAverageScore(scoredCandidates: ScoredCandidate[]): number {
  if (scoredCandidates.length === 0) return 0;
  
  const total = scoredCandidates.reduce((sum, c) => sum + c.score, 0);
  return total / scoredCandidates.length;
}

/**
 * Get score statistics
 * 
 * @param scoredCandidates - Array of scored candidates
 * @returns Score statistics
 */
export function getScoreStats(scoredCandidates: ScoredCandidate[]) {
  if (scoredCandidates.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
    };
  }

  const scores = scoredCandidates.map(c => c.score).sort((a, b) => a - b);
  const min = scores[0];
  const max = scores[scores.length - 1];
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const median = scores.length % 2 === 0
    ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
    : scores[Math.floor(scores.length / 2)];

  return { min, max, avg, median };
}
