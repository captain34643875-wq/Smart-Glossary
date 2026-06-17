/**
 * Regex Pattern Definitions for Term Extraction
 * 
 * This module defines regex patterns for extracting potential term candidates
 * from text. NO actual term lists or dictionaries are used - only patterns.
 * 
 * Patterns are designed to identify structural characteristics that suggest
 * a term might be technical or domain-specific, without hardcoding specific terms.
 */

import { PatternType, PatternMatch } from './types';

/**
 * Pattern definition with regex and metadata
 */
interface PatternDefinition {
  /** Regex pattern for matching */
  regex: RegExp;
  /** Pattern type identifier */
  type: PatternType;
  /** Description of what this pattern matches */
  description: string;
  /** Priority for overlapping matches (higher = preferred) */
  priority: number;
}

/**
 * Acronym Pattern
 * Matches all-caps abbreviations like API, HTTP, JSON, REST
 * - 2+ consecutive uppercase letters
 * - Not part of a longer word
 */
const ACRONYM_PATTERN: PatternDefinition = {
  regex: /\b[A-Z]{2,}\b/g,
  type: 'acronym',
  description: 'All-caps abbreviations (e.g., API, HTTP, JSON)',
  priority: 3,
};

/**
 * PascalCase Pattern
 * Matches PascalCase identifiers like ReactComponent, MachineLearning
 * - Starts with uppercase
 * - Contains at least one lowercase letter
 * - Multiple words concatenated without spaces
 */
const PASCAL_CASE_PATTERN: PatternDefinition = {
  regex: /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g,
  type: 'pascal_case',
  description: 'PascalCase identifiers (e.g., ReactComponent, MachineLearning)',
  priority: 4,
};

/**
 * camelCase Pattern
 * Matches camelCase identifiers like useState, componentDidMount
 * - Starts with lowercase
 * - Contains at least one uppercase letter
 * - Multiple words concatenated without spaces
 */
const CAMEL_CASE_PATTERN: PatternDefinition = {
  regex: /\b[a-z]+(?:[A-Z][a-z]+)+\b/g,
  type: 'camel_case',
  description: 'camelCase identifiers (e.g., useState, componentDidMount)',
  priority: 3,
};

/**
 * kebab-case Pattern
 * Matches kebab-case identifiers like term-engine, user-profile
 * - Words separated by hyphens
 * - At least 2 words
 * - Alphanumeric characters only
 */
const KEBAB_CASE_PATTERN: PatternDefinition = {
  regex: /\b[a-z]+(?:-[a-z]+)+\b/g,
  type: 'kebab_case',
  description: 'kebab-case identifiers (e.g., term-engine, user-profile)',
  priority: 2,
};

/**
 * Version String Pattern
 * Matches version numbers like v1.0, 2.5.3, 1.0.0-beta
 * - Optional 'v' prefix
 * - Semantic versioning format
 */
const VERSION_PATTERN: PatternDefinition = {
  regex: /\b[vV]?\d+(?:\.\d+)+(?:-[a-zA-Z0-9]+)?\b/g,
  type: 'version_string',
  description: 'Version strings (e.g., v1.0, 2.5.3, 1.0.0-beta)',
  priority: 2,
};

/**
 * Noun Phrase Pattern
 * Matches multi-word noun phrases that might be technical terms
 * - Starts with uppercase letter
 * - 2-4 words
 * - Each word starts with uppercase (title case)
 * - Common structure for technical terms
 */
const NOUN_PHRASE_PATTERN: PatternDefinition = {
  regex: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g,
  type: 'noun_phrase',
  description: 'Multi-word noun phrases (e.g., Machine Learning, Natural Language Processing)',
  priority: 5,
};

/**
 * All pattern definitions
 * Ordered by priority (highest first) for overlapping match resolution
 */
const PATTERNS: PatternDefinition[] = [
  NOUN_PHRASE_PATTERN,
  PASCAL_CASE_PATTERN,
  ACRONYM_PATTERN,
  CAMEL_CASE_PATTERN,
  KEBAB_CASE_PATTERN,
  VERSION_PATTERN,
];

/**
 * Get all pattern definitions
 * 
 * @returns Array of pattern definitions
 */
export function getAllPatterns(): PatternDefinition[] {
  return [...PATTERNS];
}

/**
 * Get pattern by type
 * 
 * @param type - Pattern type to retrieve
 * @returns Pattern definition or undefined if not found
 */
export function getPatternByType(type: PatternType): PatternDefinition | undefined {
  return PATTERNS.find(p => p.type === type);
}

/**
 * Extract all matches from text using all patterns
 * 
 * @param text - Text to extract patterns from
 * @returns Array of pattern matches
 */
export function extractAllMatches(text: string): PatternMatch[] {
  const matches: PatternMatch[] = [];
  const matchSet = new Set<string>(); // Track unique matches by position

  for (const pattern of PATTERNS) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    
    while ((match = regex.exec(text)) !== null) {
      const matchKey = `${match.index}-${match[0]}`;
      
      // Skip if this position is already matched by a higher priority pattern
      if (matchSet.has(matchKey)) {
        continue;
      }
      
      matches.push({
        text: match[0],
        patternType: pattern.type,
        start: match.index,
        end: match.index + match[0].length,
      });
      
      matchSet.add(matchKey);
    }
  }
  
  // Sort by start position
  return matches.sort((a, b) => a.start - b.start);
}

/**
 * Extract matches from text using a specific pattern
 * 
 * @param text - Text to extract patterns from
 * @param patternType - Pattern type to use
 * @returns Array of pattern matches
 */
export function extractMatchesByPattern(
  text: string,
  patternType: PatternType
): PatternMatch[] {
  const pattern = getPatternByType(patternType);
  if (!pattern) {
    return [];
  }
  
  const matches: PatternMatch[] = [];
  let match;
  const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      text: match[0],
      patternType: pattern.type,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  
  return matches;
}

/**
 * Test if text matches any pattern
 * 
 * @param text - Text to test
 * @returns True if text matches any pattern
 */
export function matchesAnyPattern(text: string): boolean {
  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Get pattern type for a given text
 * 
 * @param text - Text to identify pattern for
 * @returns Pattern type or undefined if no match
 */
export function identifyPatternType(text: string): PatternType | undefined {
  for (const pattern of PATTERNS) {
    const regex = new RegExp(`^${pattern.regex.source}$`, pattern.regex.flags);
    if (regex.test(text)) {
      return pattern.type;
    }
  }
  return undefined;
}
