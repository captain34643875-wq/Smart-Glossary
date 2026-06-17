/**
 * DOM Mutation Observer
 * 
 * Monitors DOM changes and triggers callbacks with debouncing.
 * Supports dynamic page content updates.
 * 
 * Time Complexity: O(1) for setup, O(M) for mutation handling where M is number of mutations
 */

/**
 * Observer configuration
 */
export interface ObserverConfig {
  /** Root element to observe */
  root?: Element;
  /** Debounce delay in milliseconds */
  debounceDelay?: number;
  /** Whether to observe subtree */
  subtree?: boolean;
  /** Whether to observe attribute changes */
  attributes?: boolean;
  /** Whether to observe character data changes */
  characterData?: boolean;
  /** Whether to observe child list changes */
  childList?: boolean;
}

/**
 * Mutation callback type
 */
export type MutationCallback = (mutations: MutationRecord[]) => void;

/**
 * Observer statistics
 */
export interface ObserverStats {
  /** Total mutations observed */
  totalMutations: number;
  /** Callback invocations */
  callbackInvocations: number;
  /** Skipped mutations (debounced) */
  skippedMutations: number;
  /** Active state */
  isActive: boolean;
}

/**
 * DOM Mutation Observer class with debouncing
 */
export class DOMMutationObserver {
  private observer: MutationObserver | null = null;
  private debounceTimer: number | null = null;
  private pendingMutations: MutationRecord[] = [];
  private callback: MutationCallback;
  private config: ObserverConfig;
  private stats: ObserverStats;
  private isActive: boolean = false;

  constructor(callback: MutationCallback, config: ObserverConfig = {}) {
    this.callback = callback;
    this.config = {
      root: config.root || document.body,
      debounceDelay: config.debounceDelay || 500,
      subtree: config.subtree !== false,
      attributes: config.attributes || false,
      characterData: config.characterData || true,
      childList: config.childList || true,
    };
    
    this.stats = {
      totalMutations: 0,
      callbackInvocations: 0,
      skippedMutations: 0,
      isActive: false,
    };
  }

  /**
   * Start observing DOM mutations
   */
  start(): void {
    if (this.isActive) {
      return;
    }

    const root = this.config.root || document.body;
    
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(root, {
      subtree: this.config.subtree,
      attributes: this.config.attributes,
      characterData: this.config.characterData,
      childList: this.config.childList,
    });

    this.isActive = true;
    this.stats.isActive = true;
  }

  /**
   * Stop observing DOM mutations
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    // Clear pending debounce timer
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      
      // Count pending mutations as skipped
      this.stats.skippedMutations += this.pendingMutations.length;
      this.pendingMutations = [];
    }

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.isActive = false;
    this.stats.isActive = false;
  }

  /**
   * Disconnect and clean up resources
   */
  disconnect(): void {
    this.stop();
    this.stats = {
      totalMutations: 0,
      callbackInvocations: 0,
      skippedMutations: 0,
      isActive: false,
    };
  }

  /**
   * Handle mutations with debouncing
   * 
   @param mutations - Array of mutation records
   */
  private handleMutations(mutations: MutationRecord[]): void {
    this.stats.totalMutations += mutations.length;
    this.pendingMutations.push(...mutations);

    // Clear existing timer
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer
    this.debounceTimer = window.setTimeout(() => {
      this.flushMutations();
    }, this.config.debounceDelay);
  }

  /**
   * Flush pending mutations and invoke callback
   */
  private flushMutations(): void {
    if (this.pendingMutations.length === 0) {
      return;
    }

    const mutationsToProcess = [...this.pendingMutations];
    this.pendingMutations = [];
    this.debounceTimer = null;

    this.stats.callbackInvocations++;
    
    try {
      this.callback(mutationsToProcess);
    } catch (error) {
      console.error('Error in mutation callback:', error);
    }
  }

  /**
   * Get observer statistics
   * 
   * @returns Observer statistics
   */
  getStats(): ObserverStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalMutations: 0,
      callbackInvocations: 0,
      skippedMutations: 0,
      isActive: this.isActive,
    };
  }

  /**
   * Check if observer is active
   * 
   * @returns True if active
   */
  isObserverActive(): boolean {
    return this.isActive;
  }

  /**
   * Update observer configuration
   * Note: Requires restart to take effect
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<ObserverConfig>): void {
    const wasActive = this.isActive;
    
    if (wasActive) {
      this.stop();
    }
    
    this.config = { ...this.config, ...config };
    
    if (wasActive) {
      this.start();
    }
  }

  /**
   * Get current configuration
   * 
   * @returns Current configuration
   */
  getConfig(): ObserverConfig {
    return { ...this.config };
  }
}

/**
 * Create a debounced mutation observer (convenience function)
 * 
 * @param callback - Mutation callback
 * @param config - Observer configuration
 * @returns DOMMutationObserver instance
 */
export function createMutationObserver(
  callback: MutationCallback,
  config: ObserverConfig = {}
): DOMMutationObserver {
  return new DOMMutationObserver(callback, config);
}

/**
 * Debounce utility function
 * 
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    if (timer !== null) {
      clearTimeout(timer);
    }
    
    timer = window.setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, delay);
  };
}
