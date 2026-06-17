/**
 * Candidate Filtering Logic
 * 
 * This module filters out irrelevant term candidates based on various criteria.
 * NO large dictionaries or glossaries are used - only pattern-based filtering.
 * Stop words are limited to 100 common words maximum.
 */

import { RawCandidate, FilteredCandidate, FilterReason } from './types';

/**
 * Minimal stop words list (under 100 words)
 * These are the most common English words that are unlikely to be technical terms.
 */
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
]);

/**
 * URL pattern for detection
 */
const URL_PATTERN = /^(https?:\/\/|www\.)[^\s]+$/i;

/**
 * Email pattern for detection
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Check if text is too short
 * 
 * @param text - Text to check
 * @param minLength - Minimum allowed length
 * @returns True if text is too short
 */
function isTooShort(text: string, minLength: number = 2): boolean {
  return text.length < minLength;
}

/**
 * Check if text contains only numbers
 * 
 * @param text - Text to check
 * @returns True if text is numeric only
 */
function isNumericOnly(text: string): boolean {
  return /^\d+$/.test(text);
}

/**
 * Check if text is a URL
 * 
 * @param text - Text to check
 * @returns True if text is a URL
 */
function isUrl(text: string): boolean {
  return URL_PATTERN.test(text);
}

/**
 * Check if text is an email
 * 
 * @param text - Text to check
 * @returns True if text is an email
 */
function isEmail(text: string): boolean {
  return EMAIL_PATTERN.test(text);
}

/**
 * Check if text is a stop word
 * 
 * @param text - Text to check (case-insensitive)
 * @returns True if text is a stop word
 */
function isStopWord(text: string): boolean {
  return STOP_WORDS.has(text.toLowerCase());
}

/**
 * Check if text is too common/generic
 * This uses pattern-based heuristics, not a dictionary
 * 
 * @param text - Text to check
 * @returns True if text is too common
 */
function isTooCommon(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Single character words (except specific technical ones)
  if (text.length === 1 && !/^[A-Z]$/.test(text)) {
    return true;
  }
  
  // Very common 2-letter words that aren't technical
  const commonTwoLetter = ['is', 'it', 'in', 'on', 'at', 'to', 'by', 'of', 'as', 'if'];
  if (text.length === 2 && commonTwoLetter.includes(lowerText)) {
    return true;
  }
  
  // Words with all same character (e.g., 'aaa', '111')
  if (/^(.)\1+$/.test(text)) {
    return true;
  }
  
  return false;
}

/**
 * Check if pattern is invalid
 * 
 * @param text - Text to check
 * @returns True if pattern is invalid
 */
function hasInvalidPattern(text: string): boolean {
  // Contains only special characters
  if (!/[a-zA-Z0-9]/.test(text)) {
    return true;
  }
  
  // Starts or ends with non-alphanumeric (except specific patterns)
  if (!/^[a-zA-Z0-9]/.test(text) || !/[a-zA-Z0-9]$/.test(text)) {
    return true;
  }
  
  return false;
}

/**
 * Filter a single candidate
 * 
 * @param candidate - Raw candidate to filter
 * @param config - Filtering configuration
 * @returns Filtered candidate with pass/fail status
 */
export function filterCandidate(
  candidate: RawCandidate,
  config: {
    minTermLength?: number;
    maxTermLength?: number;
    enableStopWordFilter?: boolean;
  } = {}
): FilteredCandidate {
  const {
    minTermLength = 2,
    maxTermLength = 50,
    enableStopWordFilter = true,
  } = config;

  const text = candidate.text;

  // Check length constraints
  if (isTooShort(text, minTermLength)) {
    return {
      ...candidate,
      passed: false,
      rejectionReason: 'too_short',
    };
  }

  if (text.length > maxTermLength) {
    return {
      ...candidate,
      passed: false,
      rejectionReason: 'too_short', // Using same reason for too long
    };
  }

  // Check for numeric only
  if (isNumericOnly(text)) {
    return {
      ...candidate,
      passed: false,
      rejectionReason: 'numeric_only',
    };
  }

  // Check for URL
  if (isUrl(text)) {
    return {
      ...candidate,
      passed: false,
      rejectionReason: 'url',
    };
  }

  // Check for email
  if (isEmail(text)) {
    return {
      ...candidate,
      passed: false,
      rejectionReason: 'email',
    };
  }

  // Check for stop words (if enabled)
  if (enableStopWordFilter && isStopWord(text)) {
    return {
      ...candidate,
      passed: false,
      rejectionReason: 'stop_word',
    };
  }

  // Check for too common words
  if (isTooCommon(text)) {
    return {
      ...candidate,
      passed: false,
      rejectionReason: 'too_common',
    };
  }

  // Check for invalid patterns
  if (hasInvalidPattern(text)) {
    return {
      ...candidate,
      passed: false,
      rejectionReason: 'invalid_pattern',
    };
  }

  // Candidate passed all filters
  return {
    ...candidate,
    passed: true,
  };
}

/**
 * Filter multiple candidates
 * 
 * @param candidates - Array of raw candidates to filter
 * @param config - Filtering configuration
 * @returns Array of filtered candidates
 */
export function filterCandidates(
  candidates: RawCandidate[],
  config: {
    minTermLength?: number;
    maxTermLength?: number;
    enableStopWordFilter?: boolean;
  } = {}
): FilteredCandidate[] {
  return candidates.map(candidate => filterCandidate(candidate, config));
}

/**
 * Get only candidates that passed all filters
 * 
 * @param filteredCandidates - Array of filtered candidates
 * @returns Array of candidates that passed
 */
export function getPassedCandidates(filteredCandidates: FilteredCandidate[]): FilteredCandidate[] {
  return filteredCandidates.filter(c => c.passed);
}

/**
 * Get candidates that failed filters, grouped by rejection reason
 * 
 * @param filteredCandidates - Array of filtered candidates
 * @returns Map of rejection reason to count
 */
export function getRejectionStats(filteredCandidates: FilteredCandidate[]): Map<FilterReason, number> {
  const stats = new Map<FilterReason, number>();
  
  for (const candidate of filteredCandidates) {
    if (!candidate.passed && candidate.rejectionReason) {
      const current = stats.get(candidate.rejectionReason) || 0;
      stats.set(candidate.rejectionReason, current + 1);
    }
  }
  
  return stats;
}

/**
 * Get custom stop words set (for testing or customization)
 * 
 * @returns Set of stop words
 */
export function getStopWords(): Set<string> {
  return new Set(STOP_WORDS);
}

/**
 * Add custom stop words (for customization)
 * Note: This is limited to maintain the constraint of < 100 stop words
 * 
 * @param words - Words to add
 * @returns New set of stop words (will not exceed 100)
 */
export function addStopWords(words: string[]): Set<string> {
  const newSet = new Set(STOP_WORDS);
  let count = newSet.size;
  
  for (const word of words) {
    if (count >= 100) break;
    newSet.add(word.toLowerCase());
    count++;
  }
  
  return newSet;
}
