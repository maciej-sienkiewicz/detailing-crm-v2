import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register the car-logo Service Worker for CacheFirst logo caching.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/logo-sw.js', { scope: '/' })
        .catch(() => {/* SW is an enhancement – silently ignore failures */});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);