// Build produkcyjny do audytu abonamentów: bez HMR (inne sesje edytują repo i przeładowanie
// modułów w trybie dev wywracało stan), proxy na odizolowany backend :8190.
import { mergeConfig } from 'vite';
import path from 'path';
import base from '../vite.config';

const target = 'http://localhost:8190';

export default (env: { mode: string; command: string }) => mergeConfig(
    typeof base === 'function' ? base(env as never) : base,
    {
        root: path.resolve(__dirname, '..'),
        build: {
            outDir: '/private/tmp/claude-501/-Users-maciej--claude-spares-spare-S46owe/9278aa08-c4c2-4315-aba3-4015a0de2949/scratchpad/dist-subaudit',
            emptyOutDir: true,
        },
        preview: {
            port: 5191,
            proxy: {
                '/api': {
                    target,
                    changeOrigin: true,
                    configure: (proxy: { on: (e: string, cb: (req: { setHeader: (k: string, v: string) => void }) => void) => void }) => {
                        proxy.on('proxyReq', req => req.setHeader('origin', 'http://localhost:5191'));
                    },
                },
                '/ws-registry': { target, changeOrigin: true, ws: true },
            },
        },
    },
);
