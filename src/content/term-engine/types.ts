/**
 * Term Extraction Engine Type Definitions
 * 
 * This module defines all TypeScript types for the term extraction engine.
 * The engine extracts potential term candidates from web page text nodes
 * using pattern-based matching (no dictionary/database approach).
 */

/**
 * Pattern type for term extraction
 */
export type PatternType =
  | 'acronym'        // All caps abbreviations (e.g., API, HTTP)
  | 'pascal_case'    // PascalCase identifiers (e.g., ReactComponent)
  | 'camel_case'     // camelCase identifiers (e.g., useState)
  | 'kebab_case'     // kebab-case identifiers (e.g., term-engine)
  | 'version_string' // Version numbers (e.g., v1.0, 2.5.3)
  | 'noun_phrase';   // Multi-word noun phrases (e.g., Machine Learning)

/**
 * Filter rejection reason
 */
export type FilterReason =
  | 'too_short'           // Length less than 2 characters
  | 'numeric_only'        // Contains only numbers
  | 'url'                 // URL pattern detected
  | 'email'               // Email pattern detected
  | 'stop_word'           // Common stop word
  | 'too_common'          // Too generic/common word
  | 'invalid_pattern';    // Doesn't match any valid pattern

/**
 * Scoring factor type
 */
export type ScoringFactor =
  | 'pattern_type'        // Weight based on pattern type
  | 'frequency'           // Occurrence frequency in text
  | 'context_length'      // Length of surrounding context
  | 'uppercase_ratio'     // Ratio of uppercase letters
  | 'word_length'         // Length of the term
  | 'complexity';         // Structural complexity

/**
 * Raw term candidate before filtering
 */
export interface RawCandidate {
  /** The extracted text */
  text: string;
  /** Pattern type that matched */
  patternType: PatternType;
  /** Start position in the text node */
  start: number;
  /** End position in the text node */
  end: number;
  /** Surrounding context text */
  context: string;
  /** XPath to the DOM element */
  xpath: string;
}

/**
 * Filtered term candidate
 */
export interface FilteredCandidate {
  /** The extracted text */
  text: string;
  /** Pattern type that matched */
  patternType: PatternType;
  /** Start position in the text node */
  start: number;
  /** End position in the text node */
  end: number;
  /** Surrounding context text */
  context: string;
  /** XPath to the DOM element */
  xpath: string;
  /** Whether the candidate passed all filters */
  passed: boolean;
  /** Reason for rejection (if failed) */
  rejectionReason?: FilterReason;
}

/**
 * Scored term candidate
 */
export interface ScoredCandidate {
  /** The extracted text */
  text: string;
  /** Pattern type that matched */
  patternType: PatternType;
  /** Start position in the text node */
  start: number;
  /** End position in the text node */
  end: number;
  /** Surrounding context text */
  context: string;
  /** XPath to the DOM element */
  xpath: string;
  /** Calculated score (0-1) */
  score: number;
  /** Detailed scoring breakdown */
  scoreBreakdown: {
    [key in ScoringFactor]: number;
  };
}

/**
 * Ranked term candidate (final output)
 */
export interface RankedCandidate {
  /** The extracted text */
  text: string;
  /** Calculated score (0-1) */
  score: number;
  /** Pattern type that matched */
  reason: PatternType;
  /** Start position in the text node */
  start: number;
  /** End position in the text node */
  end: number;
  /** Surrounding context text */
  context: string;
  /** XPath to the DOM element */
  xpath: string;
}

/**
 * Extraction configuration
 */
export interface ExtractionConfig {
  /** Maximum number of candidates to return */
  maxCandidates: number;
  /** Minimum term length */
  minTermLength: number;
  /** Maximum term length */
  maxTermLength: number;
  /** Whether to enable stop word filtering */
  enableStopWordFilter: boolean;
  /** Minimum score threshold */
  minScoreThreshold: number;
  /** Context window size (characters) */
  contextWindowSize: number;
}

/**
 * Extraction result
 */
export interface ExtractionResult {
  /** Ranked term candidates */
  candidates: RankedCandidate[];
  /** Total candidates extracted */
  totalExtracted: number;
  /** Candidates after filtering */
  afterFiltering: number;
  /** Candidates after scoring */
  afterScoring: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  /** Matched text */
  text: string;
  /** Pattern type */
  patternType: PatternType;
  /** Start index */
  start: number;
  /** End index */
  end: number;
}

/**
 * Text node input for extraction
 */
export interface TextInput {
  /** Text content */
  text: string;
  /** XPath to the element */
  xpath: string;
  /** Element reference (optional) */
  element?: Node;
}
