/**
 * Extraction Pipeline
 * 
 * Orchestrates the entire term extraction process:
 * 1. DOM Walker - Traverse DOM and collect text nodes
 * 2. Collector - Convert text nodes to TextInput format
 * 3. Term Extraction Engine - Extract term candidates
 * 4. Mutation Observer - Handle dynamic content updates
 * 
 * Time Complexity: O(N + k log k) where N is DOM nodes, k is candidates
 */

import { DOMWalker, WalkResult } from '../dom/walker';
import { TextNodeCollector, CollectorResult, CollectedInput } from '../dom/collector';
import { DOMMutationObserver, ObserverConfig, ObserverStats } from '../dom/observer';
import { extractTermsFromMultiple, ExtractionConfig, ExtractionResult } from '../term-engine';
import { TextInput } from '../term-engine/types';

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  /** Root element for traversal */
  root?: Element;
  /** Walker configuration */
  walkerConfig?: {
    includeHidden?: boolean;
    maxDepth?: number;
  };
  /** Collector configuration */
  collectorConfig?: {
    maxTextLength?: number;
    trimWhitespace?: boolean;
    includeNodeRef?: boolean;
  };
  /** Observer configuration */
  observerConfig?: {
    debounceDelay?: number;
    subtree?: boolean;
    attributes?: boolean;
    characterData?: boolean;
    childList?: boolean;
  };
  /** Extraction configuration */
  extractionConfig?: ExtractionConfig;
  /** Whether to enable automatic mutation observation */
  enableObserver?: boolean;
}

/**
 * Pipeline statistics
 */
export interface PipelineStats {
  /** Walker statistics */
  walker: WalkResult;
  /** Collector statistics */
  collector: CollectorResult;
  /** Extraction result */
  extraction: ExtractionResult;
  /** Observer statistics */
  observer: ObserverStats;
  /** Total processing time */
  totalProcessingTime: number;
}

/**
 * Pipeline event types
 */
export type PipelineEventType =
  | 'extraction:start'
  | 'extraction:complete'
  | 'mutation:detected'
  | 'mutation:processed'
  | 'error';

/**
 * Pipeline event callback
 */
export type PipelineEventCallback = (event: {
  type: PipelineEventType;
  data?: any;
  error?: Error;
}) => void;

/**
 * Extraction Pipeline class
 */
export class ExtractionPipeline {
  private walker: DOMWalker;
  private collector: TextNodeCollector;
  private observer: DOMMutationObserver | null = null;
  private config: PipelineConfig;
  private isRunning: boolean = false;
  private eventCallbacks: Map<PipelineEventType, PipelineEventCallback[]> = new Map();

  constructor(config: PipelineConfig = {}) {
    const root = config.root || document.body;
    
    // Provide default extraction config with all required fields
    const defaultExtractionConfig: ExtractionConfig = {
      maxCandidates: 20,
      minTermLength: 2,
      maxTermLength: 50,
      enableStopWordFilter: true,
      minScoreThreshold: 0.5,
      contextWindowSize: 100,
    };
    
    this.config = {
      root,
      walkerConfig: config.walkerConfig || {},
      collectorConfig: config.collectorConfig || {},
      observerConfig: config.observerConfig || {},
      extractionConfig: config.extractionConfig || defaultExtractionConfig,
      enableObserver: config.enableObserver !== false,
    };

    // Initialize components
    this.walker = new DOMWalker({
      root,
      ...this.config.walkerConfig,
    });

    this.collector = new TextNodeCollector(this.config.collectorConfig);

    // Initialize observer if enabled
    if (this.config.enableObserver) {
      this.initializeObserver();
    }
  }

  /**
   * Initialize mutation observer
   */
  private initializeObserver(): void {
    this.observer = new DOMMutationObserver(
      (mutations) => this.handleMutations(mutations),
      {
        root: this.config.root,
        ...this.config.observerConfig,
      }
    );
  }

  /**
   * Handle DOM mutations
   * 
   * @param mutations - Mutation records
   */
  private handleMutations(mutations: MutationRecord[]): void {
    this.emit('mutation:detected', { mutations });
    
    // Re-run extraction after debounce
    this.runExtraction().then((result) => {
      this.emit('mutation:processed', { result });
    }).catch((error) => {
      this.emit('error', { error });
    });
  }

