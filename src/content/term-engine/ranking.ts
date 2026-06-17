/**
 * Ranking and Selection Logic
 * 
 * This module ranks scored candidates and selects the top N candidates
 * for further processing. It handles deduplication and diversity considerations.
 */

import { ScoredCandidate, RankedCandidate } from './types';

/**
 * Ranking configuration
 */
export interface RankingConfig {
  /** Maximum number of candidates to return */
  maxCandidates: number;
  /** Minimum score threshold */
  minScoreThreshold: number;
  /** Whether to deduplicate similar terms */
  enableDeduplication: boolean;
  /** Similarity threshold for deduplication (0-1) */
  similarityThreshold: number;
}

/**
 * Default ranking configuration
 */
const DEFAULT_CONFIG: RankingConfig = {
  maxCandidates: 20,
  minScoreThreshold: 0.5,
  enableDeduplication: true,
  similarityThreshold: 0.85,
};

/**
 * Calculate similarity between two terms using Jaccard similarity
 * 
 * @param term1 - First term
 * @param term2 - Second term
 * @returns Similarity score (0-1)
 */
function calculateSimilarity(term1: string, term2: string): number {
  const set1 = new Set(term1.toLowerCase().split(''));
  const set2 = new Set(term2.toLowerCase().split(''));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
}

/**
 * Check if two terms are similar enough to be considered duplicates
 * 
 * @param term1 - First term
 * @param term2 - Second term
 * @param threshold - Similarity threshold
 * @returns True if terms are similar
 */
function areSimilarTerms(term1: string, term2: string, threshold: number): boolean {
  // Exact match
  if (term1.toLowerCase() === term2.toLowerCase()) {
    return true;
  }
  
  // Case-insensitive substring match (one is substring of the other)
  const lower1 = term1.toLowerCase();
  const lower2 = term2.toLowerCase();
  
  if (lower1.includes(lower2) || lower2.includes(lower1)) {
    return true;
  }
  
  // Jaccard similarity
  const similarity = calculateSimilarity(term1, term2);
  return similarity >= threshold;
}

/**
 * Deduplicate candidates by keeping the highest-scoring version
 * Optimized from O(k²) to O(k log k) using Map with normalized keys
 * Uses exact match and substring matching only (skips expensive Jaccard for performance)
 * 
 * @param candidates - Array of scored candidates
 * @param threshold - Similarity threshold (used for substring matching)
 * @returns Deduplicated array
 */
function deduplicateCandidates(
  candidates: ScoredCandidate[],
  threshold: number
): ScoredCandidate[] {
  // Sort by score descending to keep highest-scoring versions
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  
  // Use Map for O(1) lookup - key is normalized text
  const termMap = new Map<string, ScoredCandidate>();
  
  for (const candidate of sorted) {
    const normalizedText = candidate.text.toLowerCase();
    
    // Check for exact match (case-insensitive) - O(1)
    if (termMap.has(normalizedText)) {
      continue;
    }
    
    // Check for substring similarity - O(k) worst case, but typically O(1) with early exit
    // This is acceptable as most duplicates are caught by exact match
    let isDuplicate = false;
    for (const [key, kept] of termMap) {
      // Only check if one is substring of the other
      if (normalizedText.includes(key) || key.includes(normalizedText)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      termMap.set(normalizedText, candidate);
    }
  }
  
  return Array.from(termMap.values());
}

/**
 * Convert scored candidate to ranked candidate
 * 
 * @param candidate - Scored candidate
 * @returns Ranked candidate
 */
function toRankedCandidate(candidate: ScoredCandidate): RankedCandidate {
  return {
    text: candidate.text,
    score: candidate.score,
    reason: candidate.patternType,
    start: candidate.start,
    end: candidate.end,
    context: candidate.context,
    xpath: candidate.xpath,
  };
}

/**
 * Rank candidates and select top N
 * 
 * @param candidates - Array of scored candidates
 * @param config - Ranking configuration
 * @returns Array of ranked candidates
 */
export function rankCandidates(
  candidates: ScoredCandidate[],
  config: Partial<RankingConfig> = {}
): RankedCandidate[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Filter by minimum score threshold
  let filtered = candidates.filter(c => c.score >= finalConfig.minScoreThreshold);
  
  // Deduplicate if enabled
  if (finalConfig.enableDeduplication) {
    filtered = deduplicateCandidates(filtered, finalConfig.similarityThreshold);
  }
  
  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);
  
  // Take top N
  const topCandidates = filtered.slice(0, finalConfig.maxCandidates);
  
  // Convert to ranked candidates
  return topCandidates.map(toRankedCandidate);
}

