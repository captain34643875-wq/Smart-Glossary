/**
 * DOM Walker
 * 
 * TreeWalker-based DOM traversal for collecting text nodes.
 * Excludes script, style, and other non-content elements.
 * 
 * Time Complexity: O(N) where N is the number of DOM nodes
 */

/**
 * Walker configuration
 */
export interface WalkerConfig {
  /** Root element to start traversal from */
  root?: Element;
  /** Whether to include hidden elements */
  includeHidden?: boolean;
  /** Maximum depth to traverse (0 = unlimited) */
  maxDepth?: number;
}

/**
 * Walk result
 */
export interface WalkResult {
  /** Total nodes visited */
  totalNodes: number;
  /** Text nodes collected */
  textNodes: number;
  /** Skipped nodes */
  skippedNodes: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Tags to exclude from traversal
 */
const EXCLUDED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'CODE',
  'PRE',
  'SVG',
  'MATH',
]);

/**
 * Check if an element should be excluded
 * 
 * @param element - Element to check
 * @param includeHidden - Whether to include hidden elements
 * @returns True if element should be excluded
 */
function shouldExcludeElement(element: Element, includeHidden: boolean): boolean {
  // Check tag name
  if (EXCLUDED_TAGS.has(element.tagName)) {
    return true;
  }
  
  // Check for hidden elements if configured
  if (!includeHidden) {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a text node should be included
 * 
 * @param node - Text node to check
 * @returns True if text node should be included
 */
function shouldIncludeTextNode(node: Text): boolean {
  // Skip empty text nodes
  if (!node.textContent || node.textContent.trim().length === 0) {
    return false;
  }
  
  // Skip whitespace-only nodes
  if (!node.textContent.trim()) {
    return false;
  }
  
  return true;
}

/**
 * DOM Walker class
 */
export class DOMWalker {
  private walker: TreeWalker | null = null;
  private root: Element;
  private config: WalkerConfig;
  private isWalking: boolean = false;

  constructor(config: WalkerConfig = {}) {
    this.root = config.root || document.body;
    this.config = {
      includeHidden: config.includeHidden || false,
      maxDepth: config.maxDepth || 0,
      root: this.root,
    };
  }

  /**
   * Walk the DOM tree and collect text nodes
   * 
   * @returns Array of text nodes
   */
  walk(): Text[] {
    const startTime = performance.now();
    const textNodes: Text[] = [];
    
    this.isWalking = true;
    
    try {
      // Create TreeWalker
      this.walker = document.createTreeWalker(
        this.root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (!this.isWalking) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Check if parent element should be excluded
            const parent = node.parentElement;
            if (parent && shouldExcludeElement(parent, this.config.includeHidden || false)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Check if text node should be included
            if (node.nodeType === Node.TEXT_NODE && shouldIncludeTextNode(node as Text)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            
            return NodeFilter.FILTER_REJECT;
          },
        }
      );
      
      // Traverse the tree
      let node;
      while ((node = this.walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node as Text);
        }
      }
    } finally {
      this.isWalking = false;
      this.walker = null;
    }
    
    const endTime = performance.now();
    
    return textNodes;
  }

  /**
   * Walk with detailed statistics
   * 
   * @returns Walk result with statistics
   */
  walkWithStats(): WalkResult & { nodes: Text[] } {
    const startTime = performance.now();
    const textNodes: Text[] = [];
    let totalNodes = 0;
    let skippedNodes = 0;
    
    this.isWalking = true;
    
    try {
      this.walker = document.createTreeWalker(
        this.root,
        NodeFilter.SHOW_ALL,
        {
          acceptNode: (node) => {
            if (!this.isWalking) {
              return NodeFilter.FILTER_REJECT;
            }
            
            totalNodes++;
            
            // Check if parent element should be excluded
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (shouldExcludeElement(element, this.config.includeHidden || false)) {
                skippedNodes++;
                return NodeFilter.FILTER_REJECT; // Skip subtree
              }
            }
            
            // Check if text node should be included
            if (node.nodeType === Node.TEXT_NODE && shouldIncludeTextNode(node as Text)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            
            return NodeFilter.FILTER_SKIP;
          },
        }
      );
      
      let node;
      while ((node = this.walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node as Text);
        }
      }
    } finally {
      this.isWalking = false;
      this.walker = null;
    }
    
    const endTime = performance.now();
    
    return {
      nodes: textNodes,
      totalNodes,
      textNodes: textNodes.length,
      skippedNodes,
      processingTime: endTime - startTime,
    };
  }

  /**
   * Stop the current walk operation
   */
  stop(): void {
    this.isWalking = false;
  }

  /**
   * Update the root element
   * 
   * @param root - New root element
   */
  setRoot(root: Element): void {
    this.root = root;
    this.config.root = root;
  }

  /**
   * Get the current root element
   * 
   * @returns Current root element
   */
  getRoot(): Element {
    return this.root;
  }

  /**
   * Check if currently walking
   * 
   * @returns True if walking
   */
  isActive(): boolean {
    return this.isWalking;
  }
}

/**
 * Walk a DOM tree and collect text nodes (convenience function)
 * 
 * @param config - Walker configuration
 * @returns Array of text nodes
 */
export function walkDOM(config: WalkerConfig = {}): Text[] {
  const walker = new DOMWalker(config);
  return walker.walk();
}

/**
 * Walk a DOM tree with statistics (convenience function)
 * 
 * @param config - Walker configuration
 * @returns Walk result with statistics
 */
export function walkDOMWithStats(config: WalkerConfig = {}): WalkResult & { nodes: Text[] } {
  const walker = new DOMWalker(config);
  return walker.walkWithStats();
}
