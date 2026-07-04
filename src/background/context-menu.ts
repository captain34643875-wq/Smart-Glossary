/**
 * Context Menu Setup
 *
 * Registers the "Explain with Smart Glossary" context menu item
 * and handles menu clicks to trigger explanation requests.
 */

import { ExplanationLoadingMessage, ExplanationResultMessage, SelectionInfo } from '../shared/types';
import { createAIProvider, AIProviderConfig } from '../services/ai-provider';

const CONTEXT_MENU_ID = 'smart-glossary-explain';
const MAX_SELECTION_LENGTH = 4000;

type StoredAISettings = Partial<AIProviderConfig> & {
  provider?: AIProviderConfig['type'];
  openaiApiKey?: string;
  geminiApiKey?: string;
  openaiModel?: string;
  geminiModel?: string;
};

function isProviderType(value: unknown): value is AIProviderConfig['type'] {
  return value === 'openai' || value === 'gemini';
}

function getProviderApiKey(
  provider: AIProviderConfig['type'],
  settings: StoredAISettings,
  storage: StoredAISettings
): string {
  if (settings.apiKey || storage.apiKey) {
    return settings.apiKey || storage.apiKey || '';
  }

  return provider === 'openai'
    ? settings.openaiApiKey || storage.openaiApiKey || ''
    : settings.geminiApiKey || storage.geminiApiKey || '';
}

async function getAIProviderConfig(): Promise<AIProviderConfig> {
  const storage = await chrome.storage.local.get([
    'smartGlossarySettings',
    'provider',
    'type',
    'apiKey',
    'openaiApiKey',
    'geminiApiKey',
    'model',
    'openaiModel',
    'geminiModel',
  ]) as StoredAISettings & { smartGlossarySettings?: StoredAISettings };

  const settings = storage.smartGlossarySettings || {};
  const providerCandidate = settings.provider || settings.type || storage.provider || storage.type;
  const provider = isProviderType(providerCandidate) ? providerCandidate : 'openai';
  const apiKey = getProviderApiKey(provider, settings, storage);
  const providerModel = provider === 'openai'
    ? settings.openaiModel || storage.openaiModel
    : settings.geminiModel || storage.geminiModel;

  return {
    type: provider,
    apiKey,
    model: settings.model || storage.model || providerModel,
  };
}

export function initializeContextMenu(): void {
  chrome.contextMenus.remove(CONTEXT_MENU_ID, () => {
    if (chrome.runtime.lastError) {
      void chrome.runtime.lastError;
    }

    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Explain with Smart Glossary',
      contexts: ['selection'],
    }, () => {
      if (chrome.runtime.lastError) {
        void chrome.runtime.lastError;
      }
    });
  });
}

export function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): void {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) {
    return;
  }

  const tabId = tab.id;
  const frameId = typeof info.frameId === 'number' ? info.frameId : undefined;

  sendMessageToTab(tabId, { type: 'GET_SELECTION' }, frameId, (response) => {
    const selection = buildSelection(response as SelectionInfo | null, info, tab, frameId);

    if (!selection) {
      sendExplanationToTab(
        tabId,
        createErrorMessage('', 'No selected text was found. Select a word or phrase and try again.'),
        frameId
      );
      return;
    }

    sendLoadingToTab(tabId, selection.text, frameId);
    requestExplanation(selection, tabId, frameId);
  });
}

async function requestExplanation(selection: SelectionInfo, tabId: number, frameId?: number): Promise<void> {
  try {
    if (selection.text.length > MAX_SELECTION_LENGTH) {
      sendExplanationToTab(
        tabId,
        createErrorMessage(selection.text, 'Selected text is too long. Select a shorter word, phrase, or paragraph and try again.'),
        frameId
      );
      return;
    }

    const config = await getAIProviderConfig();

    if (!config.apiKey) {
      sendExplanationToTab(
        tabId,
        createErrorMessage(selection.text, 'API key is not configured. Add an OpenAI or Gemini API key in the extension settings.'),
        frameId
      );
      return;
    }

    const provider = createAIProvider(config);
    const result = await provider.explain({
      term: selection.text,
      contextBefore: selection.contextBefore,
      contextAfter: selection.contextAfter,
      url: selection.url,
    });
    const message: ExplanationResultMessage = {
      type: 'EXPLANATION_RESULT',
      result: {
        ...result,
        term: selection.text,
      },
    };

    sendExplanationToTab(tabId, normalizeExplanationMessage(message), frameId);
  } catch (error) {
    sendExplanationToTab(tabId, createErrorMessage(selection.text, formatErrorMessage(error)), frameId);
  }
}

function buildSelection(
  response: SelectionInfo | null,
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab,
  frameId?: number
): SelectionInfo | null {
  const text = (response?.text || info.selectionText || '').trim();

  if (!text) {
    return null;
  }

  return {
    text,
    tabId: tab.id || 0,
    frameId: frameId || 0,
    url: response?.url || info.frameUrl || tab.url || '',
    contextBefore: response?.contextBefore || '',
    contextAfter: response?.contextAfter || '',
    timestamp: Date.now(),
  };
}

function createErrorMessage(term: string, error: string): ExplanationResultMessage {
  return {
    type: 'EXPLANATION_RESULT',
    result: {
      term,
      explanation: '',
      provider: 'Smart Glossary',
      timestamp: Date.now(),
      success: false,
      error,
    },
  };
}

function normalizeExplanationMessage(message: ExplanationResultMessage): ExplanationResultMessage {
  if (message.result.success) {
    return message;
  }

  return {
    ...message,
    result: {
      ...message.result,
      error: formatErrorMessage(message.result.error),
    },
  };
}

function formatErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');

  if (!message) {
    return 'Could not get an explanation. Please try again.';
  }

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Network connection failed. Check your internet connection and try again.';
  }

  if (message.includes('401') || message.includes('403')) {
    return 'The API key was rejected. Check your API key in extension settings.';
  }

  if (message.includes('429')) {
    return 'The AI provider is rate limiting requests. Please wait a moment and try again.';
  }

  if (message.includes('No explanation received')) {
    return 'The AI provider did not return an explanation. Try a shorter or clearer selection.';
  }

  if (message.includes('API error')) {
    return 'The AI provider could not process this request. Please try again.';
  }

  return message;
}

function sendExplanationToTab(tabId: number, message: ExplanationResultMessage, frameId?: number): void {
  sendMessageToTab(tabId, message, frameId);
}

function sendLoadingToTab(tabId: number, term: string, frameId?: number): void {
  const message: ExplanationLoadingMessage = {
    type: 'EXPLANATION_LOADING',
    term,
  };

  sendMessageToTab(tabId, message, frameId);
}

function sendMessageToTab(
  tabId: number,
  message: unknown,
  frameId?: number,
  callback?: (response: unknown) => void
): void {
  const handleResponse = (response: unknown) => {
    if (chrome.runtime.lastError) {
      void chrome.runtime.lastError;
    }

    callback?.(response);
  };

  if (typeof frameId === 'number') {
    chrome.tabs.sendMessage(tabId, message, { frameId }, handleResponse);
    return;
  }

  chrome.tabs.sendMessage(tabId, message, handleResponse);
}

export function setupContextMenu(): void {
  initializeContextMenu();

  chrome.runtime.onInstalled.addListener(() => {
    initializeContextMenu();
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    handleContextMenuClick(info, tab);
  });
}

setupContextMenu();