  /**
   * Run the extraction pipeline
   * 
   * @returns Extraction result
   */
  async runExtraction(): Promise<ExtractionResult> {
    this.emit('extraction:start');
    const startTime = performance.now();
    
    try {
      // Step 1: Walk DOM and collect text nodes
      const walkResult = this.walker.walkWithStats();
      
      // Step 2: Convert text nodes to TextInput format
      const collectorResult = this.collector.collectWithStats(walkResult.nodes);
      
      // Step 3: Extract terms using Term Extraction Engine
      const textInputs: TextInput[] = collectorResult.inputs.map(input => ({
        text: input.text,
        xpath: input.xpath,
      }));
      
      const extractionResult = extractTermsFromMultiple(
        textInputs,
        this.config.extractionConfig || {}
      );
      
      const endTime = performance.now();
      
      this.emit('extraction:complete', {
        result: extractionResult,
        stats: {
          walker: walkResult,
          collector: collectorResult,
          extraction: extractionResult,
          totalProcessingTime: endTime - startTime,
        },
      });
      
      return extractionResult;
    } catch (error) {
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * Run extraction with detailed statistics
   * 
   * @returns Pipeline statistics
   */
  async runWithStats(): Promise<PipelineStats> {
    const startTime = performance.now();
    
    // Step 1: Walk DOM
    const walkResult = this.walker.walkWithStats();
    
    // Step 2: Collect
    const collectorResult = this.collector.collectWithStats(walkResult.nodes);
    
    // Step 3: Extract
    const textInputs: TextInput[] = collectorResult.inputs.map(input => ({
      text: input.text,
      xpath: input.xpath,
    }));
    
    const extractionResult = extractTermsFromMultiple(
      textInputs,
      this.config.extractionConfig || {}
    );
    
    // Step 4: Observer stats
    const observerStats = this.observer ? this.observer.getStats() : {
      totalMutations: 0,
      callbackInvocations: 0,
      skippedMutations: 0,
      isActive: false,
    };
    
    const endTime = performance.now();
    
    return {
      walker: walkResult,
      collector: collectorResult,
      extraction: extractionResult,
      observer: observerStats,
      totalProcessingTime: endTime - startTime,
    };
  }

  /**
   * Start the pipeline
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start observer if enabled
    if (this.observer && this.config.enableObserver) {
      this.observer.start();
    }

    // Run initial extraction
    this.runExtraction().catch((error) => {
      console.error('Initial extraction failed:', error);
    });
  }

  /**
   * Stop the pipeline
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop observer
    if (this.observer) {
      this.observer.stop();
    }
  }

  /**
   * Disconnect and clean up resources
   */
  disconnect(): void {
    this.stop();
    
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.eventCallbacks.clear();
  }

  /**
   * Register event callback
   * 
   * @param eventType - Event type
   * @param callback - Callback function
   */
  on(eventType: PipelineEventType, callback: PipelineEventCallback): void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType)!.push(callback);
  }

  /**
   * Unregister event callback
   * 
   * @param eventType - Event type
   * @param callback - Callback function
   */
  off(eventType: PipelineEventType, callback: PipelineEventCallback): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all registered callbacks
   * 
   * @param eventType - Event type
   * @param data - Event data
   */
  private emit(eventType: PipelineEventType, data?: any): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback({ type: eventType, data });
        } catch (error) {
          console.error(`Error in ${eventType} callback:`, error);
        }
      }
    }
  }

  /**
   * Check if pipeline is running
   * 
   * @returns True if running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Update pipeline configuration
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.config = { ...this.config, ...config };
    
    // Update walker config
    if (config.walkerConfig) {
      this.walker = new DOMWalker({
        root: this.config.root || document.body,
        ...this.config.walkerConfig,
      });
    }
    
    // Update collector config
    if (config.collectorConfig) {
      this.collector.updateConfig(this.config.collectorConfig || {});
    }
    
    // Update observer config
    if (config.observerConfig && this.observer) {
      this.observer.updateConfig(this.config.observerConfig || {});
    }
    
    // Re-initialize observer if enableObserver changed
    if (config.enableObserver !== undefined) {
      if (config.enableObserver && !this.observer) {
        this.initializeObserver();
      } else if (!config.enableObserver && this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
    
    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Get current configuration
   * 
   * @returns Current configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Get pipeline statistics
   * 
   * @returns Pipeline statistics
   */
  async getStats(): Promise<PipelineStats> {
    return this.runWithStats();
  }
}

/**
 * Create and start an extraction pipeline (convenience function)
 * 
 * @param config - Pipeline configuration
 * @returns ExtractionPipeline instance
 */
export function createPipeline(config: PipelineConfig = {}): ExtractionPipeline {
  const pipeline = new ExtractionPipeline(config);
  pipeline.start();
  return pipeline;
}
