/**
 * Text Node Collector
 * 
 * Converts text nodes to TextInput format for term extraction.
 * Generates XPath for each text node.
 * 
 * Time Complexity: O(N) where N is the number of text nodes
 */

import { TextInput } from '../term-engine/types';

/**
 * Collector configuration
 */
export interface CollectorConfig {
  /** Maximum text length per node (0 = unlimited) */
  maxTextLength?: number;
  /** Whether to trim whitespace */
  trimWhitespace?: boolean;
  /** Whether to include node reference */
  includeNodeRef?: boolean;
}

/**
 * Collected text input with metadata
 */
export interface CollectedInput extends TextInput {
  /** Original text node reference */
  node: Text;
  /** Character offset in parent element */
  offset?: number;
}

/**
 * Collector result
 */
export interface CollectorResult {
  /** Collected inputs */
  inputs: CollectedInput[];
  /** Total characters collected */
  totalCharacters: number;
  /** Processing time in milliseconds */
  processingTime: number;
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
 * Get character offset of text node within its parent
 * 
 * @param node - Text node
 * @returns Character offset
 */
function getTextOffset(node: Text): number {
  let offset = 0;
  let sibling = node.previousSibling;
  
  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE) {
      offset += (sibling as Text).textContent?.length || 0;
    }
    sibling = sibling.previousSibling;
  }
  
  return offset;
}

/**
 * Text Node Collector class
 */
export class TextNodeCollector {
  private config: CollectorConfig;

  constructor(config: CollectorConfig = {}) {
    this.config = {
      maxTextLength: config.maxTextLength || 0,
      trimWhitespace: config.trimWhitespace !== false,
      includeNodeRef: config.includeNodeRef !== false,
    };
  }

  /**
   * Collect text nodes and convert to TextInput format
   * 
   * @param textNodes - Array of text nodes
   * @returns Array of collected inputs
   */
  collect(textNodes: Text[]): CollectedInput[] {
    const inputs: CollectedInput[] = [];
    
    for (const node of textNodes) {
      const input = this.convertNode(node);
      if (input) {
        inputs.push(input);
      }
    }
    
    return inputs;
  }

  /**
   * Collect with detailed statistics
   * 
   * @param textNodes - Array of text nodes
   * @returns Collector result with statistics
   */
  collectWithStats(textNodes: Text[]): CollectorResult {
    const startTime = performance.now();
    const inputs: CollectedInput[] = [];
    let totalCharacters = 0;
    
    for (const node of textNodes) {
      const input = this.convertNode(node);
      if (input) {
        inputs.push(input);
        totalCharacters += input.text.length;
      }
    }
    
    const endTime = performance.now();
    
    return {
      inputs,
      totalCharacters,
      processingTime: endTime - startTime,
    };
  }

  /**
   * Convert a single text node to TextInput format
   * 
   * @param node - Text node
   * @returns Collected input or null if invalid
   */
  private convertNode(node: Text): CollectedInput | null {
    let text = node.textContent || '';
    
    // Trim whitespace if configured
    if (this.config.trimWhitespace) {
      text = text.trim();
    }
    
    // Skip empty text
    if (text.length === 0) {
      return null;
    }
    
    // Truncate if max length is set
    if (this.config.maxTextLength && this.config.maxTextLength > 0) {
      text = text.slice(0, this.config.maxTextLength);
    }
    
    // Get parent element
    const parent = node.parentElement;
    if (!parent) {
      return null;
    }
    
    // Generate XPath
    const xpath = getXPath(parent);
    
    // Get text offset
    const offset = getTextOffset(node);
    
    return {
      text,
      xpath,
      node: this.config.includeNodeRef ? node : ({} as Text),
      offset,
    };
  }

  /**
   * Update collector configuration
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<CollectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * 
   * @returns Current configuration
   */
  getConfig(): CollectorConfig {
    return { ...this.config };
  }
}

/**
 * Collect text nodes (convenience function)
 * 
 * @param textNodes - Array of text nodes
 * @param config - Collector configuration
 * @returns Array of collected inputs
 */
export function collectTextNodes(
  textNodes: Text[],
  config: CollectorConfig = {}
): CollectedInput[] {
  const collector = new TextNodeCollector(config);
  return collector.collect(textNodes);
}

/**
 * Collect text nodes with statistics (convenience function)
 * 
 * @param textNodes - Array of text nodes
 * @param config - Collector configuration
 * @returns Collector result with statistics
 */
export function collectTextNodesWithStats(
  textNodes: Text[],
  config: CollectorConfig = {}
): CollectorResult {
  const collector = new TextNodeCollector(config);
  return collector.collectWithStats(textNodes);
}
