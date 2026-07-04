import React, { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Settings } from '../../types/settings';

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
] as const;

const DEFAULT_MODELS: Record<Settings['type'], string> = {
  openai: 'gpt-3.5-turbo',
  gemini: 'gemini-pro',
};

export function SettingsPage() {
  const { settings, loading, saveSettings } = useSettings();
  const [provider, setProvider] = useState<Settings['type']>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!settings) {
      return;
    }

    setProvider(settings.type);
    setApiKey(settings.apiKey || '');
    setModel(settings.model || DEFAULT_MODELS[settings.type]);
    setStatusMessage('');
    setErrorMessage('');
  }, [settings]);

  const canSave = useMemo(() => apiKey.trim().length > 0 && model.trim().length > 0, [apiKey, model]);

  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProvider = event.target.value as Settings['type'];
    setProvider(nextProvider);
    setModel(DEFAULT_MODELS[nextProvider]);
  };

  const handleSave = async () => {
    if (!canSave) {
      setErrorMessage('Please enter both API key and model name.');
      setStatusMessage('');
      return;
    }

    try {
      await saveSettings({
        type: provider,
        apiKey: apiKey.trim(),
        model: model.trim(),
      });
      setStatusMessage('Settings saved successfully.');
      setErrorMessage('');
    } catch (error) {
      setStatusMessage('');
      setErrorMessage('Failed to save settings. Please try again.');
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px', fontSize: '1.75rem' }}>Smart Glossary Settings</h1>
      <p style={{ marginTop: 0, marginBottom: '24px', color: '#4b5563' }}>
        Choose your AI provider, enter an API key, and select a model.
      </p>

      <div style={{ display: 'grid', gap: '16px' }}>
        <label style={{ display: 'grid', gap: '8px' }}>
          <span style={{ fontWeight: 600 }}>Provider</span>
          <select value={provider} onChange={handleProviderChange} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }}>
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '8px' }}>
          <span style={{ fontWeight: 600 }}>API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Enter your API key"
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '8px' }}>
          <span style={{ fontWeight: 600 }}>Model</span>
          <input
            type="text"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={DEFAULT_MODELS[provider]}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }}
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '12px 16px',
            backgroundColor: canSave ? '#2563eb' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          Save Settings
        </button>

        {statusMessage && (
          <div style={{ color: '#166534', backgroundColor: '#dcfce7', borderRadius: '8px', padding: '12px' }}>{statusMessage}</div>
        )}
        {errorMessage && (
          <div style={{ color: '#b91c1c', backgroundColor: '#fecaca', borderRadius: '8px', padding: '12px' }}>{errorMessage}</div>
        )}

        <div style={{ color: '#374151', fontSize: '0.95rem', lineHeight: 1.6 }}>
          <p><strong>Tip:</strong> If your provider requires a different model name, enter it here. The saved settings are loaded automatically when you open the extension.</p>
        </div>
      </div>
    </div>
  );
}

