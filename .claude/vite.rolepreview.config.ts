// Lokalny adres podglądu roli (odpowiednik podglad.detailboost.pl) do audytu podglądu ról:
// osobny host podglad.localhost, żeby ciasteczko piaskownicy nie nadpisało sesji
// administratora z localhost. Proxy dopisuje X-Role-Preview-Host: 1 - tak samo jak
// nginx-proxy-manager na produkcji; bez niego backend odrzuca wejście kodem 421.
import { mergeConfig } from 'vite';
import path from 'path';
import base from '../vite.config';

const target = 'http://localhost:8096';
const port = Number(process.env.ROLE_PREVIEW_AUDIT_PORT ?? 5203);

type ProxyReq = { setHeader: (k: string, v: string) => void };
// WebSocket idzie zdarzeniem proxyReqWs, nie proxyReq - bez tego STOMP dostawał 403.
const previewHeaders = (proxy: { on: (e: string, cb: (req: ProxyReq) => void) => void }) => {
    for (const event of ['proxyReq', 'proxyReqWs']) {
        proxy.on(event, req => {
            req.setHeader('origin', `http://localhost:${port}`);
            req.setHeader('X-Role-Preview-Host', '1');
        });
    }
};

export default (env: { mode: string; command: string }) => mergeConfig(
    typeof base === 'function' ? base(env as never) : base,
    {
        root: path.resolve(__dirname, '..'),
        server: {
            port,
            strictPort: true,
            host: '127.0.0.1',
            allowedHosts: ['podglad.localhost'],
            proxy: {
                '/api': { target, changeOrigin: true, configure: previewHeaders },
                '/ws-registry': { target, changeOrigin: true, ws: true, configure: previewHeaders },
            },
        },
    },
);
