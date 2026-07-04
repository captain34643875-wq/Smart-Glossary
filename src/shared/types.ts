/**
 * Shared Types for Smart Glossary
 * 
 * Type definitions used across background, content, and UI modules.
 */

/**
 * Explanation result from AI provider
 */
export interface ExplanationResult {
  /** Term that was explained */
  term?: string;
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

export interface ExplanationRequest {
  term: string;
  contextBefore?: string;
  contextAfter?: string;
  url?: string;
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
  /** Text near the selection before the selected text */
  contextBefore?: string;
  /** Text near the selection after the selected text */
  contextAfter?: string;
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
export type ModalState = 'loading' | 'success' | 'error';

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
  | 'EXPLANATION_LOADING'
  | 'EXPLANATION_RESULT'
  | 'GET_SELECTION';

/**
 * Base message structure
 */
export interface BaseMessage {
  type: MessageType;
}

/**
 * Explanation result message
 */
export interface ExplanationResultMessage extends BaseMessage {
  type: 'EXPLANATION_RESULT';
  result: ExplanationResult;
}

export interface ExplanationLoadingMessage extends BaseMessage {
  type: 'EXPLANATION_LOADING';
  term: string;
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
  | ExplanationLoadingMessage
  | ExplanationResultMessage
  | GetSelectionMessage;
