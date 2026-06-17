/**
 * Main Term Extraction Engine
 * 
 * This module orchestrates the entire term extraction pipeline:
 * 1. Extract candidates using regex patterns
 * 2. Filter out irrelevant candidates
 * 3. Score remaining candidates
 * 4. Rank and select top candidates
 * 
 * This is a pattern-based extraction engine - NO dictionaries or glossaries are used.
 * The engine identifies potential technical terms based on structural patterns.
 */

import { TextInput, ExtractionConfig, ExtractionResult, RawCandidate } from './types';
import { extractAllMatches } from './patterns';
import { filterCandidates, getPassedCandidates } from './filters';
import { scoreCandidates } from './scorer';
import { rankCandidates, getRankingStats } from './ranking';

/**
 * Default extraction configuration
 */
const DEFAULT_CONFIG: ExtractionConfig = {
  maxCandidates: 20,
  minTermLength: 2,
  maxTermLength: 50,
  enableStopWordFilter: true,
  minScoreThreshold: 0.5,
  contextWindowSize: 100,
};

/**
 * Extract context around a match
 * 
 * @param text - Full text
 * @param start - Match start position
 * @param end - Match end position
 * @param windowSize - Context window size in characters
 * @returns Context string
 */
function extractContext(
  text: string,
  start: number,
  end: number,
  windowSize: number
): string {
  const contextStart = Math.max(0, start - windowSize);
  const contextEnd = Math.min(text.length, end + windowSize);
  
  return text.slice(contextStart, contextEnd).trim();
}

/**
 * Convert pattern matches to raw candidates with context
 * 
 * @param matches - Pattern matches
 * @param textInput - Text input with metadata
 * @param config - Extraction configuration
 * @returns Array of raw candidates
 */
function matchesToCandidates(
  matches: any[],
  textInput: TextInput,
  config: ExtractionConfig
): RawCandidate[] {
  const candidates: RawCandidate[] = [];
  
  for (const match of matches) {
    const context = extractContext(
      textInput.text,
      match.start,
      match.end,
      config.contextWindowSize
    );
    
    candidates.push({
      text: match.text,
      patternType: match.patternType,
      start: match.start,
      end: match.end,
      context,
      xpath: textInput.xpath,
    });
  }
  
  return candidates;
}

/**
 * Extract terms from a single text input
 * 
 * @param textInput - Text input with metadata
 * @param config - Extraction configuration
 * @returns Extraction result
 */
export function extractTerms(
  textInput: TextInput,
  config: Partial<ExtractionConfig> = {}
): ExtractionResult {
  const startTime = performance.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Step 1: Extract candidates using patterns
  const matches = extractAllMatches(textInput.text);
  const rawCandidates = matchesToCandidates(matches, textInput, finalConfig);
  
  // Step 2: Filter candidates
  const filteredCandidates = filterCandidates(rawCandidates, {
    minTermLength: finalConfig.minTermLength,
    maxTermLength: finalConfig.maxTermLength,
    enableStopWordFilter: finalConfig.enableStopWordFilter,
  });
  
  const passedCandidates = getPassedCandidates(filteredCandidates);
  
  // Step 3: Score candidates
  const scoredCandidates = scoreCandidates(passedCandidates, textInput.text.length);
  
  // Step 4: Rank and select top candidates
  const rankedCandidates = rankCandidates(scoredCandidates, {
    maxCandidates: finalConfig.maxCandidates,
    minScoreThreshold: finalConfig.minScoreThreshold,
    enableDeduplication: true,
    similarityThreshold: 0.85,
  });
  
  const endTime = performance.now();
  
  return {
    candidates: rankedCandidates,
    totalExtracted: rawCandidates.length,
    afterFiltering: passedCandidates.length,
    afterScoring: scoredCandidates.length,
    processingTime: endTime - startTime,
  };
}

/**
 * Extract terms from multiple text inputs
 * 
 * @param textInputs - Array of text inputs
 * @param config - Extraction configuration
 * @returns Extraction result
 */
