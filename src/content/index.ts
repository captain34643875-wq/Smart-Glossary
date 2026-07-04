import { initializeSelectionHandler } from './selection-handler';
import { initializeModal } from '../ui/explanation-modal';

function initializeContentScript(): void {
  initializeModal();
  initializeSelectionHandler();
}

initializeContentScript();
