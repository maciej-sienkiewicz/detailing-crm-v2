// Lokalny front do testu zmiany kwoty dokumentu z wizyty: proxy na odizolowany backend :8090
// (baza amount_edit_audit, SMS wyłączone).
import { mergeConfig } from 'vite';
import path from 'path';
import base from '../vite.config';

const target = 'http://localhost:8090';

export default (env: { mode: string; command: string }) => mergeConfig(
    typeof base === 'function' ? base(env as never) : base,
    {
        root: path.resolve(__dirname, '..'),
        server: {
            port: 5195,
            strictPort: true,
            proxy: {
                '/api': {
                    target,
                    changeOrigin: true,
                    configure: (proxy: { on: (e: string, cb: (req: { setHeader: (k: string, v: string) => void }) => void) => void }) => {
                        proxy.on('proxyReq', req => req.setHeader('origin', 'http://localhost:5195'));
                    },
                },
                '/ws-registry': { target, changeOrigin: true, ws: true },
            },
        },
    },
);
