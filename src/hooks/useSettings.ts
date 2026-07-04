import { useCallback, useEffect, useState } from 'react';
import { Settings } from '../types/settings';

const STORAGE_KEY = 'smartGlossarySettings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const stored = result[STORAGE_KEY] as Settings | undefined;

      if (stored && stored.type && stored.apiKey) {
        setSettings(stored);
      } else {
        setSettings({
          type: 'openai',
          apiKey: '',
          model: 'gpt-3.5-turbo',
        });
      }

      setLoading(false);
    });
  }, []);

  const saveSettings = useCallback(async (newSettings: Settings) => {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: newSettings }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        setSettings(newSettings);
        resolve();
      });
    });
  }, []);

  return {
    settings,
    loading,
    saveSettings,
  };
}

