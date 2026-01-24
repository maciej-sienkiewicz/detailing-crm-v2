import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';

export default defineConfig({
    plugins: [react()],
    define: {
        // sockjs-client references Node.js `global` — shim it for the browser
        global: 'globalThis',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path,
            },
            '/ws-registry': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    preview: {
        port: 4173,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path,
            },
        },
    },
    build: {
        rollupOptions: {
            output: {
                // Force content-based hash for CSS files
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) {
                        // Generate content hash from CSS content
                        const content = assetInfo.source;
                        const hash = crypto.createHash('sha256')
                            .update(content as string)
                            .digest('hex')
                            .slice(0, 8);
                        return `assets/[name]-${hash}[extname]`;
                    }
                    return 'assets/[name]-[hash][extname]';
                }
            }
        }
    }
});