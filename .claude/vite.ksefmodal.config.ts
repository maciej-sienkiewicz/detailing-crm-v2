// Lokalny front do audytu okna „Wystaw fakturę (KSeF)”: proxy na odizolowany backend :8096
// (baza ksef_modal_audit, SMS wyłączone, stub KSeF). Port z KSEF_AUDIT_PORT, żeby ta sama
// konfiguracja obsłużyła front „przed” (kopia HEAD) i „po” (drzewo robocze).
import { mergeConfig } from 'vite';
import path from 'path';
import base from '../vite.config';

const target = 'http://localhost:8096';
const port = Number(process.env.KSEF_AUDIT_PORT ?? 5201);

export default (env: { mode: string; command: string }) => mergeConfig(
    typeof base === 'function' ? base(env as never) : base,
    {
        root: path.resolve(__dirname, '..'),
        server: {
            port,
            strictPort: true,
            proxy: {
                '/api': {
                    target,
                    changeOrigin: true,
                    configure: (proxy: { on: (e: string, cb: (req: { setHeader: (k: string, v: string) => void }) => void) => void }) => {
                        proxy.on('proxyReq', req => req.setHeader('origin', `http://localhost:${port}`));
                    },
                },
                '/ws-registry': { target, changeOrigin: true, ws: true },
            },
        },
    },
);
