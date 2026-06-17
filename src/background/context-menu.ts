/**
 * Context Menu Setup
 * 
 * Registers the "Explain with Smart Glossary" context menu item
 * and handles menu clicks to trigger explanation requests.
 */

console.log("BACKGROUND LOADED");

import { ExplainSelectionMessage, SelectionInfo, ExplanationResultMessage } from '../shared/types';
import { createAIProvider, AIProviderConfig } from '../services/ai-provider';

/**
 * Context menu ID
 */
const CONTEXT_MENU_ID = 'smart-glossary-explain';

/**
 * AI provider configuration (should be loaded from extension settings)
 * For MVP, using a placeholder - in production, load from chrome.storage
 */
const getAIProviderConfig = (): AIProviderConfig => {
  // In production, load from chrome.storage.local
  return {
    type: 'openai', // or 'gemini'
    apiKey: '', // Should be set by user in extension settings
    model: 'gpt-3.5-turbo',
  };
};

/**
 * Initialize context menu
 */
export function initializeContextMenu(): void {
  // Remove existing menu item if it exists
  chrome.contextMenus.remove(CONTEXT_MENU_ID, () => {
    // Ignore error if menu doesn't exist
    if (chrome.runtime.lastError) {
      // Menu didn't exist, which is fine
    }
    
    // Create new menu item
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Explain with Smart Glossary',
      contexts: ['selection'],
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to create context menu:', chrome.runtime.lastError);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
}

/**
 * Handle context menu click
 */
export function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): void {
  console.log("handleContextMenuClick start");

  if (info.menuItemId !== CONTEXT_MENU_ID) {
    console.log("wrong menu id", info.menuItemId);
    return;
  }

  console.log("correct menu id");

  if (!tab || !tab.id) {
    console.error('No tab information available');
    return;
  }

  // Get selected text from content script
  console.log("sending GET_SELECTION");
  chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, (response) => {
  console.log("response received", response);

  if (chrome.runtime.lastError) {
    console.error('Failed to get selection:', chrome.runtime.lastError);
    return;
  }

  const selection = response as SelectionInfo;

  if (!selection || !selection.text) {
    console.error('No selection text received');
    return;
  }

  if (tab.id) {
    requestExplanation(selection, tab.id);
  }
});
}

/**
 * Request explanation from AI provider
 */
async function requestExplanation(selection: SelectionInfo, tabId: number): Promise<void> {
  try {
    const config = getAIProviderConfig();
    
    // Check if API key is configured
    if (!config.apiKey) {
      // Send error message to content script
      const errorMessage: ExplanationResultMessage = {
        type: 'EXPLANATION_RESULT',
        result: {
          explanation: '',
          provider: config.type,
          timestamp: Date.now(),
          success: false,
          error: 'API key not configured. Please set your API key in extension settings.',
        },
      };
      
      chrome.tabs.sendMessage(tabId, errorMessage);
      return;
    }

    // Create AI provider
    const provider = createAIProvider(config);
    
    // Request explanation (only sends selected text, not entire page)
    const result = await provider.explain(selection.text);
    
    // Send result back to content script
    const message: ExplanationResultMessage = {
      type: 'EXPLANATION_RESULT',
      result,
    };
    
    chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error('Error requesting explanation:', error);
    
    // Send error message to content script
    const errorMessage: ExplanationResultMessage = {
      type: 'EXPLANATION_RESULT',
      result: {
        explanation: '',
        provider: 'unknown',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
    
    chrome.tabs.sendMessage(tabId, errorMessage);
  }
}

/**
 * Set up context menu and event listeners
 */
export function setupContextMenu(): void {
  console.log("INIT");

  initializeContextMenu();

  chrome.runtime.onInstalled.addListener(() => {
    console.log("INSTALLED");
    initializeContextMenu();
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("MENU CLICKED", info, tab);
    handleContextMenuClick(info, tab);
  });
}

// Auto-initialize when this module is loaded
setupContextMenu();
