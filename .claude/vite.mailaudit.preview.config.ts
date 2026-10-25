// Build produkcyjny do audytu Poczty i Zapytań: bez HMR, proxy na odizolowany backend :8290
// (baza mail_audit, SMS wyłączone). Osobna nazwa hosta (mailaudit.localhost) = osobne
// ciasteczko sesji niż inne lokalne fronty; backend przyjmuje tylko Origin localhost:*.
import { mergeConfig } from 'vite';
import path from 'path';
import base from '../vite.config';

const target = 'http://localhost:8290';

export default (env: { mode: string; command: string }) => mergeConfig(
    typeof base === 'function' ? base(env as never) : base,
    {
        root: path.resolve(__dirname, '..'),
        build: {
            outDir: '/private/tmp/claude-501/-Users-maciej-Documents-repozytoria-detailing-crm-v2/99d7e0b7-a386-494e-b11b-37bc104f7c6d/scratchpad/dist-mailaudit',
            emptyOutDir: true,
        },
        preview: {
            port: 5192,
            allowedHosts: ['mailaudit.localhost'],
            proxy: {
                '/api': {
                    target,
                    changeOrigin: true,
                    configure: (proxy: { on: (e: string, cb: (req: { setHeader: (k: string, v: string) => void }) => void) => void }) => {
                        proxy.on('proxyReq', req => req.setHeader('origin', 'http://localhost:5192'));
                    },
                },
                '/ws-registry': {
                    target,
                    changeOrigin: true,
                    ws: true,
                    configure: (proxy: { on: (e: string, cb: (req: { setHeader: (k: string, v: string) => void }) => void) => void }) => {
                        proxy.on('proxyReqWs', req => req.setHeader('origin', 'http://localhost:5192'));
                    },
                },
            },
        },
    },
);
