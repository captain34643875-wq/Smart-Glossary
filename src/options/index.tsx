import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsPage } from './pages/SettingsPage';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<SettingsPage />);
}

