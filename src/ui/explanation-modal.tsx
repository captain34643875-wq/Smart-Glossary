/**
 * Explanation Modal Component
 * 
 * React component for displaying AI explanations in an overlay modal.
 * Supports loading, success, and error states.
 * 
 * Features:
 * - ESC key to close
 * - Click outside to close
 * - Loading state
 * - Error state
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ModalData, OpenModalMessage } from '../shared/types';

/**
 * Modal component props
 */
interface ExplanationModalProps {
  /** Modal data */
  data: ModalData;
  /** Close callback */
  onClose: () => void;
}

/**
 * Explanation Modal Component
 */
export function ExplanationModal({ data, onClose }: ExplanationModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Handle click outside
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div
      className={`smart-glossary-modal-backdrop ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483647, // Maximum z-index
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 200ms ease-in-out',
      }}
    >
      <div
        className="smart-glossary-modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 200ms ease-in-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
            Smart Glossary
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px 8px',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content based on state */}
        {data.state === 'loading' && <LoadingState />}
        {data.state === 'success' && data.result && <SuccessState result={data.result} />}
        {data.state === 'error' && <ErrorState error={data.error} />}
      </div>
    </div>
  );
}

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div
        style={{
          border: '3px solid #f3f4f6',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }}
      />
      <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
        Getting explanation...
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Success state component
 */
function SuccessState({ result }: { result: any }) {
  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
          }}
        >
          {result.provider}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.6',
        }}
      >
        {result.explanation}
      </p>
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af' }}>
        Generated at {new Date(result.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error }: { error?: string }) {
  return (
    <div>
      <div
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        }}
      >
        <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
          {error || 'Failed to get explanation. Please try again.'}
        </p>
      </div>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>
        Make sure your API key is configured in extension settings.
      </p>
    </div>
  );
}

/**
 * Modal manager class
 * Handles mounting and unmounting the modal
 */
class ModalManager {
  private root: any = null;
  private container: HTMLElement | null = null;

  /**
   * Initialize modal container
   */
  initialize(): void {
    if (this.container) {
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'smart-glossary-modal-container';
    document.body.appendChild(this.container);
    this.root = createRoot(this.container);
  }

  /**
   * Show modal with data
   */
  show(data: ModalData): void {
    this.initialize();

    const handleClose = () => {
      this.hide();
    };

    this.root.render(
      <ExplanationModal data={data} onClose={handleClose} />
    );
  }

  /**
   * Hide modal
   */
  hide(): void {
    if (this.root) {
      this.root.unmount();
    }
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }
  }
}

// Singleton instance
const modalManager = new ModalManager();

/**
 * Set up event listener for opening modal
 */
export function setupModalListener(): void {
  window.addEventListener('smart-glossary:open-modal', (event: any) => {
    const message = event.detail as OpenModalMessage;
    modalManager.show(message.data);
  });

  console.log('Modal listener initialized');
}

/**
 * Initialize modal system
 */
export function initializeModal(): void {
  setupModalListener();
}

// Auto-initialize when this module is loaded
if (typeof window !== 'undefined') {
  initializeModal();
}