export function extractTermsFromMultiple(
  textInputs: TextInput[],
  config: Partial<ExtractionConfig> = {}
): ExtractionResult {
  const startTime = performance.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const allRawCandidates: RawCandidate[] = [];
  
  // Extract from all text inputs
  for (const textInput of textInputs) {
    const matches = extractAllMatches(textInput.text);
    const candidates = matchesToCandidates(matches, textInput, finalConfig);
    allRawCandidates.push(...candidates);
  }
  
  // Filter all candidates
  const filteredCandidates = filterCandidates(allRawCandidates, {
    minTermLength: finalConfig.minTermLength,
    maxTermLength: finalConfig.maxTermLength,
    enableStopWordFilter: finalConfig.enableStopWordFilter,
  });
  
  const passedCandidates = getPassedCandidates(filteredCandidates);
  
  // Score all candidates
  const totalTextLength = textInputs.reduce((sum, ti) => sum + ti.text.length, 0);
  const scoredCandidates = scoreCandidates(passedCandidates, totalTextLength);
  
  // Rank and select top candidates
  const rankedCandidates = rankCandidates(scoredCandidates, {
    maxCandidates: finalConfig.maxCandidates,
    minScoreThreshold: finalConfig.minScoreThreshold,
    enableDeduplication: true,
    similarityThreshold: 0.85,
  });
  
  const endTime = performance.now();
  
  return {
    candidates: rankedCandidates,
    totalExtracted: allRawCandidates.length,
    afterFiltering: passedCandidates.length,
    afterScoring: scoredCandidates.length,
    processingTime: endTime - startTime,
  };
}

/**
 * Extract terms from a DOM element
 * 
 * @param element - DOM element to extract from
 * @param config - Extraction configuration
 * @returns Extraction result
 */
export function extractTermsFromElement(
  element: Element,
  config: Partial<ExtractionConfig> = {}
): ExtractionResult {
  const text = element.textContent || '';
  const xpath = getXPath(element);
  
  const textInput: TextInput = {
    text,
    xpath,
    element,
  };
  
  return extractTerms(textInput, config);
}

/**
 * Get XPath for an element
 * 
 * @param element - DOM element
 * @returns XPath string
 */
function getXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  const parts: string[] = [];
  let current: Element | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as Element).tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = current.tagName.toLowerCase();
    const pathIndex = index > 0 ? `[${index + 1}]` : '';
    parts.unshift(`${tagName}${pathIndex}`);
    
    current = current.parentElement;
  }
  
  return parts.length ? `/${parts.join('/')}` : '';
}

/**
 * Extract terms from the entire document
 * 
 * @param config - Extraction configuration
 * @returns Extraction result
 */
export function extractTermsFromDocument(
  config: Partial<ExtractionConfig> = {}
): ExtractionResult {
  const startTime = performance.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Get all text nodes from the document
  const textInputs = getTextNodes(document.body);
  
  const result = extractTermsFromMultiple(textInputs, finalConfig);
  
  const endTime = performance.now();
  
  return {
    ...result,
    processingTime: endTime - startTime,
  };
}

/**
 * Get all text nodes from an element
 * 
 * @param root - Root element
 * @returns Array of text inputs
 */
function getTextNodes(root: Element): TextInput[] {
  const textInputs: TextInput[] = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip empty text nodes
        if (!node.textContent || node.textContent.trim().length === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip script and style content
        const parent = node.parentElement;
        if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
  
  let node;
  while ((node = walker.nextNode())) {
    const element = node.parentElement;
    if (element) {
      textInputs.push({
        text: node.textContent || '',
        xpath: getXPath(element),
        element,
      });
    }
  }
  
  return textInputs;
}

/**
 * Get extraction statistics
 * 
 * @param result - Extraction result
 * @returns Statistics object
 */
export function getExtractionStats(result: ExtractionResult) {
  const rankingStats = getRankingStats(result.candidates);
  
  return {
    ...rankingStats,
    processingTime: result.processingTime,
    filterRate: result.totalExtracted > 0
      ? (result.afterFiltering / result.totalExtracted) * 100
      : 0,
    scoreRate: result.afterFiltering > 0
      ? (result.afterScoring / result.afterFiltering) * 100
      : 0,
  };
}

/**
 * Validate extraction configuration
 * 
 * @param config - Configuration to validate
 * @returns True if valid
 */
export function validateConfig(config: Partial<ExtractionConfig>): boolean {
  if (config.maxCandidates !== undefined && config.maxCandidates < 1) {
    return false;
  }
  
  if (config.minTermLength !== undefined && config.minTermLength < 1) {
    return false;
  }
  
  if (config.maxTermLength !== undefined && config.minTermLength !== undefined && config.maxTermLength < config.minTermLength) {
    return false;
  }
  
  if (config.minScoreThreshold !== undefined && (config.minScoreThreshold < 0 || config.minScoreThreshold > 1)) {
    return false;
  }
  
  if (config.contextWindowSize !== undefined && config.contextWindowSize < 0) {
    return false;
  }
  
  return true;
}
