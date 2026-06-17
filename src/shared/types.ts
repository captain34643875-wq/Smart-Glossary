/**
 * Shared Types for Smart Glossary
 * 
 * Type definitions used across background, content, and UI modules.
 */

/**
 * Explanation result from AI provider
 */
export interface ExplanationResult {
  /** The explanation text */
  explanation: string;
  /** Provider that generated the explanation */
  provider: string;
  /** Timestamp of generation */
  timestamp: number;
  /** Whether the explanation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Selection information
 */
export interface SelectionInfo {
  /** Selected text */
  text: string;
  /** Tab ID where selection was made */
  tabId: number;
  /** Frame ID (0 for top frame) */
  frameId: number;
  /** URL of the page */
  url: string;
  /** Timestamp of selection */
  timestamp: number;
}

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
  /** Provider type (openai, gemini) */
  type: 'openai' | 'gemini';
  /** API key */
  apiKey: string;
  /** Model name */
  model?: string;
  /** API endpoint (optional, for custom endpoints) */
  endpoint?: string;
}

/**
 * Modal state
 */
export type ModalState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Modal data
 */
export interface ModalData {
  /** Current state */
  state: ModalState;
  /** Selected term */
  term?: string;
  /** Explanation result */
  result?: ExplanationResult;
  /** Error message */
  error?: string;
}

/**
 * Message types for extension communication
 */
export type MessageType =
  | 'EXPLAIN_SELECTION'
  | 'EXPLANATION_RESULT'
  | 'OPEN_MODAL'
  | 'CLOSE_MODAL'
  | 'GET_SELECTION';

/**
 * Base message structure
 */
export interface BaseMessage {
  type: MessageType;
}

/**
 * Explain selection message
 */
export interface ExplainSelectionMessage extends BaseMessage {
  type: 'EXPLAIN_SELECTION';
  selection: SelectionInfo;
}

/**
 * Explanation result message
 */
export interface ExplanationResultMessage extends BaseMessage {
  type: 'EXPLANATION_RESULT';
  result: ExplanationResult;
}

/**
 * Open modal message
 */
export interface OpenModalMessage extends BaseMessage {
  type: 'OPEN_MODAL';
  data: ModalData;
}

/**
 * Close modal message
 */
export interface CloseModalMessage extends BaseMessage {
  type: 'CLOSE_MODAL';
}

/**
 * Get selection message
 */
export interface GetSelectionMessage extends BaseMessage {
  type: 'GET_SELECTION';
}

/**
 * Union of all message types
 */
export type ExtensionMessage =
  | ExplainSelectionMessage
  | ExplanationResultMessage
  | OpenModalMessage
  | CloseModalMessage
  | GetSelectionMessage;
