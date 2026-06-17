/**
 * Selection Handler
 * 
 * Handles text selection in the content script and communicates
 * with the background script for explanation requests.
 */

import { SelectionInfo, GetSelectionMessage, ExplanationResultMessage, OpenModalMessage } from '../shared/types';

/**
 * Get current selection from the page
 * 
 * @returns Selection information or null if no selection
 */
function getCurrentSelection(): SelectionInfo | null {
  const selection = window.getSelection();
  
  if (!selection || selection.isCollapsed) {
    return null;
  }
  
  const text = selection.toString().trim();
  
  if (!text) {
    return null;
  }
  
  return {
    text,
    tabId: 0, // Will be set by background script
    frameId: 0,
    url: window.location.href,
    timestamp: Date.now(),
  };
}

/**
 * Handle GET_SELECTION message from background script
 * 
 * @param message - Message from background script
 * @param sender - Message sender information
 * @param sendResponse - Response callback
 */
function handleGetSelection(
  message: GetSelectionMessage,
  sender: any,
  sendResponse: (response: SelectionInfo | null) => void
): void {
  const selection = getCurrentSelection();
  sendResponse(selection);
}

/**
 * Handle EXPLANATION_RESULT message from background script
 * 
 * @param message - Message from background script
 * @param sender - Message sender information
 * @param sendResponse - Response callback
 */
function handleExplanationResult(
  message: ExplanationResultMessage,
  sender: any,
  sendResponse: () => void
): void {
  // Open modal with explanation result
  const openModalMessage: OpenModalMessage = {
    type: 'OPEN_MODAL',
    data: {
      state: message.result.success ? 'success' : 'error',
      result: message.result,
      error: message.result.error,
    },
  };
  
  // Dispatch event to UI component
  window.dispatchEvent(new CustomEvent('smart-glossary:open-modal', {
    detail: openModalMessage,
  }));
  
  sendResponse();
}

/**
 * Set up message listeners
 */
export function setupSelectionHandler(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'GET_SELECTION':
        handleGetSelection(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      
      case 'EXPLANATION_RESULT':
        handleExplanationResult(message, sender, sendResponse);
        return true;
      
      default:
        sendResponse();
        return false;
    }
  });
}

/**
 * Initialize selection handler
 */
export function initializeSelectionHandler(): void {
  setupSelectionHandler();
  console.log('Selection handler initialized');
}

// Auto-initialize when this module is loaded
initializeSelectionHandler();