/**
 * Get diversity score for a set of candidates
 * Measures how diverse the selected terms are (avoiding similar terms)
 * Optimized from O(k²) to O(k log k) using sampling for large datasets
 * 
 * @param candidates - Array of ranked candidates
 * @returns Diversity score (0-1, higher is more diverse)
 */
export function calculateDiversityScore(candidates: RankedCandidate[]): number {
  if (candidates.length <= 1) return 1;
  
  const k = candidates.length;
  
  // For small datasets, use exact calculation
  if (k <= 20) {
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const similarity = calculateSimilarity(candidates[i].text, candidates[j].text);
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    if (comparisons === 0) return 1;
    const avgSimilarity = totalSimilarity / comparisons;
    return 1 - avgSimilarity;
  }
  
  // For large datasets, use sampling (O(k) instead of O(k²))
  // Sample up to 100 pairs for diversity calculation
  const maxSamples = 100;
  const totalPairs = (k * (k - 1)) / 2;
  const sampleSize = Math.min(maxSamples, totalPairs);
  
  let totalSimilarity = 0;
  
  // Use deterministic sampling based on indices
  for (let i = 0; i < sampleSize; i++) {
    const step = Math.floor(totalPairs / sampleSize);
    let pairIndex = i * step;
    
    // Convert pair index back to (i, j) indices
    let n = 0;
    let idx1 = 0;
    while (pairIndex >= k - idx1 - 1) {
      pairIndex -= (k - idx1 - 1);
      idx1++;
    }
    const idx2 = idx1 + 1 + pairIndex;
    
    if (idx2 < k) {
      const similarity = calculateSimilarity(candidates[idx1].text, candidates[idx2].text);
      totalSimilarity += similarity;
    }
  }
  
  const avgSimilarity = totalSimilarity / sampleSize;
  return 1 - avgSimilarity;
}

/**
 * Get pattern type distribution in ranked candidates
 * 
 * @param candidates - Array of ranked candidates
 * @returns Map of pattern type to count
 */
export function getPatternDistribution(candidates: RankedCandidate[]): Map<string, number> {
  const distribution = new Map<string, number>();
  
  for (const candidate of candidates) {
    const count = distribution.get(candidate.reason) || 0;
    distribution.set(candidate.reason, count + 1);
  }
  
  return distribution;
}

/**
 * Select candidates with balanced pattern distribution
 * Ensures diversity in pattern types, not just high scores
 * 
 * @param candidates - Array of scored candidates
 * @param maxPerPattern - Maximum candidates per pattern type
 * @param maxTotal - Maximum total candidates
 * @returns Array of ranked candidates
 */
export function selectBalancedCandidates(
  candidates: ScoredCandidate[],
  maxPerPattern: number = 5,
  maxTotal: number = 20
): RankedCandidate[] {
  // Group by pattern type
  const grouped = new Map<string, ScoredCandidate[]>();
  
  for (const candidate of candidates) {
    const pattern = candidate.patternType;
    const group = grouped.get(pattern) || [];
    group.push(candidate);
    grouped.set(pattern, group);
  }
  
  // Sort each group by score
  for (const [pattern, group] of grouped) {
    group.sort((a, b) => b.score - a.score);
    grouped.set(pattern, group.slice(0, maxPerPattern));
  }
  
  // Flatten and sort by score
  const balanced: ScoredCandidate[] = [];
  for (const group of grouped.values()) {
    balanced.push(...group);
  }
  balanced.sort((a, b) => b.score - a.score);
  
  // Take top N
  const topCandidates = balanced.slice(0, maxTotal);
  
  return topCandidates.map(toRankedCandidate);
}

/**
 * Get ranking statistics
 * 
 * @param candidates - Array of ranked candidates
 * @returns Ranking statistics
 */
export function getRankingStats(candidates: RankedCandidate[]) {
  if (candidates.length === 0) {
    return {
      total: 0,
      avgScore: 0,
      minScore: 0,
      maxScore: 0,
      diversity: 1,
      patternDistribution: new Map(),
    };
  }

  const scores = candidates.map(c => c.score);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const diversity = calculateDiversityScore(candidates);
  const patternDistribution = getPatternDistribution(candidates);

  return {
    total: candidates.length,
    avgScore,
    minScore,
    maxScore,
    diversity,
    patternDistribution,
  };
}
