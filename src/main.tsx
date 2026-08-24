import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register the application Service Worker: car-logo CacheFirst cache +
// Web Push Click-to-Call (push / notificationclick handlers live in sw.js).
// A scope holds exactly one registration, so registering /sw.js atomically
// replaces the legacy /logo-sw.js registration in returning browsers.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {/* SW is an enhancement, silently ignore failures */});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);