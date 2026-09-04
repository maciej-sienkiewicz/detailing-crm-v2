import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register the application Service Worker: car-logo CacheFirst cache + Web Push
// Click-to-Call (push / notificationclick handlers live in service-worker.js).
//
// A scope holds exactly one registration, so registering this script replaces
// whatever was registered before - first /logo-sw.js, then /sw.js.
//
// The filename is deliberately NOT sw.js any more. That name was once served
// under nginx's "expires 1y, immutable" rule for *.js (written for bundles with
// a content hash), and a browser checking for worker updates reuses its cached
// copy while it is under 24h old. Phones were therefore pinned to a worker with
// a broken notificationclick handler, with no way to update short of clearing
// site data by hand. A never-before-fetched URL sidesteps that cache entirely,
// and the nginx rule now keeps this file out of it for good.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .catch(() => {/* SW is an enhancement, silently ignore failures */});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);