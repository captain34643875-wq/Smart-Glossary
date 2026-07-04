import { ExplanationLoadingMessage, ExplanationResultMessage, ModalData, SelectionInfo } from '../shared/types';

let isSelectionHandlerInitialized = false;
const CONTEXT_RADIUS = 200;

function getCurrentSelection(): SelectionInfo | null {
  const selection = window.getSelection();
  
  if (!selection || selection.isCollapsed) {
    return null;
  }
  
  const text = selection.toString().trim();
  
  if (!text) {
    return null;
  }
  
  const context = getSelectionContext(selection, text);

  return {
    text,
    tabId: 0,
    frameId: 0,
    url: window.location.href,
    contextBefore: context.before,
    contextAfter: context.after,
    timestamp: Date.now(),
  };
}

function getSelectionContext(selection: Selection, selectedText: string): { before: string; after: string } {
  if (selection.rangeCount === 0) {
    return { before: '', after: '' };
  }

  const range = selection.getRangeAt(0);
  const container = findContextElement(range.commonAncestorContainer);
  const fullText = normalizeWhitespace(container.textContent || document.body.innerText || '');
  const normalizedSelection = normalizeWhitespace(selectedText);
  const selectionIndex = fullText.indexOf(normalizedSelection);

  if (selectionIndex === -1) {
    return { before: '', after: '' };
  }

  const beforeStart = Math.max(0, selectionIndex - CONTEXT_RADIUS);
  const afterStart = selectionIndex + normalizedSelection.length;

  return {
    before: fullText.slice(beforeStart, selectionIndex),
    after: fullText.slice(afterStart, afterStart + CONTEXT_RADIUS),
  };
}

function findContextElement(node: Node): Element {
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  return element?.closest('p, li, article, section, main, div') || document.body;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function handleGetSelection(sendResponse: (response: SelectionInfo | null) => void): void {
  const selection = getCurrentSelection();
  sendResponse(selection);
}

function handleExplanationLoading(
  message: ExplanationLoadingMessage,
  sendResponse: () => void
): void {
  const modalData: ModalData = {
    state: 'loading',
    term: message.term,
  };

  window.dispatchEvent(new CustomEvent('smart-glossary:open-modal', {
    detail: modalData,
  }));

  sendResponse();
}

function handleExplanationResult(
  message: ExplanationResultMessage,
  sendResponse: () => void
): void {
  const modalData: ModalData = {
    state: message.result.success ? 'success' : 'error',
    term: message.result.term,
    result: message.result,
    error: message.result.error,
  };
  
  window.dispatchEvent(new CustomEvent('smart-glossary:open-modal', {
    detail: modalData,
  }));
  
  sendResponse();
}

export function setupSelectionHandler(): void {
  if (isSelectionHandlerInitialized) {
    return;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'GET_SELECTION':
        handleGetSelection(sendResponse);
        return false;

      case 'EXPLANATION_LOADING':
        handleExplanationLoading(message, sendResponse);
        return false;
      
      case 'EXPLANATION_RESULT':
        handleExplanationResult(message, sendResponse);
        return false;
      
      default:
        return false;
    }
  });

  isSelectionHandlerInitialized = true;
}

export function initializeSelectionHandler(): void {
  setupSelectionHandler();
}
