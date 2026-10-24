// Lokalny front do audytu abonamentów: ten sam config, proxy na odizolowany backend :8190.
import { mergeConfig } from 'vite';
import path from 'path';
import base from '../vite.config';

const target = 'http://localhost:8190';

export default (env: { mode: string; command: string }) => mergeConfig(
    typeof base === 'function' ? base(env as never) : base,
    {
        root: path.resolve(__dirname, '..'),
        server: {
            port: 5190,
            proxy: {
                // Osobna nazwa hosta (subaudit.localhost) = osobne ciasteczko sesji niż inne
                // lokalne fronty na „localhost"; backend przyjmuje tylko Origin localhost:*.
                '/api': {
                    target,
                    changeOrigin: true,
                    configure: (proxy: { on: (e: string, cb: (req: { setHeader: (k: string, v: string) => void }) => void) => void }) => {
                        proxy.on('proxyReq', req => req.setHeader('origin', 'http://localhost:5190'));
                    },
                },
                '/ws-registry': { target, changeOrigin: true, ws: true },
            },
        },
    },
);
