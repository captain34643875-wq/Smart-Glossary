import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ExplanationResult, ModalData } from '../shared/types';

interface ExplanationModalProps {
  data: ModalData;
  onClose: () => void;
}

export function ExplanationModal({ data, onClose }: ExplanationModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const isClosingRef = useRef(false);
  const termLabel = formatTermLabel(data.term);
  const markdownHtml = useMemo(() => renderMarkdown(data.result?.explanation || ''), [data.result]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;
    setIsVisible(false);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleCopy = async () => {
    const textToCopy = data.result?.explanation || data.error || '';
    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyStatus('Copied to clipboard.');
    } catch {
      setCopyStatus('Copy failed. Please try again.');
    }

    window.setTimeout(() => setCopyStatus(''), 2000);
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
        zIndex: 2147483647,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 200ms ease-in-out',
      }}
    >
      <div
        className="smart-glossary-modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '560px',
          width: '92%',
          maxHeight: '84vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 200ms ease-in-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827' }}>
              Smart Glossary
            </h2>
            {termLabel && (
              <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px', wordBreak: 'break-word' }}>
                {termLabel}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                backgroundColor: '#e5e7eb',
                color: '#111827',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Copy
            </button>
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
        </div>

        {data.state === 'loading' && <LoadingState />}
        {data.state === 'error' && <ErrorState error={data.error} />}
        {data.state === 'success' && data.result && (
          <SuccessState result={data.result} markdownHtml={markdownHtml} copyStatus={copyStatus} />
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ color: '#111827', fontSize: '16px', lineHeight: 1.75 }}>
      <div style={{ marginBottom: '12px', fontWeight: 600 }}>설명 생성 중...</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '18px', height: '18px', border: '3px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span>잠시 기다려 주세요.</span>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SuccessState({ result, markdownHtml, copyStatus }: { result: ExplanationResult; markdownHtml: string; copyStatus: string }) {
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '6px 10px',
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {result.provider}
        </span>
      </div>
      <div
        style={{
          color: '#374151',
          fontSize: '15px',
          lineHeight: '1.8',
          wordBreak: 'break-word',
        }}
        dangerouslySetInnerHTML={{ __html: markdownHtml }}
      />
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Generated at {new Date(result.timestamp).toLocaleTimeString()}</span>
        {copyStatus && <span style={{ color: '#2563eb' }}>{copyStatus}</span>}
      </div>
    </div>
  );
}

function ErrorState({ error }: { error?: string }) {
  return (
    <div>
      <div
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '16px',
        }}
      >
        <p style={{ margin: 0, color: '#991b1b', fontSize: '14px', lineHeight: '1.6' }}>
          {error || 'Failed to get explanation. Please try again.'}
        </p>
      </div>
    </div>
  );
}

function formatTermLabel(term?: string): string {
  if (!term) {
    return '';
  }

  return term.length > 160 ? `${term.slice(0, 160)}...` : term;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(markdown: string): string {
  if (!markdown) {
    return '<div style="color: #6b7280;">No explanation available.</div>';
  }

  let content = escapeHtml(markdown);

  content = content.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre style="background:#f3f4f6;border-radius:8px;padding:12px;overflow-x:auto;"><code>${escapeHtml(code)}</code></pre>`;
  });

  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
  content = content.replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:2px 4px;border-radius:4px;">$1</code>');
  content = content.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">$1</a>');

  const lines = content.split('\n');
  const blocks: string[] = [];
  let inList = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ')) {
      if (!inList) {
        inList = true;
        blocks.push('<ul style="padding-left: 20px; margin: 0 0 12px;">');
      }
      blocks.push(`<li style="margin-bottom: 8px;">${trimmed.slice(2)}</li>`);
      return;
    }

    if (inList) {
      inList = false;
      blocks.push('</ul>');
    }

    if (trimmed === '') {
      blocks.push('<p style="margin: 0 0 12px;"></p>');
      return;
    }

    blocks.push(`<p style="margin: 0 0 12px;">${trimmed}</p>`);
  });

  if (inList) {
    blocks.push('</ul>');
  }

  return blocks.join('');
}

class ModalManager {
  private root: Root | null = null;
  private container: HTMLElement | null = null;
  private isListenerRegistered = false;
  private activeModalId = 0;

  initialize(): void {
    if (this.container) {
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'smart-glossary-modal-container';
    document.body.appendChild(this.container);
    this.root = createRoot(this.container);
  }

  show(data: ModalData): void {
    this.initialize();

    if (!this.root) {
      return;
    }

    const modalId = ++this.activeModalId;
    const handleClose = () => this.hide(modalId);

    this.root.render(<ExplanationModal key={modalId} data={data} onClose={handleClose} />);
  }

  hide(modalId?: number): void {
    if (modalId && modalId !== this.activeModalId) {
      return;
    }

    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }

    this.activeModalId++;
  }

  registerListener(): void {
    if (this.isListenerRegistered) {
      return;
    }

    window.addEventListener('smart-glossary:open-modal', (event: Event) => {
      const customEvent = event as CustomEvent<ModalData>;
      modalManager.show(customEvent.detail);
    });

    this.isListenerRegistered = true;
  }
}

const modalManager = new ModalManager();

export function setupModalListener(): void {
  modalManager.registerListener();
}

export function initializeModal(): void {
  setupModalListener();
}
