import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

const telegram = window.Telegram?.WebApp;
if (telegram?.initData.trim()) {
  telegram.setHeaderColor?.('#0b1020');
  telegram.setBackgroundColor?.('#0b1020');
  telegram.ready();
  telegram.expand();
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
