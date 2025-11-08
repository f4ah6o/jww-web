/**
 * Application Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register PWA Service Worker
import { registerSW } from 'virtual:pwa-register';

// Register service worker with auto-update
registerSW({
  onNeedRefresh() {
    if (confirm('新しいバージョンが利用可能です。更新しますか?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('アプリがオフラインで利用可能です');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
