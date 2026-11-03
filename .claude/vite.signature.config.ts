// Lokalny front do testu stopek e-mail: proxy na odizolowany backend :8095
// (baza sig_audit, SMS wyłączone, poczta do Mailpit).
import { mergeConfig } from 'vite';
import path from 'path';
import base from '../vite.config';

const target = 'http://localhost:8095';

export default (env: { mode: string; command: string }) => mergeConfig(
    typeof base === 'function' ? base(env as never) : base,
    {
        root: path.resolve(__dirname, '..'),
        server: {
            port: 5197,
            strictPort: true,
            proxy: {
                '/api': {
                    target,
                    changeOrigin: true,
                    configure: (proxy: { on: (e: string, cb: (req: { setHeader: (k: string, v: string) => void }) => void) => void }) => {
                        proxy.on('proxyReq', req => req.setHeader('origin', 'http://localhost:5197'));
                    },
                },
                '/ws-registry': { target, changeOrigin: true, ws: true },
            },
        },
    },
);
