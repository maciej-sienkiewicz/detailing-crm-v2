import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installChunkErrorHandler } from './core/errors';
import { isRolePreviewShellPath } from './modules/role-preview/entryCode';
import {
    isServiceWorkerAllowedHere, keepServiceWorkerFresh, registerAppServiceWorker,
} from './modules/push/utils/serviceWorkerRegistration';
import './index.css';

// Musi stać PRZED renderem: łapie nieudane pobrania chunków, które nigdy nie
// docierają do żadnego ErrorBoundary (modulepreload Vite, `import()` poza
// renderem). Bez tego taki błąd kończył się wpisem w konsoli i martwą zakładką.
installChunkErrorHandler();

// Register the application Service Worker: car-logo CacheFirst cache + Web Push
// (push / notificationclick handlers live in public/service-worker.js).
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
//
// keepServiceWorkerFresh: the browser checks for a new worker only on navigation,
// and an installed PWA resumed from the background never navigates - see
// serviceWorkerRegistration.ts. Not in the role preview (isServiceWorkerAllowedHere).
if (isServiceWorkerAllowedHere()) {
    registerAppServiceWorker()
        .then(registration => { keepServiceWorkerFresh(registration); })
        .catch(() => {/* SW is an enhancement, silently ignore failures */});
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (isRolePreviewShellPath(window.location.pathname)) {
    // The role preview window: its own small app around the real one in a frame.
    void import('./modules/role-preview/shell/mountRolePreviewShell')
        .then(({ mountRolePreviewShell }) => mountRolePreviewShell(root));
} else {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}