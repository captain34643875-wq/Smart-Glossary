/**
 * Term Extraction Engine
 * 
 * Pattern-based term extraction engine for Chrome Extension.
 * Extracts potential technical term candidates from web page text.
 * 
 * NO dictionaries or glossaries are used - only pattern-based matching.
 * 
 * @module term-engine
 */

// Type definitions
export * from './types';

// Pattern matching
export {
  getAllPatterns,
  getPatternByType,
  extractAllMatches,
  extractMatchesByPattern,
  matchesAnyPattern,
  identifyPatternType,
} from './patterns';

// Filtering
export {
  filterCandidate,
  filterCandidates,
  getPassedCandidates,
  getRejectionStats,
  getStopWords,
  addStopWords,
} from './filters';

// Scoring
export {
  scoreCandidate,
  scoreCandidates,
  filterByScore,
  getAverageScore,
  getScoreStats,
} from './scorer';

// Ranking
export {
  rankCandidates,
  calculateDiversityScore,
  getPatternDistribution,
  selectBalancedCandidates,
  getRankingStats,
} from './ranking';

// Main extraction engine
export {
  extractTerms,
  extractTermsFromMultiple,
  extractTermsFromElement,
  extractTermsFromDocument,
  getExtractionStats,
  validateConfig,
} from './extractor';
